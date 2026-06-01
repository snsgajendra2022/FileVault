/**
 * Call OpenClaw Gateway (WhatsApp QR, channels, outbound send) via CLI.
 * Config: OPENCLAW_CONFIG_PATH → filevault/.openclaw/openclaw.json → ~/.openclaw/openclaw.json
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.join(__dirname, '..');
const PROJECT_OPENCLAW = path.join(REPO_ROOT, '.openclaw', 'openclaw.json');
const HOME_OPENCLAW = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
const WA_CREDS_DIR = path.join(process.env.HOME || '', '.openclaw', 'credentials', 'whatsapp');

function readJsonConfig(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveConfigPath() {
  const pathEnv = (process.env.OPENCLAW_CONFIG_PATH || '').trim();
  if (pathEnv && fs.existsSync(pathEnv)) return pathEnv;
  const configEnv = (process.env.OPENCLAW_CONFIG || '').trim();
  if (configEnv && fs.existsSync(configEnv)) return configEnv;
  if (fs.existsSync(PROJECT_OPENCLAW)) return PROJECT_OPENCLAW;
  if (fs.existsSync(HOME_OPENCLAW)) return HOME_OPENCLAW;
  return PROJECT_OPENCLAW;
}

function resolveOpenClawConfig() {
  return readJsonConfig(resolveConfigPath()) || {};
}

function readGatewayToken() {
  const fromEnv = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  return resolveOpenClawConfig()?.gateway?.auth?.token || '';
}

function gatewayWsUrl() {
  const fromEnv = (process.env.OPENCLAW_GATEWAY_URL || '').trim();
  if (fromEnv) return fromEnv;
  const port = resolveOpenClawConfig()?.gateway?.port ?? 18789;
  return `ws://127.0.0.1:${port}`;
}

function openclawBin() {
  const local = path.join(REPO_ROOT, 'node_modules', '.bin', 'openclaw');
  return fs.existsSync(local) ? local : 'openclaw';
}

function openclawEnv() {
  const configPath = resolveConfigPath();
  return {
    ...process.env,
    FORCE_COLOR: '0',
    OPENCLAW_CONFIG: configPath,
    OPENCLAW_CONFIG_PATH: configPath,
  };
}

function parseCliJson(stdout) {
  const combined = String(stdout || '').trim();
  if (!combined) return null;

  const firstBrace = combined.indexOf('{');
  const lastBrace = combined.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(combined.slice(firstBrace, lastBrace + 1));
    } catch {
      /* try line-by-line */
    }
  }

  const lines = combined.split('\n').filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{') || line.startsWith('[')) {
      try {
        return JSON.parse(line);
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

/** OpenClaw CLI sometimes wraps the payload in { message: "<json string>" } or { result }. */
function unwrapGatewayPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.channelAccounts || raw.channels || raw.ok === true) return raw;
  if (raw.result && typeof raw.result === 'object') return raw.result;
  if (raw.payload && typeof raw.payload === 'object') return raw.payload;
  const msg = raw.message;
  if (typeof msg === 'string') {
    const trimmed = msg.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        /* keep raw */
      }
    }
  }
  return raw;
}

async function approvePendingGatewayDevice(requestId) {
  const token = readGatewayToken();
  // Omit --url so OpenClaw uses loopback defaults and can apply pending approvals
  // via local ~/.openclaw/devices/*.json when the CLI lacks operator.pairing scope.
  const args = ['devices', 'approve', '--json', '--timeout', '20000'];
  if (requestId) args.push(String(requestId));
  else args.push('--latest');
  if (token) args.push('--token', token);

  const { stdout, stderr } = await execFileAsync(openclawBin(), args, {
    cwd: REPO_ROOT,
    maxBuffer: 1024 * 1024,
    env: openclawEnv(),
    timeout: 25000,
  });
  const parsed = parseCliJson(stdout);
  if (parsed) return parsed;
  const combined = `${stdout || ''}\n${stderr || ''}`.trim();
  return combined ? { message: combined } : { ok: true };
}

function readPendingDeviceRequestIds() {
  const pendingPath = path.join(process.env.HOME || '', '.openclaw', 'devices', 'pending.json');
  try {
    const data = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    return Object.keys(data || {});
  } catch {
    return [];
  }
}

async function ensureGatewayOperatorScopes() {
  const ids = readPendingDeviceRequestIds();
  if (ids.length === 0) return { approved: false, reason: 'no-pending' };

  let last = null;
  for (const id of ids) {
    try {
      last = await approvePendingGatewayDevice(id);
    } catch (err) {
      last = { error: String(err.message || err) };
    }
  }

  const stillPending = readPendingDeviceRequestIds();
  if (stillPending.length > 0) {
    try {
      const { approvePendingGatewayDeviceLocal } = require('./approve-openclaw-device-local');
      const local = approvePendingGatewayDeviceLocal();
      return { approved: true, pending: ids, result: last, local };
    } catch (localErr) {
      return { approved: false, pending: stillPending, result: last, localError: String(localErr.message || localErr) };
    }
  }

  return { approved: true, pending: ids, result: last };
}

function isGatewayPairingError(err) {
  const msg = String(err?.message || err || '');
  return /pairing required|scope upgrade/i.test(msg);
}

async function gatewayCall(method, params = {}, timeoutMs = 120000) {
  const token = readGatewayToken();
  const url = gatewayWsUrl();
  const args = [
    'gateway',
    'call',
    method,
    '--json',
    '--params',
    JSON.stringify(params),
    '--timeout',
    String(timeoutMs),
    '--url',
    url,
  ];
  if (token) args.push('--token', token);

  const { stdout, stderr } = await execFileAsync(openclawBin(), args, {
    cwd: REPO_ROOT,
    maxBuffer: 4 * 1024 * 1024,
    env: openclawEnv(),
    timeout: timeoutMs + 5000,
  });

  const parsed = parseCliJson(stdout) || parseCliJson(stderr);
  const unwrapped = unwrapGatewayPayload(parsed);
  if (unwrapped && (unwrapped.channelAccounts || unwrapped.channels || unwrapped.ok != null)) {
    return unwrapped;
  }
  if (parsed) return unwrapGatewayPayload(parsed) ?? parsed;
  const combined = `${stdout || ''}\n${stderr || ''}`.trim();
  const fromCombined = parseCliJson(combined);
  const fromCombinedUnwrapped = unwrapGatewayPayload(fromCombined);
  if (fromCombinedUnwrapped?.channelAccounts || fromCombinedUnwrapped?.channels) {
    return fromCombinedUnwrapped;
  }
  return combined ? { message: combined } : {};
}

function isGatewayConfigured() {
  return Boolean(readGatewayToken() || resolveOpenClawConfig()?.gateway?.port);
}

async function isGatewayReachable() {
  if (!isGatewayConfigured()) return false;
  try {
    await gatewayCall('health', {}, 8000);
    return true;
  } catch (err) {
    const msg = String(err.message || err);
    if (/protocol mismatch/i.test(msg)) return false;
    return false;
  }
}

async function gatewayChannelsStatus() {
  return gatewayCall('channels.status', {}, 30000);
}

function parseWhatsAppGatewayAccount(statusJson) {
  if (!statusJson || statusJson.error) return null;
  const channel = statusJson.channels?.whatsapp || {};
  const accounts = statusJson.channelAccounts?.whatsapp;
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (!account) return null;

  const statusState = String(account.statusState || channel.statusState || '');
  const lastDisconnect = account.lastDisconnect || channel.lastDisconnect || null;
  const loggedOut = Boolean(lastDisconnect?.loggedOut);
  const linked =
    Boolean(account.linked) ||
    channel.linked === true ||
    statusState === 'linked';
  const running =
    Boolean(account.running) ||
    channel.running === true ||
    account.healthState === 'running' ||
    channel.healthState === 'running' ||
    statusState === 'running';
  const connected =
    !loggedOut && (linked || running || Boolean(account.connected) || channel.connected === true);

  const lastError =
    (account.lastError && account.lastError !== 'null' ? account.lastError : null) ||
    (channel.lastError && channel.lastError !== 'null' ? channel.lastError : null) ||
    (loggedOut && lastDisconnect?.error ? String(lastDisconnect.error) : null);

  const phone =
    account.phone ||
    account.e164 ||
    channel.self?.e164 ||
    null;

  const lastConnectedAtMs =
    account.lastConnectedAt || channel.lastConnectedAt || null;

  return {
    accountId: account.accountId || 'default',
    linked: linked && !loggedOut,
    running: running && !loggedOut,
    connected,
    configured: account.configured !== false && channel.configured !== false,
    lastError,
    phone,
    loggedOut,
    statusState,
    lastConnectedAtMs,
    restartPending: Boolean(account.restartPending),
  };
}

function parsePhoneFromGatewayText(text) {
  const m = String(text || '').match(/\+\d{10,15}/);
  return m ? m[0] : null;
}

function readWhatsAppCredsJson() {
  const candidates = [
    path.join(WA_CREDS_DIR, 'default', 'creds.json'),
    path.join(WA_CREDS_DIR, 'creds.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      /* next */
    }
  }
  return null;
}

function hasWhatsAppSessionCreds() {
  const creds = readWhatsAppCredsJson();
  return Boolean(creds?.me?.id || creds?.registered);
}

function readWhatsAppSelfJid() {
  const creds = readWhatsAppCredsJson();
  const id = creds?.me?.id;
  return id ? String(id) : null;
}

function readPhoneFromWhatsAppCreds() {
  const creds = readWhatsAppCredsJson();
  if (!creds) return null;
  if (creds.me?.id) {
    const digits = String(creds.me.id).split('@')[0].replace(/\D/g, '');
    if (digits.length >= 10) return `+${digits}`;
  }
  return null;
}

async function ensureWhatsAppChannelRunning(accountId = 'default') {
  if (!isGatewayConfigured()) throw new Error('OpenClaw gateway not configured');
  if (!(await isGatewayReachable())) {
    throw new Error('OpenClaw gateway not running. Run: node server/run-openclaw-gateway.js');
  }
  const st = await gatewayChannelsStatus();
  const wa = parseWhatsAppGatewayAccount(st);
  if (wa?.loggedOut) {
    const err = new Error(
      wa.lastError ||
        'WhatsApp session logged out on gateway (scan QR again — avoid duplicate Linked devices).'
    );
    err.code = 'WHATSAPP_LOGGED_OUT';
    throw err;
  }
  if (wa?.running && (wa.connected || wa.linked)) return wa;
  await gatewayCall('channels.start', { channel: 'whatsapp', accountId }, 60000);
  const st2 = await gatewayChannelsStatus();
  return parseWhatsAppGatewayAccount(st2);
}

async function gatewayLogoutWhatsApp(accountId = 'default') {
  return gatewayCall('channels.logout', { channel: 'whatsapp', accountId }, 60000);
}

async function gatewaySendWhatsApp({ to, text, accountId = 'default' }) {
  const target = String(to || '').trim();
  const body = String(text || '').trim();
  if (!target || !body) throw new Error('to and text required for WhatsApp send');

  const targets = [...new Set([target, target.replace(/^\+/, ''), target.startsWith('+') ? target : `+${target}`])];
  const jid = readWhatsAppSelfJid();
  if (jid) targets.push(jid.split('@')[0]);

  let lastErr = null;
  for (const t of targets) {
    if (!t) continue;
    try {
      const { stdout, stderr } = await execFileAsync(
        openclawBin(),
        [
          'message',
          'send',
          '--channel',
          'whatsapp',
          '--account',
          accountId,
          '--target',
          t,
          '--message',
          body,
          '--json',
        ],
        {
          cwd: REPO_ROOT,
          maxBuffer: 2 * 1024 * 1024,
          env: openclawEnv(),
          timeout: 90000,
        }
      );
      const parsed = parseCliJson(stdout);
      if (parsed) return parsed;
      const errText = String(stderr || stdout || '').trim();
      if (!errText || /sent|ok|success/i.test(errText)) return { ok: true };
      lastErr = new Error(errText);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('WhatsApp send failed');
}

function normalizeGatewayLoginResult(raw) {
  const base = unwrapGatewayPayload(raw?.result ?? raw?.payload ?? raw) ?? {};
  if (base.qrDataUrl || base.connected != null) return base;
  const msg = base.message;
  if (typeof msg === 'string' && msg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(msg);
      return { ...base, ...parsed, message: parsed.message || base.message };
    } catch {
      /* keep base */
    }
  }
  return base;
}

function getGatewayDiagnostics() {
  return {
    configPath: resolveConfigPath(),
    configExists: fs.existsSync(resolveConfigPath()),
    projectConfig: PROJECT_OPENCLAW,
    wsUrl: gatewayWsUrl(),
    hasToken: Boolean(readGatewayToken()),
    hasWhatsAppCreds: hasWhatsAppSessionCreds(),
  };
}

module.exports = {
  gatewayCall,
  unwrapGatewayPayload,
  approvePendingGatewayDevice,
  ensureGatewayOperatorScopes,
  isGatewayPairingError,
  normalizeGatewayLoginResult,
  isGatewayConfigured,
  isGatewayReachable,
  gatewayChannelsStatus,
  parseWhatsAppGatewayAccount,
  parsePhoneFromGatewayText,
  readWhatsAppCredsJson,
  hasWhatsAppSessionCreds,
  readWhatsAppSelfJid,
  readPhoneFromWhatsAppCreds,
  ensureWhatsAppChannelRunning,
  gatewayLogoutWhatsApp,
  gatewaySendWhatsApp,
  readGatewayToken,
  gatewayWsUrl,
  resolveOpenClawConfig,
  resolveConfigPath,
  getGatewayDiagnostics,
  PROJECT_OPENCLAW,
  HOME_OPENCLAW,
};
