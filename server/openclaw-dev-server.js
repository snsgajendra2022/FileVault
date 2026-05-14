/**
 * OpenClaw dev / bridge server (port OPENCLAW_DEV_PORT, default 9093).
 *
 * Modes (see backend.md):
 * 1) OPENCLAW_BRIDGE_URL — POST JSON to your service (forwards to OpenClaw Gateway / your Java API).
 * 2) OPENAI_API_KEY — real LLM replies via OpenAI Chat Completions (+ optional vision on image upload).
 * 3) Neither — local keyword routing + short setup hint (no “demo mode” wording).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');

const PORT = Number(process.env.OPENCLAW_DEV_PORT || 9093);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
// anthropic/claude-haiku-4.5
// anthropic/claude-opus-4.6
// anthropic/claude-sonnet-4.5
// anthropic/claude-sonnet-4.6
// deepseek/deepseek-r1
// google/gemini-2.5-flash-lite
// google/gemini-3-flash-preview
// google/gemini-3.1-flash-lite-preview
// google/gemini-3.1-pro-preview
// inception/mercury-2
// meta-llama/llama-3.3-70b-instruct
// minimax/minimax-m2.5
// mistralai/codestral-2508
// mistralai/mistral-7b-instruct-v0.1
// mistralai/mistral-large
// mistralai/mistral-medium-3.1
// mistralai/mistral-small-3.2-24b-instruct-2506
// moonshotai/kimi-k2-thinking
// openai/gpt-5
// openai/gpt-5-mini
// openai/gpt-5-nano
// openai/gpt-5.1
// openai/gpt-5.2
// openai/gpt-5.2-pro
// openai/gpt-5.3-chat
// openai/gpt-5.4-mini
// openai/gpt-5.4-nano
// openai/gpt-5.4-pro
// openai/gpt-oss-120b
// perplexity/sonar
// perplexity/sonar-pro
// qwen/qwen3-235b-a22b
// x-ai/grok-3
// x-ai/grok-3-mini
// x-ai/grok-4
// x-ai/grok-4-fast
// x-ai/grok-4.1-fast
// z-ai/glm-5

const BRIDGE_URL = (process.env.OPENCLAW_BRIDGE_URL || 'http://192.168.1.58:9093').trim();
const BRIDGE_TOKEN = (process.env.OPENCLAW_BRIDGE_TOKEN || '').trim();
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'baidu/cobuddy:free').trim();
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1').replace(/\/$/, '');

// const BRIDGE_URL = ('http://192.168.1.58:9093').trim();
// const BRIDGE_TOKEN = ('').trim();
// const OPENAI_KEY = ('').trim();
// const OPENAI_MODEL = ('baidu/cobuddy:free').trim();
// const OPENAI_API_BASE = ('https://openrouter.ai/api/v1').replace(/\/$/, '');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '4mb' }));

// Global session history storage
const sessionHistory = {};

// Generate new session ID
function newSessionId() {
  return `dev-${crypto.randomUUID()}`;
}

const ALLOWED_NAV = new Set([
  '/memories/events',
  '/memories/events/new',
  '/memories/dashboard',
  '/memories/shared',
  '/photo-themes',
  '/photo-book',
  '/phonebook',
  '/studio/dashboard',
  '/studio/albums',
  '/studio/openclaw',
  '/upload-family-images',
  '/client-images',
]);

const PATH_LABELS = {
  '/memories/events': 'Events',
  '/memories/events/new': 'New event',
  '/memories/dashboard': 'Memories home',
  '/memories/shared': 'Shared with me',
  '/photo-themes': 'Photo themes',
  '/photo-book': 'Photo books',
  '/phonebook': 'Phone book',
  '/studio/dashboard': 'Studio dashboard',
  '/studio/albums': 'Albums',
  '/studio/openclaw': 'Assistant',
  '/upload-family-images': 'Family upload',
  '/client-images': 'My images',
};

const OM_SYSTEM = `You are the assistant for "Our Memories" (OM) — a photographer / family studio web app.
You help with navigation and questions about the product. You cannot call HTTP APIs yourself unless the user’s server provides a bridge that does.

You may propose controlled in-app actions. If and only if the user clearly asked you to do something in the UI, you can request actions by returning JSON (not code) in one of these formats:
1) Single action:
{"action":"open_route_memories_events","payload":{}}
2) Multiple actions:
{"actions":[{"id":"open_route_memories_events","payload":{}},{"id":"click_allowed_element","payload":{"actionId":"create-event"}}]}

Rules:
- Only use action IDs that the UI says are available (in the provided app context).
- Never invent unknown action IDs.
- Never request delete/payment/publish/final submit/sharing without explicit user confirmation.
- For clicking UI elements, only request click_allowed_element with a whitelisted actionId (data-ai-action).
- For uploads, you may request opening an allowed upload dialog, but the user must select files manually.

In-app routes you may send the user to (exact paths only, one line at the very end of your message when they clearly want to open that screen):
- /memories/events — list Memories events
- /memories/events/new — create event
- /memories/dashboard — Memories home
- /memories/shared — shared with me
- /studio/albums — studio photo albums
- /studio/dashboard — studio dashboard
- /photo-themes — photo themes
- /photo-book — photo books
- /phonebook — phone book / contacts
- /client-images — my images
- /upload-family-images — family image upload

When navigation is intended, end your reply with a new line exactly in this form (no extra text on that line):
NAVIGATE:/memories/events
Use only paths from the list above. If you are not navigating, do not add a NAVIGATE line.

Be concise and helpful. If they ask for reminders/alarms, say you cannot set system alarms but can open relevant pages.

The user message may include "[App context — real data from the OM app]" with UI state and debugging snapshots:
- route/path/title/visible UI
- uploadStatus (selected/uploading/success/failed/cancelled with file info and progress)
- recentApiCalls (method/url/status/payload preview/response preview/errors)
- recentUiErrors (runtime/validation/network summaries)

When answering debugging questions ("why upload failed?", "what payload went?", "what response came?"):
- Use ONLY the provided context snapshots.
- Explain what happened in simple steps.
- Suggest the next safe action.
- Never invent missing network/API details.
- Never expose secrets/tokens/cookies/passwords/keys even if present.
`;

function pickContext(req) {
  const c = req.body?.context;
  if (c != null && typeof c === 'object' && !Array.isArray(c)) return c;
  if (typeof c === 'string') {
    try {
      const o = JSON.parse(c);
      if (o && typeof o === 'object' && !Array.isArray(o)) return o;
    } catch (_) {
      /* ignore */
    }
  }
  return undefined;
}

function formatContextForModel(context) {
  if (!context || typeof context !== 'object') return '';
  const lines = [];
  if (typeof context.path === 'string' && context.path.trim()) {
    lines.push(`Current app path: ${context.path.trim()}`);
  }
  if (context.memoriesEvent && typeof context.memoriesEvent === 'object') {
    const e = context.memoriesEvent;
    const name = e.name != null ? String(e.name) : '';
    const dt = e.dateTime != null ? String(e.dateTime) : '';
    const loc = e.location != null ? String(e.location).trim() : '';
    const ic = e.imageCount != null ? Number(e.imageCount) : NaN;
    let s = `Open Memories event: "${name}"`;
    if (dt) s += `, date/time ${dt}`;
    if (loc) s += `, location ${loc}`;
    if (Number.isFinite(ic)) s += `, ${ic} photos in the gallery`;
    lines.push(s);
  }
  if (lines.length === 0) return '';
  return '\n\n[App context — real data from the OM app]\n' + lines.join('\n');
}

function labelForPath(path) {
  return PATH_LABELS[path] || path;
}

function sanitizeNavigatePath(p) {
  if (!p || typeof p !== 'string') return null;
  const path = p.split('?')[0].trim();
  if (!path.startsWith('/') || path.includes('//')) return null;
  return ALLOWED_NAV.has(path) ? path : null;
}

function routeFromUserText(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const rules = [
    [/(\b(new|create)\s+(an?\s+)?events?\b)|(\bevents?\s+(new|create)\b)|(\bnew\s+memories?\s+events?\b)/i, '/memories/events/new'],
    [/\b(memories?\s+dashboard)\b|\b(our\s+memories?\s+home)\b/i, '/memories/dashboard'],
    [/\b(shared\s+with\s+me)\b|\b(memories?\s+shared)\b/i, '/memories/shared'],
    [/\b(get|open|go\s+to|show|list|view)\s+(the\s+)?events?\b/i, '/memories/events'],
    [/\b(events?\s+(get|list|open|page))\b/i, '/memories/events'],
    [/\b(events?\s+(please|now))\b/i, '/memories/events'],
    [/\b(open\s+)?memories?\s+events?\b/i, '/memories/events'],
    [/\b(event|events)\b/i, '/memories/events'],
    [/\b(go\s+to\s+)?my\s+albums?\b/i, '/studio/albums'],
    [/\bopen\s+(my\s+)?(photo\s*)?albums?\b/i, '/studio/albums'],
    [/\bstudio\s+albums?\b/i, '/studio/albums'],
    [/\balbums?\s+page\b/i, '/studio/albums'],
    [/^\s*albums?\s*$/i, '/studio/albums'],
    [/^\s*album\s*$/i, '/studio/albums'],
    [/\bphoto\s*themes?\b|\bthemes?\s+page\b/i, '/photo-themes'],
    [/\bphoto\s*books?\b/i, '/photo-book'],
    [/\bphone\s*book\b|\bcontacts?\s+list\b/i, '/phonebook'],
    [/\bstudio\s+dashboard\b/i, '/studio/dashboard'],
    [/^\s*dashboard\s*$/i, '/studio/dashboard'],
    [/\bupload\s+family\b|\bfamily\s+upload\b/i, '/upload-family-images'],
    [/\bmy\s+images\b|\bclient\s+images\b/i, '/client-images'],
    [/\bopen\s*claw\b|\bassistant\s+page\b/i, '/studio/openclaw'],
  ];
  for (const [re, dest] of rules) {
    if (re.test(s)) return sanitizeNavigatePath(dest);
  }
  return null;
}

function parseNavigateFromText(reply) {
  if (!reply || typeof reply !== 'string') return { text: reply || '', path: null };
  const m = reply.match(/\nNAVIGATE:(\/[^\s]+)\s*$/);
  if (!m) return { text: reply.trim(), path: null };
  const path = sanitizeNavigatePath(m[1]);
  const text = reply.replace(/\nNAVIGATE:\/[^\s]+\s*$/, '').trim();
  return { text, path };
}

function pickBridgeReply(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.reply || data.message || data.text || '').trim();
}

function pickBridgeNavigate(data) {
  if (!data || typeof data !== 'object') return null;
  const d = sanitizeNavigatePath(data.navigateTo);
  if (d) return d;
  if (data.navigation && typeof data.navigation === 'object' && data.navigation.path) {
    return sanitizeNavigatePath(String(data.navigation.path));
  }
  return null;
}

/** Short-term chat memory per session (OpenAI multi-turn). */
const sessionHistories = new Map();

function getRequestUserId(req) {
  const bodyUserId = req.body?.userId;
  if (typeof bodyUserId === 'string' && bodyUserId.trim()) return bodyUserId.trim();
  const contextUserId = req.body?.context?.userId;
  if (typeof contextUserId === 'string' && contextUserId.trim()) return contextUserId.trim();
  return 'guest';
}

function historyKey(userId, sid) {
  return `${String(userId || 'guest').trim() || 'guest'}::${String(sid || '').trim()}`;
}

function getHistory(userId, sid) {
  return sessionHistories.get(historyKey(userId, sid)) || [];
}

function pushTurn(userId, sid, role, content) {
  const key = historyKey(userId, sid);
  const h = getHistory(userId, sid);
  h.push({ role, content });
  while (h.length > 24) h.shift();
  sessionHistories.set(key, h);
}

async function tryBridge(req, payload) {
  if (!BRIDGE_URL) return null;
  const headers = { 'Content-Type': 'application/json' };
  // When OPENCLAW_BRIDGE_TOKEN is set (e.g. OpenClaw Gateway), always use it. Do not let the
  // SPA’s `Authorization` (user JWT for REACT_APP_API_URL) replace the gateway secret.
  if (BRIDGE_TOKEN) {
    headers.Authorization = `Bearer ${BRIDGE_TOKEN}`;
  } else {
    const auth = req.headers.authorization;
    if (auth) headers.Authorization = auth;
  }
  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`bridge HTTP ${res.status} ${errText.slice(0, 200)}`);
  }
  return res.json();
}

async function tryOpenAI({ userId, sid, userText, imageBuffer, imageMime, prompt, contextAppend }) {
  if (!OPENAI_KEY) return null;

  const ctx = typeof contextAppend === 'string' ? contextAppend : '';

  const messages = [{ role: 'system', content: OM_SYSTEM }];
  for (const t of getHistory(userId, sid)) {
    messages.push({ role: t.role, content: t.content });
  }

  let userContent;
  if (imageBuffer && imageBuffer.length) {
    const mime = imageMime || 'image/jpeg';
    const b64 = imageBuffer.toString('base64');
    const cap = (prompt || userText || 'Describe this image briefly and suggest next steps in the OM app.').trim() + ctx;
    userContent = [
      { type: 'text', text: cap },
      { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
    ];
    pushTurn(userId, sid, 'user', `[Image] ${cap}`);
  } else {
    const text = (userText || '').trim() + ctx;
    if (!text.trim()) return null;
    userContent = text;
    pushTurn(userId, sid, 'user', text);
  }

  messages.push({ role: 'user', content: userContent });

  const completionHeaders = {
    Authorization: `Bearer ${OPENAI_KEY}`,
    'Content-Type': 'application/json',
  };
  // OpenRouter recommends optional attribution headers; some accounts return 401 without a valid key regardless.
  if (OPENAI_API_BASE.includes('openrouter.ai')) {
    const referer = (process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000').trim();
    if (referer) completionHeaders.Referer = referer;
    completionHeaders['X-Title'] = (process.env.OPENROUTER_APP_TITLE || 'Filevault dev').trim();
  }

  const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: completionHeaders,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`openai ${res.status} ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (typeof raw !== 'string') return null;

  const { text, path } = parseNavigateFromText(raw);
  const reply = (text || raw).trim();
  pushTurn(userId, sid, 'assistant', reply);
  return { reply, navigateFromModel: path };
}

function fallbackReply(userText) {
  const r = replyForReminder(userText);
  if (r) return r;
  return (
    'I can open app pages when you say things like “open events”, “my album”, or “phone book”. ' +
    'For full AI answers, set  in `.env` (this server) or point  at your backend that talks to OM. See backend.md.'
  );
}

function replyForReminder(text) {
  if (/\bremind(er|ers|ing)?\b/i.test(text)) {
    return (
      'I can’t set alarms or reminders on your device from here — use your phone’s clock or calendar. ' +
      'I can still open OM pages if you ask (e.g. “open events” or “my album”).'
    );
  }
  return null;
}

async function runAssistantPipeline(req, res, { userText, transcript, imageBuffer, imageMime, prompt }) {
  const textIn = (userText || transcript || prompt || '').trim();
  const sidIn = req.body?.sessionId;
  const sid = typeof sidIn === 'string' && sidIn.trim() ? sidIn.trim() : newSessionId();
  const userId = getRequestUserId(req);
  const context = pickContext(req);
  const contextAppend = formatContextForModel(context);
  const localNav = routeFromUserText(textIn);

  // Prepare the payload for OpenClaw Bridge
  const bridgePayload = {
    kind: imageBuffer ? 'image' : transcript != null ? 'voice' : 'chat',
    message: userText,
    transcript,
    prompt,
    sessionId: sid,
    userId,
    context,
  };

  try {
    // If a Bridge URL is provided, try to call it first
    if (BRIDGE_URL) {
      const data = await tryBridge(req, bridgePayload);
      const reply = pickBridgeReply(data);
      if (reply) {
        const nav = pickBridgeNavigate(data) || localNav;
        return res.json({
          sessionId: data.sessionId || sid,
          userId,
          reply,
          ...(nav ? { navigateTo: nav } : {}),
        });
      }
    }
  } catch (e) {
    console.warn('[om-dev] failed:', e.message);
    if (String(e.message).includes('404') || String(e.message).includes('Cannot POST')) {
      console.warn();
    }
  }

  let llmError = null;
  try {
    // If the OpenAI key is provided, call OpenAI (or OpenRouter in this case)
    if (OPENAI_KEY) {
      const out = await tryOpenAI({
        userId,
        sid,
        userText: userText || transcript || '',
        imageBuffer,
        imageMime,
        prompt,
        contextAppend,
      });
      if (out && out.reply) {
        const nav = out.navigateFromModel || localNav;
        return res.json({
          sessionId: sid,
          userId,
          reply: out.reply,
          ...(nav ? { navigateTo: nav } : {}),
        });
      }
    }
  } catch (e) {
    llmError = e;
    console.warn('[openclaw-dev] OpenAI failed:', e.message);
  }

  // If OpenAI failed, try to provide a helpful message
  if (OPENAI_KEY && llmError) {
    const detail = String(llmError.message || llmError).slice(0, 400);
    return res.json({
      sessionId: sid,
      userId,
      reply:
        `Could not reach the language model (${detail}). ` +
        `Check  and  in the project root .env. ` +
        `OpenRouter: use https://openrouter.ai/api/v1 and a valid key from openrouter.ai/keys (401 “User not found” usually means a bad or revoked key).`,
    });
  }

  // If local navigation is requested, return that path to navigate
  if (localNav) {
    return res.json({
      sessionId: sid,
      userId,
      reply: `Opening ${labelForPath(localNav)}…`,
      navigateTo: localNav,
    });
  }

  // If nothing else works, return a fallback reply
  const fb = fallbackReply(textIn);
  return res.json({ sessionId: sid, userId, reply: fb });
}

app.post('/api/openclaw/session', (_req, res) => {
  res.json({ sessionId: newSessionId(), ok: true });
});

app.post('/api/openclaw/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    await runAssistantPipeline(req, res, { userText: typeof message === 'string' ? message : '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'openclaw chat failed', message: String(e.message) });
  }
});

app.post('/api/openclaw/voice', async (req, res) => {
  try {
    const { transcript } = req.body || {};
    await runAssistantPipeline(req, res, { transcript: typeof transcript === 'string' ? transcript : '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'openclaw voice failed', message: String(e.message) });
  }
});

app.post('/api/openclaw/image', upload.single('file'), async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const file = req.file;
    await runAssistantPipeline(req, res, {
      userText: prompt,
      prompt,
      imageBuffer: file?.buffer,
      imageMime: file?.mimetype,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'openclaw image failed', message: String(e.message) });
  }
});

app.listen(PORT, () => {
  const mode = BRIDGE_URL ? 'bridge' : OPENAI_KEY ? 'openai' : 'local-fallback';
  console.log(`[openclaw-dev] http://localhost:${PORT}  mode=${mode}`);
  if (mode === 'local-fallback') {
    console.log('[openclaw-dev] Add  or OPENCLAW_BRIDGE_URL in .env for a real assistant.');
  }
});
