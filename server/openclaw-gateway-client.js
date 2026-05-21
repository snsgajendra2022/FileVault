/**
 * Call OpenClaw Gateway methods (e.g. web.login.start) via CLI.
 * Reads gateway port/token from filevault/.openclaw/openclaw.json then ~/.openclaw/openclaw.json.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const PROJECT_OPENCLAW = path.join(__dirname, '..', '.openclaw', 'openclaw.json');
const HOME_OPENCLAW = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

function readJsonConfig(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveOpenClawConfig() {
  return readJsonConfig(PROJECT_OPENCLAW) || readJsonConfig(HOME_OPENCLAW) || {};
}

function readGatewayToken() {
  const fromEnv = (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  const cfg = resolveOpenClawConfig();
  return cfg?.gateway?.auth?.token || '';
}

function gatewayWsUrl() {
  const fromEnv = (process.env.OPENCLAW_GATEWAY_URL || '').trim();
  if (fromEnv) return fromEnv;
  const cfg = resolveOpenClawConfig();
  const port = cfg?.gateway?.port ?? 18789;
  return `ws://127.0.0.1:${port}`;
}

function openclawBin() {
  const local = path.join(__dirname, '..', 'node_modules', '.bin', 'openclaw');
  return fs.existsSync(local) ? local : 'openclaw';
}

/**
 * Prefer project config so CLI and gateway use the same openclaw.json.
 */
function openclawEnv() {
  return {
    ...process.env,
    FORCE_COLOR: '0',
    OPENCLAW_CONFIG: process.env.OPENCLAW_CONFIG || PROJECT_OPENCLAW,
  };
}

/**
 * @param {string} method e.g. web.login.start | web.login.wait
 * @param {object} params
 * @param {number} timeoutMs
 */
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
  if (token) {
    args.push('--token', token);
  }

  const bin = openclawBin();
  const { stdout, stderr } = await execFileAsync(bin, args, {
    cwd: path.join(__dirname, '..'),
    maxBuffer: 4 * 1024 * 1024,
    env: openclawEnv(),
  });

  const combined = `${stdout || ''}\n${stderr || ''}`.trim();
  if (!combined) return {};

  const lines = combined.split('\n').filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{') || line.startsWith('[')) {
      try {
        return JSON.parse(line);
      } catch {
        /* try earlier line */
      }
    }
  }
  return { message: combined };
}

function isGatewayConfigured() {
  return Boolean(gatewayWsUrl());
}

/**
 * Gateway may return { message: "{ \"qrDataUrl\": ... }" } — unwrap for REST handlers.
 */
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

module.exports = {
  gatewayCall,
  normalizeGatewayLoginResult,
  isGatewayConfigured,
  readGatewayToken,
  gatewayWsUrl,
  resolveOpenClawConfig,
};
