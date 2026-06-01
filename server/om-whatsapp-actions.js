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

Capabilities on WhatsApp (same OM brain as the web app):
- Answer questions about Our Memories / Filevault studio.
- Run server tools via TOOL lines (list/create events, list albums, images, contacts).
- When the user wants a screen in the app, you will be given a deep link — mention it clearly once.

Rules for WhatsApp:
- Keep replies short (under ~12 lines unless listing data).
- Do NOT use NAVIGATE: lines — the server adds app links.
- Do NOT use JSON action blocks — not supported on WhatsApp.
- For uploads: users can send photos directly in this WhatsApp chat; they are saved to their OM library when logged in. You can also share the /upload deep link for bulk picks from the browser.
- For create event: use TOOL:{"id":"create_memories_event","payload":{"name":"...","location":"..."}} when details are clear.
- If API tools fail with 401, ask them to open Studio → WhatsApp in the browser while logged in (links your account).

Helpful phrases users may say: list events, create event, my albums, phone book, upload, memories dashboard, invitations, family tree, settings.
`;

function stripNavigateAndActions(text) {
  let out = String(text || '');
  out = out.replace(/\nNAVIGATE:\/[^\s]+\s*$/i, '').trim();
  out = out.replace(/\{[\s\S]*?"(?:action|actions)"[\s\S]*?\}/g, '').trim();
  return out;
}

function formatReplyForWhatsApp({ reply, matchedRoute, toolAuthFailed }) {
  if (matchedRoute === '__help__') {
    return buildHelpMenuText().slice(0, WA_TEXT_LIMIT);
  }

  let text = stripNavigateAndActions(reply);
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
  parseCreateEventFromText,
  buildHelpMenuText,
  sanitizeNavigatePath,
};
