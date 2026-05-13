/**
 * OpenClaw integration — SPA talks to your API only; Gateway credentials stay on the server.
 * Paths are appended to REACT_APP_API_URL (see `src/services/api.ts`).
 */
export const openclawEnabled = process.env.REACT_APP_OPENCLAW_ENABLED === 'true';

/** e.g. http://localhost:9093 — OpenClaw routes hit this host; other API calls still use REACT_APP_API_URL. */
export const openclawDevBaseUrl = (process.env.REACT_APP_OPENCLAW_DEV_URL || '').trim() || undefined;

function withLeadingSlash(p: string): string {
  const s = p.trim();
  return s.startsWith('/') ? s : `/${s}`;
}

export const openclawApiPaths = {
  chat: withLeadingSlash(process.env.REACT_APP_OPENCLAW_CHAT_PATH || '/api/openclaw/chat'),
  voice: withLeadingSlash(process.env.REACT_APP_OPENCLAW_VOICE_PATH || '/api/openclaw/voice'),
  image: withLeadingSlash(process.env.REACT_APP_OPENCLAW_IMAGE_PATH || '/api/openclaw/image'),
  session: withLeadingSlash(process.env.REACT_APP_OPENCLAW_SESSION_PATH || '/api/openclaw/session'),
} as const;
