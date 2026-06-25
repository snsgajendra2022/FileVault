/**
 * Dev / bridge WhatsApp REST API — matches src/api/services/whatsappService.ts
 * Uses OpenClaw Gateway for real QR, link status, and outbound OM messages.
 */

const crypto = require('crypto');
const {
  gatewayCall,
  isGatewayConfigured,
  isGatewayReachable,
  gatewayChannelsStatus,
  parseWhatsAppGatewayAccount,
  parsePhoneFromGatewayText,
  gatewaySendWhatsApp,
  gatewayLogoutWhatsApp,
  ensureWhatsAppChannelRunning,
  normalizeGatewayLoginResult,
  ensureGatewayOperatorScopes,
  isGatewayPairingError,
  getGatewayDiagnostics,
  resolveConfigPath,
  readPhoneFromWhatsAppCreds,
  hasWhatsAppSessionCreds,
  readWhatsAppSelfJid,
} = require('./openclaw-gateway-client');
const { OM_WELCOME_OUTBOUND } = require('./om-whatsapp-replies');
const { bootstrapOmWhatsApp } = require('./whatsapp-bootstrap');
const { loadWhatsAppStudioState, saveWhatsAppStudioState } = require('./whatsapp-studio-state');
const { isSelfChatSender, filterSelfChatMessages } = require('./whatsapp-self-chat');
const {
  resolveTenantIdFromReq,
  pushTenantMessage,
  getTenantMessages,
  linkTenantAuth,
  resolveTenantIdFromPhone,
} = require('./whatsapp-tenant');

const DEFAULT_CONFIG = {
  dmPolicy: 'allowlist',
  allowFrom: '',
  groupPolicy: 'disabled',
  groupAllowFrom: '',
  selfChatMode: true,
  /** When false: no OM upload/reply for inbound WhatsApp (relay returns suppressReply). */
  inboundOmEnabled: true,
  textChunkLimit: 4000,
  mediaMaxMb: 50,
  sendReadReceipts: true,
  reactionLevel: 'minimal',
  debounceMs: 0,
};

function isOmInboundEnabled(config) {
  return config?.inboundOmEnabled !== false;
}

const OM_WELCOME_TEXT =
  process.env.OM_WHATSAPP_WELCOME?.trim() || OM_WELCOME_OUTBOUND;

function devQrDataUrl(label) {
  const safe = String(label || 'OM Dev').replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
    <rect width="280" height="280" fill="#fff"/>
    <rect x="20" y="20" width="240" height="240" fill="none" stroke="#25D366" stroke-width="8"/>
    <text x="140" y="120" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#334155">OM WhatsApp</text>
    <text x="140" y="145" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">${safe}</text>
    <text x="140" y="175" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">Dev QR — start OpenClaw gateway</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function normalizePhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function toE164(digits) {
  const raw = String(digits || '').trim();
  if (raw.startsWith('+')) return raw;
  const d = normalizePhone(raw);
  if (!d) return null;
  return `+${d}`;
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
  const persisted = loadWhatsAppStudioState();
  const state = {
    configured: true,
    linked: false,
    running: false,
    connected: false,
    linkedPhoneE164: persisted.linkedPhoneE164 || null,
    welcomeSentAt: persisted.welcomeSentAt || null,
    lastConnectedAt: persisted.lastConnectedAt || null,
    lastMessageAt: persisted.lastMessageAt || null,
    lastError: null,
    loginPending: false,
    lastQrDataUrl: null,
    studioDisconnected: false,
    bootstrapInFlight: false,
    omSetupComplete: Boolean(persisted.omSetupComplete),
    omIntroSentAt: persisted.omIntroSentAt || null,
    gatewayReachable: null,
    gatewayLoggedOut: false,
    gatewayStatusState: null,
    config: {
      ...DEFAULT_CONFIG,
      ...(persisted.whatsappConfig && typeof persisted.whatsappConfig === 'object'
        ? persisted.whatsappConfig
        : {}),
    },
    messages: Array.isArray(persisted.messages) ? persisted.messages : [],
  };

  function persistStudioState(extra = {}) {
    saveWhatsAppStudioState({
      linkedPhoneE164: state.linkedPhoneE164,
      welcomeSentAt: state.welcomeSentAt,
      lastConnectedAt: state.lastConnectedAt,
      lastMessageAt: state.lastMessageAt,
      omSetupComplete: state.omSetupComplete,
      omIntroSentAt: state.omIntroSentAt,
      messages: state.messages.slice(0, 50),
      ...extra,
    });
  }

  function pushMessage(entry, tenantId) {
    const msg = {
      id: entry.id || `wa-${crypto.randomUUID()}`,
      direction: entry.direction,
      from: entry.from,
      to: entry.to,
      text: entry.text,
      status: entry.status || 'sent',
      timestamp: entry.timestamp || new Date().toISOString(),
      isGroup: Boolean(entry.isGroup),
    };
    const tid = tenantId || entry.tenantId || 'guest';
    pushTenantMessage(tid, msg);
    state.messages.unshift(msg);
    while (state.messages.length > 200) state.messages.pop();
    state.lastMessageAt = msg.timestamp;
  }

  function rememberLinkedPhone(phone) {
    const e164 = toE164(phone);
    if (!e164) return;
    state.linkedPhoneE164 = e164;
    if (state.config.selfChatMode !== false) {
      state.config.dmPolicy = 'allowlist';
      state.config.allowFrom = e164;
      state.config.groupPolicy = 'disabled';
      persistStudioState({ whatsappConfig: state.config });
    }
  }

  async function resolveWhatsAppLinkedPhoneE164() {
    if (state.linkedPhoneE164) return state.linkedPhoneE164;
    const fromCreds = readPhoneFromWhatsAppCreds();
    if (fromCreds) {
      rememberLinkedPhone(fromCreds);
      return fromCreds;
    }
    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY === 'false' || !isGatewayConfigured()) {
      return null;
    }
    try {
      const st = await gatewayChannelsStatus();
      const wa = parseWhatsAppGatewayAccount(st);
      const phone = wa?.phone || parsePhoneFromGatewayText(st?.message);
      if (phone) rememberLinkedPhone(phone);
      return state.linkedPhoneE164;
    } catch {
      return null;
    }
  }

  async function resolveSelfChatTarget() {
    const phone = await resolveWhatsAppLinkedPhoneE164();
    if (phone) return phone;
    const jid = readWhatsAppSelfJid();
    if (jid) return jid.split('@')[0];
    return null;
  }

  async function syncFromGateway({ tryStart = false } = {}) {
    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY === 'false' || !isGatewayConfigured()) {
      return null;
    }
    try {
      state.gatewayReachable = await isGatewayReachable();
      if (!state.gatewayReachable) {
        state.lastError = state.lastError || 'Gateway not reachable on port 18789';
        return null;
      }

      let st = await gatewayChannelsStatus();
      let wa = parseWhatsAppGatewayAccount(st);

      if (
        tryStart &&
        wa &&
        !wa.loggedOut &&
        hasWhatsAppSessionCreds() &&
        !wa.running &&
        !wa.linked
      ) {
        try {
          await gatewayCall('channels.start', { channel: 'whatsapp', accountId: 'default' }, 60000);
          st = await gatewayChannelsStatus();
          wa = parseWhatsAppGatewayAccount(st);
        } catch {
          /* keep previous wa */
        }
      }

      if (!wa) return null;

      state.gatewayLoggedOut = Boolean(wa.loggedOut);
      state.gatewayStatusState = wa.statusState || null;

      state.linked = Boolean(wa.linked);
      state.running = Boolean(wa.running);
      state.connected = Boolean(wa.connected);

      if (wa.lastConnectedAtMs) {
        state.lastConnectedAt = new Date(wa.lastConnectedAtMs).toISOString();
      } else if (state.connected && !state.lastConnectedAt) {
        state.lastConnectedAt = new Date().toISOString();
      }

      if (wa.loggedOut) {
        state.linked = false;
        state.running = false;
        state.connected = false;
        state.omSetupComplete = false;
        state.lastError =
          wa.lastError ||
          'WhatsApp session ended on gateway (401 conflict). Click Relink and scan QR again.';
      } else if (!wa.linked && !hasWhatsAppSessionCreds()) {
        state.omSetupComplete = false;
        state.welcomeSentAt = null;
      }

      if (wa.phone) rememberLinkedPhone(wa.phone);
      if (wa.lastError && wa.loggedOut) state.lastError = String(wa.lastError);
      else if (state.connected) state.lastError = null;

      if (state.connected || state.welcomeSentAt || state.omSetupComplete) {
        persistStudioState();
      }
      return wa;
    } catch (e) {
      state.lastError = String(e.message || e);
      return null;
    }
  }

  async function sendOmMessageToPhone(text, tenantId = 'guest') {
    const body = String(text || '').trim();
    if (!body) throw new Error('message text required');
    await ensureWhatsAppChannelRunning('default');
    const to = await resolveSelfChatTarget();
    if (!to) throw new Error('No linked phone — scan QR and link WhatsApp first');
    await gatewaySendWhatsApp({ to, text: body });
    pushMessage(
      {
        direction: 'outbound',
        from: 'om',
        to,
        text: body,
        status: 'sent',
      },
      tenantId
    );
    return { ok: true, to };
  }

  async function sendOmWelcomeToPhone() {
    if (state.welcomeSentAt) return { ok: true, skipped: true };
    const result = await sendOmMessageToPhone(OM_WELCOME_TEXT);
    state.welcomeSentAt = new Date().toISOString();
    state.omSetupComplete = true;
    persistStudioState();
    return result;
  }

  function clearLocalWhatsAppState() {
    state.linked = false;
    state.running = false;
    state.connected = false;
    state.loginPending = false;
    state.omSetupComplete = false;
    state.omIntroSentAt = null;
    state.welcomeSentAt = null;
    state.linkedPhoneE164 = null;
    state.lastConnectedAt = null;
    state.lastQrDataUrl = null;
  }

  const bootstrapDeps = {
    syncFromGateway,
    resolveWhatsAppLinkedPhoneE164,
    rememberLinkedPhone,
    ensureWhatsAppChannelRunning,
    sendOmWelcomeToPhone,
    isGatewayReachable,
    isGatewayConfigured,
    hasWhatsAppSessionCreds,
  };

  async function runOmBootstrap() {
    const result = await bootstrapOmWhatsApp(state, bootstrapDeps);
    if (result.ok) persistStudioState();
    return result;
  }

  function statusPayload(extra = {}) {
    const hasCreds = hasWhatsAppSessionCreds();
    const needsRelink =
      Boolean(state.gatewayLoggedOut) ||
      (hasCreds && !state.linked && !state.running && !state.connected);
    const omReady = Boolean(
      state.connected && state.linked && state.gatewayReachable !== false
    );
    return {
      configured: state.configured,
      linked: state.linked,
      running: state.running || (state.connected && state.linked),
      connected: state.connected,
      linkedPhoneE164: state.linkedPhoneE164,
      welcomeSentAt: state.welcomeSentAt,
      omSetupComplete: state.omSetupComplete,
      omReady,
      needsRelink,
      hasWhatsAppCreds: hasCreds,
      gatewayReachable: state.gatewayReachable,
      gatewayLoggedOut: state.gatewayLoggedOut,
      gatewayStatusState: state.gatewayStatusState,
      lastConnectedAt: state.lastConnectedAt,
      lastMessageAt: state.lastMessageAt,
      authAgeMs:
        state.connected && state.lastConnectedAt
          ? Date.now() - new Date(state.lastConnectedAt).getTime()
          : null,
      lastError: state.lastError,
      gateway: {
        ...getGatewayDiagnostics(),
        reachable: state.gatewayReachable,
      },
      inboundOmEnabled: isOmInboundEnabled(state.config),
      selfChatMode: state.config.selfChatMode !== false,
      ...extra,
    };
  }

  app.get('/api/whatsapp/status', async (_req, res) => {
    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY !== 'false' && isGatewayConfigured()) {
      const wasConnected = state.connected;
      state.gatewayReachable = await isGatewayReachable();
      if (state.gatewayReachable) {
        await syncFromGateway({ tryStart: true });
        const shouldBootstrap =
          state.connected &&
          state.linked &&
          !state.gatewayLoggedOut &&
          !state.bootstrapInFlight &&
          (!state.omSetupComplete || !state.welcomeSentAt || !wasConnected);
        if (shouldBootstrap) {
          runOmBootstrap().catch(() => {});
        }
      }
    }
    res.json(statusPayload());
  });

  app.post('/api/whatsapp/bootstrap', async (_req, res) => {
    try {
      const result = await runOmBootstrap();
      if (!result.ok) {
        return res.status(result.busy ? 409 : 503).json(result);
      }
      res.json({ ...statusPayload(), ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e.message || e) });
    }
  });

  app.post('/api/whatsapp/send-to-phone', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    try {
      await syncFromGateway();
      if (!state.connected) {
        return res.status(409).json({
          ok: false,
          error: 'WhatsApp not connected. Link via QR first.',
          ...statusPayload(),
        });
      }
      const sent = await sendOmMessageToPhone(text);
      res.json({ ok: true, ...sent, ...statusPayload() });
    } catch (e) {
      res.status(503).json({ ok: false, error: String(e.message || e) });
    }
  });

  app.post('/api/whatsapp/welcome', async (_req, res) => {
    try {
      const result = await sendOmWelcomeToPhone();
      res.json({ ok: true, ...result, ...statusPayload() });
    } catch (e) {
      res.status(503).json({ ok: false, error: String(e.message || e) });
    }
  });

  app.get('/api/whatsapp/config', (_req, res) => {
    res.json({ ...state.config });
  });

  app.post('/api/whatsapp/config', (req, res) => {
    state.config = { ...DEFAULT_CONFIG, ...state.config, ...(req.body || {}) };
    persistStudioState({ whatsappConfig: state.config });
    res.json({ ok: true, inboundOmEnabled: isOmInboundEnabled(state.config) });
  });

  app.post('/api/whatsapp/login/start', async (req, res) => {
    const force = Boolean(req.body?.force);
    state.lastQrDataUrl = null;

    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY !== 'false' && isGatewayConfigured()) {
      try {
        const reachable = await isGatewayReachable();
        state.gatewayReachable = reachable;
        if (!reachable) {
          return res.status(503).json({
            error: 'Gateway not reachable',
            message:
              'Start gateway: node server/run-openclaw-gateway.js (port 18789). See docs/WHATSAPP-OPENCLAW-FIX.md',
            qrDataUrl: null,
          });
        }

        if (!force) {
          await syncFromGateway({ tryStart: true });
          const sessionOk =
            hasWhatsAppSessionCreds() &&
            !state.gatewayLoggedOut &&
            (state.linked || state.running || state.connected);
          if (sessionOk) {
            state.loginPending = false;
            state.studioDisconnected = false;
            if (!state.omSetupComplete) {
              runOmBootstrap().catch(() => {});
            }
            return res.json({
              message:
                'WhatsApp is already linked. Open Message yourself on your phone to chat with OM.',
              qrDataUrl: null,
              qrPayload: null,
              connected: true,
              source: 'openclaw-gateway',
              omReady: state.omSetupComplete,
            });
          }
        }

        await ensureGatewayOperatorScopes().catch(() => {});

        let raw;
        try {
          raw = await gatewayCall('web.login.start', {
            force,
            timeoutMs: 60000,
            verbose: false,
          });
        } catch (loginErr) {
          if (!isGatewayPairingError(loginErr)) throw loginErr;
          await ensureGatewayOperatorScopes();
          raw = await gatewayCall('web.login.start', {
            force,
            timeoutMs: 60000,
            verbose: false,
          });
        }
        const result = normalizeGatewayLoginResult(raw);
        if (result?.qrDataUrl) {
          state.loginPending = true;
          state.lastQrDataUrl = result.qrDataUrl;
          state.connected = false;
          state.linked = false;
          state.running = false;
          state.omSetupComplete = false;
          state.lastError = null;
          return res.json({
            message:
              result.message ||
              'Scan this QR in WhatsApp → Linked devices → Link a device.',
            qrDataUrl: result.qrDataUrl,
            qrPayload: null,
            connected: result.connected ?? null,
            source: 'openclaw-gateway',
          });
        }
        if (result?.message) {
          const phone = parsePhoneFromGatewayText(result.message);
          if (phone) rememberLinkedPhone(phone);
          return res.json({
            message: result.message,
            qrDataUrl: result.qrDataUrl ?? null,
            qrPayload: null,
            connected: result.connected ?? null,
            source: 'openclaw-gateway',
          });
        }
      } catch (err) {
        state.lastError = String(err.message || err);
        const msg = String(err.message || err);
        let hint =
          'Run: node server/run-openclaw-gateway.js with OPENCLAW_CONFIG_PATH=filevault/.openclaw/openclaw.json';
        if (/protocol mismatch/i.test(msg)) {
          hint = 'Stale gateway on 18789 — stop old openclaw and restart from filevault.';
        } else if (/pairing required|scope upgrade/i.test(msg)) {
          hint = 'Approve CLI: open http://127.0.0.1:18789/ or openclaw devices approve --latest';
        } else if (/web login provider is not available/i.test(msg)) {
          hint = 'Install WhatsApp plugin: openclaw plugins install clawhub:@openclaw/whatsapp';
        }
        return res.status(503).json({
          error: state.lastError,
          message: hint,
          qrDataUrl: null,
        });
      }
    }

    if (state.connected && !force) {
      return res.json({
        message: 'Already connected (dev). Use Relink or start OpenClaw Gateway.',
        qrDataUrl: null,
        qrPayload: null,
      });
    }
    state.loginPending = true;
    clearLocalWhatsAppState();
    state.loginPending = true;
    state.lastError = null;
    res.json({
      message: 'Gateway offline — dev placeholder QR (not scannable in WhatsApp).',
      qrDataUrl: devQrDataUrl('Start openclaw gateway'),
      qrPayload: null,
      source: 'dev-fallback',
    });
  });

  app.post('/api/whatsapp/login/wait', async (_req, res) => {
    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY !== 'false' && isGatewayConfigured() && state.loginPending) {
      try {
        const raw = await gatewayCall(
          'web.login.wait',
          {
            timeoutMs: 120000,
            currentQrDataUrl: state.lastQrDataUrl || undefined,
          },
          130000
        );
        const result = normalizeGatewayLoginResult(raw);
        const connected = Boolean(result?.connected);
        if (connected) {
          state.loginPending = false;
          state.gatewayLoggedOut = false;
          await syncFromGateway({ tryStart: true });
          if (!state.connected) {
            state.linked = true;
            state.running = true;
            state.connected = true;
            state.lastConnectedAt = new Date().toISOString();
          }
          state.lastError = null;
          const phone = parsePhoneFromGatewayText(result?.message);
          if (phone) rememberLinkedPhone(phone);
          pushMessage({
            direction: 'outbound',
            from: 'system',
            to: 'om',
            text: 'WhatsApp linked via OpenClaw Gateway.',
            status: 'delivered',
          });
          persistStudioState();
          runOmBootstrap().catch(() => {});
        }
        return res.json({
          message: result?.message || (connected ? 'Connected.' : 'Not connected yet.'),
          connected,
          source: 'openclaw-gateway',
          ...statusPayload(),
        });
      } catch (err) {
        return res.status(503).json({
          error: String(err.message || err),
          message: 'Gateway wait failed. Is the gateway still running?',
          connected: false,
        });
      }
    }

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
    res.json({ message: 'Connected (dev simulation).', connected: true, source: 'dev-fallback' });
  });

  app.post('/api/whatsapp/logout', async (_req, res) => {
    if (process.env.OPENCLAW_WHATSAPP_USE_GATEWAY !== 'false' && isGatewayConfigured()) {
      try {
        await gatewayLogoutWhatsApp('default');
      } catch {
        /* local state still cleared */
      }
    }
    clearLocalWhatsAppState();
    state.studioDisconnected = true;
    res.json({ message: 'Logged out.', ...statusPayload() });
  });

  app.get('/api/whatsapp/messages', async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50));
    const tenantId = resolveTenantIdFromReq(req);
    const linked = await resolveWhatsAppLinkedPhoneE164();
    let list = getTenantMessages(tenantId);
    if (state.config.selfChatMode !== false) {
      list = filterSelfChatMessages(list, linked);
    }
    if (req.query?.before) {
      const before = String(req.query.before);
      const idx = list.findIndex((m) => m.id === before);
      if (idx >= 0) list = list.slice(idx + 1);
    }
    res.json(list.slice(0, limit));
  });

  app.post('/api/whatsapp/send', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    let to = String(req.body?.to || '').trim();
    if (!text) {
      return res.status(400).json({ ok: false, error: 'text required' });
    }
    if (!state.connected) {
      return res.status(409).json({ ok: false, error: 'WhatsApp not connected' });
    }

    const tenantId = resolveTenantIdFromReq(req);
    const linked = await resolveWhatsAppLinkedPhoneE164();
    const selfTarget = await resolveSelfChatTarget();

    if (state.config.selfChatMode !== false) {
      if (to && linked && !isSelfChatSender(to, linked)) {
        return res.status(403).json({
          ok: false,
          error: 'Self-chat only — cannot send messages to other numbers',
        });
      }
      to = selfTarget || linked || to;
      if (!to) {
        return res.status(409).json({ ok: false, error: 'No linked phone for self-chat' });
      }
    } else if (!to) {
      return res.status(400).json({ ok: false, error: 'to and text required' });
    }

    const msgId = `out-${crypto.randomUUID()}`;
    try {
      await gatewaySendWhatsApp({ to, text });
    } catch (e) {
      return res.status(503).json({ ok: false, error: String(e.message || e) });
    }

    pushMessage(
      {
        id: msgId,
        direction: 'outbound',
        from: 'om',
        to,
        text,
        status: 'sent',
      },
      tenantId
    );

    if (typeof hooks.onInboundMessage === 'function') {
      try {
        const from = linked || to;
        if (isAllowedSender(state.config, from, false)) {
          const { buildWhatsAppOmRequest } = require('./om-whatsapp-actions');
          const omReq = buildWhatsAppOmRequest({ from, text, req, userId: tenantId });
          const { reply } = await hooks.onInboundMessage({ from, text, req: omReq });
          if (reply) {
            await gatewaySendWhatsApp({ to: from, text: reply });
            pushMessage(
              {
                direction: 'outbound',
                from: 'om',
                to: from,
                text: reply,
                status: 'sent',
              },
              tenantId
            );
          }
        }
      } catch (e) {
        state.lastError = String(e.message || e);
      }
    }

    res.json({ ok: true, messageId: msgId, to });
  });

  /** Gateway plugin om-whatsapp-relay → compute OM reply (no duplicate send; gateway delivers text). */
  /** Link Filevault JWT from the logged-in studio UI so WhatsApp OM can call APIs. */
  /** Direct multipart upload (studio tools / testing). Uses same pipeline as relay media. */
  if (hooks.upload) {
    app.post('/api/whatsapp/upload', hooks.upload.single('file'), async (req, res) => {
      const auth = String(req.headers.authorization || '').trim();
      const tenantId = resolveTenantIdFromReq(req);
      const phone = String(req.body?.phone || state.linkedPhoneE164 || '').trim();
      const { saveBearerForPhone, buildWhatsAppOmRequest } = require('./om-whatsapp-actions');
      const { processWhatsAppMediaInbound } = require('./om-whatsapp-upload');
      if (auth) {
        saveBearerForPhone(phone, auth);
        linkTenantAuth(tenantId, phone, auth);
      }

      const file = req.file;
      if (!file?.buffer?.length) {
        return res.status(400).json({ ok: false, error: 'multipart field "file" required' });
      }

      const omReq = buildWhatsAppOmRequest({
        from: phone,
        text: req.body?.caption || '',
        req,
        userId: tenantId,
      });
      const reply = await processWhatsAppMediaInbound({
        req: omReq,
        from: phone,
        text: req.body?.caption || '',
        media: [{ buffer: file.buffer, type: file.mimetype, name: file.originalname }],
      });

      return res.json({
        ok: Boolean(reply),
        reply: reply || 'Upload failed — link Studio → WhatsApp or send Authorization Bearer.',
      });
    });
  }

  app.post('/api/whatsapp/link-auth', async (req, res) => {
    const auth = String(req.headers.authorization || req.body?.token || '').trim();
    if (!auth) {
      return res.status(400).json({ ok: false, error: 'Authorization Bearer token required' });
    }
    const tenantId = resolveTenantIdFromReq(req);
    const phone =
      String(req.body?.phone || '').trim() || (await resolveWhatsAppLinkedPhoneE164()) || '';
    const { saveBearerForPhone } = require('./om-whatsapp-actions');
    saveBearerForPhone(phone, auth);
    linkTenantAuth(tenantId, phone || null, auth);
    return res.json({
      ok: true,
      phone: phone || null,
      userId: tenantId,
      message:
        'Your account is linked — OM reads your project data only for this login (not other users).',
    });
  });

  app.get('/api/whatsapp/link-auth/status', (req, res) => {
    const tenantId = resolveTenantIdFromReq(req);
    const { resolveBearerForTenant } = require('./whatsapp-tenant');
    const phone = state.linkedPhoneE164;
    const hasToken = Boolean(resolveBearerForTenant(tenantId, phone));
    return res.json({ ok: true, phone, linked: hasToken, userId: tenantId });
  });

  function normalizeInboundPhone(raw) {
    const s = String(raw || '').trim().replace(/^whatsapp:/i, '');
    if (s.includes('@')) {
      const digits = s.split('@')[0].replace(/\D/g, '');
      return digits ? `+${digits}` : s;
    }
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 10) return `+${digits}`;
    const m = s.match(/\+?\d{10,15}/);
    return m ? `+${m[0].replace(/\D/g, '')}` : s;
  }

  app.post('/api/whatsapp/relay-inbound', async (req, res) => {
    const from = normalizeInboundPhone(req.body?.from || req.body?.replyTo || '');
    const text = String(req.body?.text || '').trim();
    const mediaPath = String(req.body?.mediaPath || '').trim();
    const mediaType = String(req.body?.mediaType || '').trim();
    const mediaFileName = String(req.body?.mediaFileName || '').trim();
    const rawMediaList = Array.isArray(req.body?.mediaPaths) ? req.body.mediaPaths : [];

    const media = [];
    if (rawMediaList.length > 0) {
      for (const entry of rawMediaList) {
        const p = String(entry?.path || entry || '').trim();
        if (!p) continue;
        media.push({
          path: p,
          type: String(entry?.type || entry?.mime || mediaType || '').trim() || undefined,
          name: String(entry?.name || entry?.fileName || mediaFileName || '').trim() || undefined,
        });
      }
    } else if (mediaPath) {
      media.push({
        path: mediaPath,
        type: mediaType || undefined,
        name: mediaFileName || undefined,
      });
    }

    if (!text && media.length === 0) {
      return res.status(400).json({ ok: false, error: 'text or media required' });
    }

    const remote = req.socket?.remoteAddress || '';
    const isLocal =
      remote === '127.0.0.1' ||
      remote === '::1' ||
      remote === '::ffff:127.0.0.1' ||
      !remote;
    if (!isLocal) {
      return res.status(403).json({ ok: false, error: 'relay allowed from loopback only' });
    }

    if (!state.connected) {
      return res.status(409).json({ ok: false, error: 'WhatsApp not connected' });
    }

    const sender = from || state.linkedPhoneE164 || '';
    const linked = await resolveWhatsAppLinkedPhoneE164();

    if (state.config.selfChatMode !== false) {
      if (!isSelfChatSender(sender, linked)) {
        return res.json({ ok: true, reply: '', suppressReply: true, ignored: 'not-self-chat' });
      }
    } else if (sender && !isAllowedSender(state.config, sender, false)) {
      return res.status(403).json({ ok: false, error: 'sender not allowed' });
    }

    const tenantId = resolveTenantIdFromPhone(sender);

    const inboundLabel =
      text || (media.length ? `[${media.length} image(s)]` : '');
    pushMessage(
      {
        direction: 'inbound',
        from: sender || 'unknown',
        to: 'om',
        text: inboundLabel,
        status: 'delivered',
      },
      tenantId
    );

    if (!isOmInboundEnabled(state.config)) {
      return res.json({ ok: true, reply: '', suppressReply: true });
    }

    let reply = '';
    if (typeof hooks.onInboundMessage === 'function') {
      try {
        const { buildWhatsAppOmRequest } = require('./om-whatsapp-actions');
        const omReq = buildWhatsAppOmRequest({ from: sender, text, req, userId: tenantId });
        const out = await hooks.onInboundMessage({ from: sender, text, media, req: omReq });
        reply = (out?.reply || '').trim();
      } catch (e) {
        console.warn('[whatsapp] relay-inbound failed:', e.message);
        return res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    } else {
      reply =
        'OM dev server has no assistant hook. Start with: npm start (openclaw-dev-server on port 9093).';
    }

    if (reply) {
      pushMessage(
        {
          direction: 'outbound',
          from: 'om',
          to: sender,
          text: reply,
          status: 'sent',
        },
        tenantId
      );
      state.lastMessageAt = new Date().toISOString();
      persistStudioState();
    }

    return res.json({ ok: true, reply });
  });

  app.post('/api/whatsapp/simulate-inbound', async (req, res) => {
    const from = String(req.body?.from || state.linkedPhoneE164 || '').trim();
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!state.connected) return res.status(409).json({ error: 'not connected' });

    const linked = await resolveWhatsAppLinkedPhoneE164();
    if (state.config.selfChatMode !== false && !isSelfChatSender(from, linked)) {
      return res.status(403).json({ error: 'Self-chat only — use your linked number' });
    }
    if (!isAllowedSender(state.config, from, Boolean(req.body?.isGroup))) {
      return res.status(403).json({ error: 'sender not allowed by config' });
    }

    const tenantId = resolveTenantIdFromReq(req);

    pushMessage(
      {
        direction: 'inbound',
        from,
        to: 'om',
        text,
        status: 'delivered',
        isGroup: Boolean(req.body?.isGroup),
      },
      tenantId
    );

    if (!isOmInboundEnabled(state.config)) {
      return res.json({ ok: true, reply: '', suppressReply: true });
    }

    let reply = '';
    if (typeof hooks.onInboundMessage === 'function') {
      const { buildWhatsAppOmRequest } = require('./om-whatsapp-actions');
      const omReq = buildWhatsAppOmRequest({ from, text, req, userId: tenantId });
      const out = await hooks.onInboundMessage({ from, text, req: omReq });
      reply = out?.reply || '';
      if (reply) {
        pushMessage(
          { direction: 'outbound', from: 'om', to: from, text: reply, status: 'sent' },
          tenantId
        );
      }
    }
    res.json({ ok: true, reply });
  });

  return { getState: () => state, runOmBootstrap };
}

module.exports = { mountWhatsAppRoutes, DEFAULT_CONFIG, isOmInboundEnabled };
