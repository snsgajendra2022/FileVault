/**
 * Ensure OpenClaw agent can call openrouter/owl-alpha (WhatsApp gateway agent).
 * Uses OPENROUTER_API_KEY or OPENAI_API_KEY (OpenRouter sk-or-v1-...) from .env.
 */
const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.join(
  process.env.HOME || '',
  '.openclaw',
  'agents',
  'main',
  'agent'
);
const AUTH_FILE = path.join(AGENT_DIR, 'auth-profiles.json');

function resolveOpenRouterKey() {
  return (
    (process.env.OPENROUTER_API_KEY || '').trim() ||
    (process.env.OPENAI_API_KEY || '').trim()
  );
}

function syncOpenClawOpenRouterAuth() {
  const key = resolveOpenRouterKey();
  if (!key) {
    console.warn(
      '[openclaw-auth] No OPENROUTER_API_KEY or OPENAI_API_KEY — WhatsApp agent replies will fail.'
    );
    return { ok: false, error: 'missing_api_key' };
  }

  process.env.OPENROUTER_API_KEY = key;

  fs.mkdirSync(AGENT_DIR, { recursive: true });

  let store = { version: 1, profiles: {} };
  if (fs.existsSync(AUTH_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (!store.profiles || typeof store.profiles !== 'object') {
        store.profiles = {};
      }
    } catch {
      store = { version: 1, profiles: {} };
    }
  }

  store.profiles['openrouter:default'] = {
    type: 'api_key',
    provider: 'openrouter',
    key,
  };

  fs.writeFileSync(AUTH_FILE, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  return { ok: true, path: AUTH_FILE };
}

module.exports = { syncOpenClawOpenRouterAuth, resolveOpenRouterKey };
