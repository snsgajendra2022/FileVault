/**
 * Approve pending OpenClaw device scope upgrades on disk (local dev only).
 * Used when the CLI cannot connect to the gateway for device.pair.approve
 * (e.g. gateway down, or CLI only has operator.read).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEVICES_DIR = path.join(process.env.HOME || '', '.openclaw', 'devices');
const IDENTITY_PATH = path.join(process.env.HOME || '', '.openclaw', 'identity', 'device-auth.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function mergeScopes(...lists) {
  const scopes = new Set();
  for (const list of lists) {
    if (!list) continue;
    for (const scope of list) {
      const trimmed = String(scope || '').trim();
      if (trimmed) scopes.add(trimmed);
    }
  }
  return [...scopes];
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function approvePendingGatewayDeviceLocal() {
  const pendingPath = path.join(DEVICES_DIR, 'pending.json');
  const pairedPath = path.join(DEVICES_DIR, 'paired.json');
  const pendingById = readJson(pendingPath, {});
  const pairedByDeviceId = readJson(pairedPath, {});
  const requestIds = Object.keys(pendingById);
  if (requestIds.length === 0) {
    return { approved: false, reason: 'no-pending' };
  }

  const now = Date.now();
  const approvedIds = [];

  for (const requestId of requestIds) {
    const pending = pendingById[requestId];
    if (!pending?.deviceId) continue;

    const existing = pairedByDeviceId[pending.deviceId] || {};
    const approvedScopes = mergeScopes(existing.approvedScopes, existing.scopes, pending.scopes);
    const roles = [...new Set([...(existing.roles || []), ...(pending.roles || []), existing.role, pending.role].filter(Boolean))];
    const operatorScopes = approvedScopes.filter((s) => s.startsWith('operator.'));
    const tokenEntry = {
      token: newToken(),
      role: 'operator',
      scopes: operatorScopes.length ? operatorScopes : approvedScopes,
      createdAtMs: existing.tokens?.operator?.createdAtMs ?? now,
      rotatedAtMs: existing.tokens?.operator ? now : undefined,
    };

    pairedByDeviceId[pending.deviceId] = {
      ...existing,
      deviceId: pending.deviceId,
      publicKey: pending.publicKey,
      platform: pending.platform ?? existing.platform,
      clientId: pending.clientId ?? existing.clientId,
      clientMode: pending.clientMode ?? existing.clientMode,
      role: pending.role ?? existing.role ?? 'operator',
      roles: roles.length ? roles : ['operator'],
      scopes: approvedScopes,
      approvedScopes,
      tokens: {
        ...(existing.tokens || {}),
        operator: tokenEntry,
      },
      createdAtMs: existing.createdAtMs ?? now,
      approvedAtMs: now,
    };

    delete pendingById[requestId];
    approvedIds.push(requestId);

    const identity = readJson(IDENTITY_PATH, { version: 1, tokens: {} });
    if (identity.deviceId === pending.deviceId) {
      identity.tokens = identity.tokens || {};
      identity.tokens.operator = {
        token: tokenEntry.token,
        role: 'operator',
        scopes: tokenEntry.scopes,
        updatedAtMs: now,
      };
      writeJson(IDENTITY_PATH, identity);
    }
  }

  writeJson(pendingPath, pendingById);
  writeJson(pairedPath, pairedByDeviceId);

  return { approved: true, requestIds: approvedIds };
}

module.exports = { approvePendingGatewayDeviceLocal };

if (require.main === module) {
  const result = approvePendingGatewayDeviceLocal();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.approved ? 0 : 0);
}
