/**
 * WhatsApp-specific OM replies: deep links, help menu, auth for Filevault API tools.
 */

const crypto = require('crypto');
const { loadWhatsAppStudioState, saveWhatsAppStudioState } = require('./whatsapp-studio-state');
const {
  matchRouteFromText,
  labelForPath,
  buildDeepLink,
  buildHelpMenuText,
  sanitizeNavigatePath,
} = require('./om-route-catalog');

const WA_TEXT_LIMIT = 4000;

function whatsappSessionId(from) {
  const digits = String(from || '').replace(/\D/g, '');
  return digits ? `wa-${digits}` : `wa-${crypto.randomUUID()}`;
}

function normalizeBearer(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  return t.toLowerCase().startsWith('bearer ') ? t : `Bearer ${t}`;
}

function saveBearerForPhone(phoneE164, bearer) {
  const key = String(phoneE164 || '').trim();
  const normalized = normalizeBearer(bearer);
  if (!key || !normalized) return;
  const prev = loadWhatsAppStudioState();
  const map = { ...(prev.filevaultBearerByPhone || {}) };
  map[key] = normalized;
  saveWhatsAppStudioState({ filevaultBearerByPhone: map, filevaultBearer: normalized });
}

function resolveBearerForPhone(phoneE164) {
  const env = normalizeBearer(process.env.OM_WHATSAPP_API_TOKEN || process.env.FILEVAULT_WHATSAPP_BEARER);
  if (env) return env;
  const prev = loadWhatsAppStudioState();
  const key = String(phoneE164 || '').trim();
  if (key && prev.filevaultBearerByPhone?.[key]) return prev.filevaultBearerByPhone[key];
  if (prev.filevaultBearer) return prev.filevaultBearer;
  return null;
}

function buildWhatsAppOmRequest({ from, text, req }) {
  const bearer = resolveBearerForPhone(from);
  const headers = { ...(req?.headers || {}) };
  if (bearer && !headers.authorization && !headers.Authorization) {
    headers.authorization = bearer;
  }
  return {
    headers,
    body: {
      sessionId: whatsappSessionId(from),
      userId: from || 'whatsapp',
      context: {
        channel: 'whatsapp',
        path: '/studio/whatsapp',
        from,
      },
    },
  };
}

const WHATSAPP_OM_SYSTEM_APPEND = `
Channel: WhatsApp (plain text only).

IMPORTANT — uploads are ALREADY wired (do NOT ask the user to build webhooks or bridges):
- When the user sends media (photo, screenshot, video, voice note, document), the server uploads to POST /api/images/upload and replies with file ID.
- Caption "for event Summer Party" or "event #12" auto-links the image to that memories event.
- Tools allowed: upload_image, link_image_to_event, list/create events, albums, contacts, api_post on allowlisted paths.

Capabilities:
- Answer OM / Filevault questions; run TOOL lines when needed.
- Deep links to studio pages when they want a screen in the browser (server adds links — do not use NAVIGATE:).

Rules:
- Keep replies short. No NAVIGATE: or JSON action blocks on WhatsApp.
- Never say "expose an endpoint" or "build a webhook" for WhatsApp upload — it already works.
- Bulk multi-file picks: optional /upload browser link only.
- create event: TOOL:{"id":"create_memories_event","payload":{"name":"..."}}
- 401: ask user to open Studio → WhatsApp while logged in.

Examples: list my events, create event Diwali, send photo, for event Wedding 2026
`;

function stripNavigateAndActions(text) {
  let out = String(text || '');
  out = out.replace(/\nNAVIGATE:\/[^\s]+\s*$/i, '').trim();
  out = out.replace(/\{[\s\S]*?"(?:action|actions)"[\s\S]*?\}/g, '').trim();
  return out;
}

/** Remove raw tool/API/JSON dumps before sending to WhatsApp. */
function sanitizeReplyForWhatsApp(text) {
  let out = String(text || '');
  out = out.replace(/\[OM tool:[\s\S]*?\]/gi, '');
  out = out.replace(/\[Tool results\][\s\S]*/gi, '');
  out = out.replace(/^TOOL:\s*\{[\s\S]*?\}\s*$/gim, '');
  out = out.replace(/\bTool \w+ (?:OK|failed)[^\n]*/gi, '');
  out = out.replace(/\{[\s\S]{60,}?\}/g, (block) => {
    if (/"status"|"data"|"error"|"ok"|"imageId"|"eventId"/i.test(block)) return '';
    return block;
  });
  out = out.replace(/https?:\/\/[^\s]*(?::9090|\/api\/)[^\s]*/gi, '');
  out = out.replace(
    /\b(FILEVAULT_API|OPENAI_API|openai \d{3}|openrouter\.ai|User not found)[^\n]*/gi,
    ''
  );
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/** Turn keyword prefetch lines into short user-facing text (no tool tags). */
function humanizeKeywordContextForWhatsApp(keywordContext) {
  const lines = [];
  const re = /\[OM tool:\s*([^\]]+)\]/gi;
  let m;
  const t = String(keywordContext || '');
  while ((m = re.exec(t))) {
    const inner = m[1].trim();
    if (/failed HTTP/i.test(inner)) {
      lines.push('Could not load that data right now.');
      continue;
    }
    const created = inner.match(/create_memories_event OK — created "([^"]+)"/i);
    if (created) {
      lines.push(`Created event: ${created[1]}`);
      continue;
    }
    const dash = inner.indexOf('—');
    if (dash >= 0) {
      const detail = inner.slice(dash + 1).trim();
      if (detail) lines.push(detail);
    } else if (inner) {
      lines.push(inner.replace(/_/g, ' '));
    }
  }
  return lines.join('\n').trim();
}

function formatReplyForWhatsApp({ reply, matchedRoute, toolAuthFailed }) {
  if (matchedRoute === '__help__') {
    return buildHelpMenuText().slice(0, WA_TEXT_LIMIT);
  }

  let text = sanitizeReplyForWhatsApp(stripNavigateAndActions(reply));
  const route = matchedRoute || null;
  const link = route ? buildDeepLink(route) : null;

  if (link) {
    const label = labelForPath(route);
    text = text
      ? `${text}\n\nOpen ${label} in the app:\n${link}`
      : `Open ${label} in the app:\n${link}`;
  }

  if (toolAuthFailed) {
    text +=
      '\n\n(To list/create data I need your OM login — open the studio in your browser, go to Studio → WhatsApp, and stay logged in.)';
  }

  if (text.length > WA_TEXT_LIMIT) {
    text = `${text.slice(0, WA_TEXT_LIMIT - 20)}…`;
  }
  return text.trim();
}

function parseCreateEventFromText(text) {
  const t = String(text || '').trim();
  const m =
    t.match(/\bcreate\s+(?:an?\s+)?event\s+(?:named|called)?\s+["']?([^"'\n]+?)["']?(?:\s+on\s+|\s+at\s+|$)/i) ||
    t.match(/\bnew\s+event\s+["']?([^"'\n]+?)["']?(?:\s+on\s+|\s+at\s+|$)/i);
  if (!m) return null;
  const name = m[1].trim();
  if (!name || name.length < 2) return null;
  return { name };
}

module.exports = {
  WHATSAPP_OM_SYSTEM_APPEND,
  whatsappSessionId,
  saveBearerForPhone,
  resolveBearerForPhone,
  buildWhatsAppOmRequest,
  formatReplyForWhatsApp,
  sanitizeReplyForWhatsApp,
  humanizeKeywordContextForWhatsApp,
  parseCreateEventFromText,
  buildHelpMenuText,
  sanitizeNavigatePath,
};
