/**
 * OM assistant — Filevault API tools for the dev server / bridge.
 * Uses the caller's Bearer token (same JWT as the React app).
 */

const FILEVAULT_API = (
  process.env.FILEVAULT_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:9090'
).replace(/\/$/, '');

const OM_TOOLS_ENABLED = String(process.env.OM_TOOLS_ENABLED || 'true').toLowerCase() !== 'false';

const API_PATH_ALLOWLIST = [
  '/api/memories/events',
  '/api/images/user/all',
  '/api/images/upload',
  '/api/albums',
  '/api/public-share/contacts',
  '/api/photobooks',
  '/api/user/profile',
];

function pickAuthHeader(req) {
  const auth = req?.headers?.authorization;
  if (auth && typeof auth === 'string' && auth.trim()) return auth.trim();
  return null;
}

async function filevaultFetch(req, method, path, { body, query } = {}) {
  const auth = pickAuthHeader(req);
  if (!auth) {
    return { ok: false, status: 401, error: 'Missing Authorization Bearer token (log in to OM first).' };
  }

  let url = `${FILEVAULT_API}${path.startsWith('/') ? path : `/${path}`}`;
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v != null && String(v).trim() !== '') qs.set(k, String(v));
    }
    const q = qs.toString();
    if (q) url += (url.includes('?') ? '&' : '?') + q;
  }

  const headers = { Authorization: auth, Accept: 'application/json' };
  const init = { method: method.toUpperCase(), headers };
  if (body != null && method.toUpperCase() !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text.slice(0, 2000);
    }
    return { ok: res.ok, status: res.status, data, url };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  }
}

function isPathAllowed(path) {
  const p = String(path || '').split('?')[0];
  if (!p.startsWith('/api/')) return false;
  return API_PATH_ALLOWLIST.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

async function runKeywordTools(req, userText) {
  if (!OM_TOOLS_ENABLED) return '';
  const t = String(userText || '').trim();
  if (!t) return '';

  const lines = [];

  if (/\b(list|show|get|my)\s+(memories?\s+)?events?\b/i.test(t) || /\bevents?\s+list\b/i.test(t)) {
    const r = await filevaultFetch(req, 'GET', '/api/memories/events');
    if (!r.ok) {
      lines.push(`[OM tool: list_memories_events failed HTTP ${r.status} ${r.error || ''}]`);
    } else {
      const events = Array.isArray(r.data) ? r.data : r.data?.events;
      const count = Array.isArray(events) ? events.length : 0;
      const names = (Array.isArray(events) ? events : [])
        .slice(0, 8)
        .map((e) => e?.name || e?.title || e?.id)
        .filter(Boolean);
      lines.push(
        `[OM tool: list_memories_events — ${count} event(s)${names.length ? ': ' + names.join(', ') : ''}]`
      );
    }
  }

  if (/\b(list|show|my)\s+(images?|photos?)\b/i.test(t) || /\bclient\s+images\b/i.test(t)) {
    const r = await filevaultFetch(req, 'GET', '/api/images/user/all');
    if (!r.ok) {
      lines.push(`[OM tool: list_user_images failed HTTP ${r.status}]`);
    } else {
      const arr = Array.isArray(r.data) ? r.data : r.data?.images || r.data?.content;
      const count = Array.isArray(arr) ? arr.length : 0;
      lines.push(`[OM tool: list_user_images — ${count} image record(s)]`);
    }
  }

  if (/\b(list|show)\s+albums?\b/i.test(t)) {
    const r = await filevaultFetch(req, 'GET', '/api/albums');
    if (!r.ok) {
      lines.push(`[OM tool: list_albums failed HTTP ${r.status}]`);
    } else {
      const arr = Array.isArray(r.data) ? r.data : r.data?.albums;
      const count = Array.isArray(arr) ? arr.length : 0;
      lines.push(`[OM tool: list_albums — ${count} album(s)]`);
    }
  }

  if (/\b(list|show)\s+contacts?\b/i.test(t) || /\bphone\s*book\b/i.test(t)) {
    const r = await filevaultFetch(req, 'GET', '/api/public-share/contacts', { query: { limit: 20 } });
    if (!r.ok) {
      lines.push(`[OM tool: list_contacts failed HTTP ${r.status}]`);
    } else {
      const arr = Array.isArray(r.data) ? r.data : r.data?.contacts;
      const count = Array.isArray(arr) ? arr.length : 0;
      lines.push(`[OM tool: list_contacts — ${count} contact(s)]`);
    }
  }

  return lines.length ? '\n\n' + lines.join('\n') : '';
}

async function executeTool(req, toolId, payload = {}) {
  const id = String(toolId || '').trim();
  const p = payload && typeof payload === 'object' ? payload : {};

  switch (id) {
    case 'list_memories_events':
      return filevaultFetch(req, 'GET', '/api/memories/events');
    case 'create_memories_event': {
      const body = {
        name: String(p.name || p.title || 'New event').trim(),
        dateTime: p.dateTime || new Date().toISOString(),
        location: p.location != null ? String(p.location) : '',
        privacy: p.privacy || 'invite',
      };
      return filevaultFetch(req, 'POST', '/api/memories/events', { body });
    }
    case 'list_user_images':
      return filevaultFetch(req, 'GET', '/api/images/user/all');
    case 'list_albums':
      return filevaultFetch(req, 'GET', '/api/albums');
    case 'list_contacts':
      return filevaultFetch(req, 'GET', '/api/public-share/contacts', { query: { limit: p.limit || 50 } });
    case 'api_get':
      if (!isPathAllowed(p.path)) return { ok: false, status: 403, error: 'Path not allowlisted' };
      return filevaultFetch(req, 'GET', String(p.path), { query: p.query });
    case 'api_post':
      if (!isPathAllowed(p.path)) return { ok: false, status: 403, error: 'Path not allowlisted' };
      return filevaultFetch(req, 'POST', String(p.path), { body: p.body });
    default:
      return { ok: false, status: 400, error: `Unknown tool: ${id}` };
  }
}

function parseActionsFromReply(text) {
  if (!text || typeof text !== 'string') return { cleanText: text || '', action: null, actions: null };
  let cleanText = text.trim();
  let action = null;
  let actions = null;

  const tryParse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const blockRe = /\{[\s\S]*?"(?:action|actions)"[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const obj = tryParse(m[0]);
    if (!obj) continue;
    if (typeof obj.action === 'string') {
      action = { id: obj.action, payload: obj.payload };
      cleanText = cleanText.replace(m[0], '').trim();
    }
    if (Array.isArray(obj.actions)) {
      actions = obj.actions
        .map((a) => ({
          id: typeof a?.id === 'string' ? a.id : typeof a?.action === 'string' ? a.action : '',
          payload: a?.payload,
        }))
        .filter((a) => a.id);
      cleanText = cleanText.replace(m[0], '').trim();
    }
  }

  return { cleanText, action, actions };
}

async function processToolLines(req, text) {
  if (!OM_TOOLS_ENABLED || !text) return { text, toolNotes: '' };
  const lines = String(text).split('\n');
  const kept = [];
  const notes = [];

  for (const line of lines) {
    const m = line.match(/^TOOL:\s*(\{[\s\S]*\})\s*$/);
    if (!m) {
      kept.push(line);
      continue;
    }
    try {
      const spec = JSON.parse(m[1]);
      const id = spec?.id || spec?.tool;
      const payload = spec?.payload || {};
      const result = await executeTool(req, id, payload);
      const summary = result.ok
        ? `Tool ${id} OK (${result.status})`
        : `Tool ${id} failed: ${result.error || result.status}`;
      notes.push(summary);
      if (result.ok && result.data) {
        const preview = JSON.stringify(result.data).slice(0, 500);
        notes.push(preview);
      }
    } catch (e) {
      notes.push(`Tool parse error: ${e.message}`);
    }
  }

  return {
    text: kept.join('\n').trim(),
    toolNotes: notes.length ? '\n\n[Tool results]\n' + notes.join('\n') : '',
  };
}

const TOOL_CATALOG = `
OM server tools (dev bridge runs TOOL lines and keyword prefetch):
- list_memories_events, create_memories_event, list_user_images, list_albums, list_contacts
- api_get / api_post on allowlisted /api/* paths only

To call a tool, add one line at the end:
TOOL:{"id":"list_memories_events","payload":{}}
`;

module.exports = {
  FILEVAULT_API,
  OM_TOOLS_ENABLED,
  TOOL_CATALOG,
  pickAuthHeader,
  filevaultFetch,
  runKeywordTools,
  executeTool,
  parseActionsFromReply,
  processToolLines,
  isPathAllowed,
};
