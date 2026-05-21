/**
 * Dev / bridge WhatsApp REST API — matches src/api/services/whatsappService.ts
 */

const crypto = require('crypto');

const DEFAULT_CONFIG = {
  dmPolicy: 'pairing',
  allowFrom: '',
  groupPolicy: 'allowlist',
  groupAllowFrom: '',
  selfChatMode: false,
  textChunkLimit: 4000,
  mediaMaxMb: 50,
  sendReadReceipts: true,
  reactionLevel: 'minimal',
  debounceMs: 0,
};

function devQrDataUrl(label) {
  const safe = String(label || 'OM Dev').replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
    <rect width="280" height="280" fill="#fff"/>
    <rect x="20" y="20" width="240" height="240" fill="none" stroke="#25D366" stroke-width="8"/>
    <text x="140" y="120" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#334155">OM WhatsApp</text>
    <text x="140" y="145" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">${safe}</text>
    <text x="140" y="175" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">Dev QR — use OpenClaw CLI for production</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function normalizePhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function isAllowedSender(config, from, isGroup) {
  if (isGroup) {
    if (config.groupPolicy === 'disabled') return false;
    if (config.groupPolicy === 'open') return true;
    const list = String(config.groupAllowFrom || '')
      .split(/[\s,;]+/)
      .map(normalizePhone)
      .filter(Boolean);
    return list.length === 0 || list.includes(normalizePhone(from));
  }
  if (config.dmPolicy === 'disabled') return false;
  if (config.dmPolicy === 'open') return true;
  const list = String(config.allowFrom || '')
    .split(/[\s,;]+/)
    .map(normalizePhone)
    .filter(Boolean);
  if (config.dmPolicy === 'pairing' && list.length === 0) return true;
  return list.includes(normalizePhone(from));
}

function mountWhatsAppRoutes(app, hooks = {}) {
  const state = {
    configured: true,
    linked: false,
    running: false,
    connected: false,
    lastConnectedAt: null,
    lastMessageAt: null,
    lastError: null,
    loginPending: false,
    config: { ...DEFAULT_CONFIG },
    messages: [],
  };

  function pushMessage(entry) {
    state.messages.unshift({
      id: entry.id || `wa-${crypto.randomUUID()}`,
      direction: entry.direction,
      from: entry.from,
      to: entry.to,
      text: entry.text,
      status: entry.status || 'sent',
      timestamp: entry.timestamp || new Date().toISOString(),
      isGroup: Boolean(entry.isGroup),
    });
    while (state.messages.length > 200) state.messages.pop();
    state.lastMessageAt = entry.timestamp || new Date().toISOString();
  }

  app.get('/api/whatsapp/status', (_req, res) => {
    res.json({
      configured: state.configured,
      linked: state.linked,
      running: state.running || state.connected,
      connected: state.connected,
      lastConnectedAt: state.lastConnectedAt,
      lastMessageAt: state.lastMessageAt,
      authAgeMs:
        state.connected && state.lastConnectedAt
          ? Date.now() - new Date(state.lastConnectedAt).getTime()
          : null,
      lastError: state.lastError,
    });
  });

  app.get('/api/whatsapp/config', (_req, res) => {
    res.json({ ...state.config });
  });

  app.post('/api/whatsapp/config', (req, res) => {
    state.config = { ...DEFAULT_CONFIG, ...state.config, ...(req.body || {}) };
    res.json({ ok: true });
  });

  app.post('/api/whatsapp/login/start', (req, res) => {
    const force = Boolean(req.body?.force);
    if (state.connected && !force) {
      return res.json({ message: 'Already connected.', qrDataUrl: null });
    }
    state.loginPending = true;
    state.linked = false;
    state.connected = false;
    state.lastError = null;
    res.json({
      message:
        'Dev: simulated QR. Production: OpenClaw Gateway + `openclaw channels login --channel whatsapp`. See docs/BACKEND-OM-ASSISTANT.md.',
      qrDataUrl: devQrDataUrl('Scan then POST login/wait'),
    });
  });

  app.post('/api/whatsapp/login/wait', (_req, res) => {
    if (!state.loginPending) {
      return res.json({ message: 'Call login/start first.', connected: state.connected });
    }
    state.loginPending = false;
    state.linked = true;
    state.running = true;
    state.connected = true;
    state.lastConnectedAt = new Date().toISOString();
    state.lastError = null;
    pushMessage({
      direction: 'outbound',
      from: 'system',
      to: 'om',
      text: 'WhatsApp channel connected (dev simulation).',
      status: 'delivered',
    });
    res.json({ message: 'Connected (dev simulation).', connected: true });
  });

  app.post('/api/whatsapp/logout', (_req, res) => {
    state.linked = false;
    state.running = false;
    state.connected = false;
    state.loginPending = false;
    state.lastConnectedAt = null;
    res.json({ message: 'Logged out (dev).' });
  });

  app.get('/api/whatsapp/messages', (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50));
    let list = [...state.messages];
    if (req.query?.before) {
      const before = String(req.query.before);
      const idx = list.findIndex((m) => m.id === before);
      if (idx >= 0) list = list.slice(idx + 1);
    }
    res.json(list.slice(0, limit));
  });

  app.post('/api/whatsapp/send', async (req, res) => {
    const to = String(req.body?.to || '').trim();
    const text = String(req.body?.text || '').trim();
    if (!to || !text) {
      return res.status(400).json({ ok: false, error: 'to and text required' });
    }
    if (!state.connected) {
      return res.status(409).json({ ok: false, error: 'WhatsApp not connected' });
    }

    const msgId = `out-${crypto.randomUUID()}`;
    pushMessage({
      id: msgId,
      direction: 'outbound',
      from: 'om',
      to,
      text,
      status: 'sent',
    });

    if (typeof hooks.onInboundMessage === 'function') {
      try {
        const from = normalizePhone(to) || to;
        if (isAllowedSender(state.config, from, false)) {
          const { reply } = await hooks.onInboundMessage({ from, text, req });
          if (reply) {
            pushMessage({
              direction: 'outbound',
              from: 'om',
              to: from,
              text: reply,
              status: 'sent',
            });
          }
        }
      } catch (e) {
        state.lastError = String(e.message || e);
      }
    }

    res.json({ ok: true, messageId: msgId });
  });

  app.post('/api/whatsapp/simulate-inbound', async (req, res) => {
    const from = String(req.body?.from || '15550000000').trim();
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!state.connected) return res.status(409).json({ error: 'not connected' });
    if (!isAllowedSender(state.config, from, Boolean(req.body?.isGroup))) {
      return res.status(403).json({ error: 'sender not allowed by config' });
    }

    pushMessage({ direction: 'inbound', from, to: 'om', text, status: 'delivered', isGroup: Boolean(req.body?.isGroup) });

    let reply = '';
    if (typeof hooks.onInboundMessage === 'function') {
      const out = await hooks.onInboundMessage({ from, text, req });
      reply = out?.reply || '';
      if (reply) {
        pushMessage({ direction: 'outbound', from: 'om', to: from, text: reply, status: 'sent' });
      }
    }
    res.json({ ok: true, reply });
  });

  return { getState: () => state };
}

module.exports = { mountWhatsAppRoutes, DEFAULT_CONFIG };
