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

  const parsed = parseCliJson(stdout);
  if (parsed) return parsed;
  const combined = `${stdout || ''}\n${stderr || ''}`.trim();
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
  const accounts = statusJson.channelAccounts?.whatsapp;
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (!account) return null;
  const linked = Boolean(account.linked);
  const running = Boolean(account.running);
  const connected = linked || Boolean(account.connected);
  return {
    accountId: account.accountId || 'default',
    linked,
    running,
    connected,
    configured: account.configured !== false,
    lastError: account.lastError && account.lastError !== 'null' ? account.lastError : null,
    phone: account.phone || account.e164 || null,
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
  const base = raw?.result ?? raw?.payload ?? raw ?? {};
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
