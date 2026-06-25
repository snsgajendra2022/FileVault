import axios, { type AxiosInstance } from 'axios';
import api from '../../api/client/axiosInstance';
import { getStoredUserData } from '../../utils/authUtils';
import type { WhatsAppConfigValues } from '../../components/OmAiWhatsappConfig/WhatsAppConfigForm';

/** Real WhatsApp QR comes from OpenClaw Gateway via dev server (9093), not Java fake QR. */
function whatsappClient(): AxiosInstance {
  const base =
    (process.env.REACT_APP_WHATSAPP_API_URL || process.env.REACT_APP_OPENCLAW_DEV_URL || '')
      .trim()
      .replace(/\/$/, '') || undefined;
  if (!base) return api;
  const client = axios.create({ baseURL: base, timeout: 120_000 });
  client.interceptors.request.use((config) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const userData = getStoredUserData();
    const userId = userData?.id != null ? String(userData.id) : null;
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    return config;
  });
  return client;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type WhatsAppStatus = {
  /** When false, inbound photos/text are ignored (no OM upload, no WhatsApp reply). */
  inboundOmEnabled?: boolean;
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  linkedPhoneE164?: string | null;
  welcomeSentAt?: string | null;
  omSetupComplete?: boolean;
  needsRelink?: boolean;
  hasWhatsAppCreds?: boolean;
  gatewayReachable?: boolean | null;
  gatewayLoggedOut?: boolean;
  gatewayStatusState?: string | null;
  omReady?: boolean;
  lastConnectedAt?: string | null;
  lastMessageAt?: string | null;
  authAgeMs?: number | null;
  lastError?: string | null;
  gateway?: {
    configPath?: string;
    wsUrl?: string;
    hasToken?: boolean;
    hasWhatsAppCreds?: boolean;
  };
  selfChatMode?: boolean;
};

export type WhatsAppLoginStartResponse = {
  message?: string;
  /** PNG data URL from backend (preferred for <img>). */
  qrDataUrl?: string | null;
  /** Raw QR text — frontend can render with react-qr-code if image missing. */
  qrPayload?: string | null;
  /** openclaw-gateway = real WhatsApp QR; dev-fallback = not scannable */
  source?: string;
  error?: string;
};

export type WhatsAppLoginWaitResponse = {
  message?: string;
  connected?: boolean;
};

export type WhatsAppConfig = {
  dmPolicy?: 'pairing' | 'allowlist' | 'open' | 'disabled';
  allowFrom?: string;
  groupPolicy?: 'open' | 'allowlist' | 'disabled';
  groupAllowFrom?: string;
  selfChatMode?: boolean;
  /** Logged-in user id scope for this session (multi-tenant). */
  userId?: string;
  textChunkLimit?: number;
  mediaMaxMb?: number;
  sendReadReceipts?: boolean;
  reactionLevel?: 'off' | 'ack' | 'minimal' | 'extensive';
  debounceMs?: number;
};

export type WhatsAppLogEntry = {
  id: string;
  direction: 'inbound' | 'outbound';
  from?: string;
  to?: string;
  text?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  timestamp: string;
  isGroup?: boolean;
};

// ── API calls ──────────────────────────────────────────────────────────────

/** Fetch current WhatsApp channel status from the backend. */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await whatsappClient().get<WhatsAppStatus>('/api/whatsapp/status');
  return res.data;
}

function pickLoginStartPayload(data: unknown): WhatsAppLoginStartResponse {
  if (!data || typeof data !== 'object') return {};
  const d = data as Record<string, unknown>;
  return {
    message: typeof d.message === 'string' ? d.message : undefined,
    qrDataUrl: typeof d.qrDataUrl === 'string' ? d.qrDataUrl : d.qrDataUrl === null ? null : undefined,
    qrPayload: typeof d.qrPayload === 'string' ? d.qrPayload : d.qrPayload === null ? null : undefined,
  };
}

/** Start WhatsApp QR login. Returns QR code data URL and message. */
export async function startWhatsAppLogin(force = false): Promise<WhatsAppLoginStartResponse> {
  try {
    const res = await whatsappClient().post('/api/whatsapp/login/start', { force });
    return pickLoginStartPayload(res.data);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
    const msg =
      ax.response?.data?.error ||
      ax.response?.data?.message ||
      ax.message ||
      'Failed to start WhatsApp login';
    throw new Error(msg);
  }
}

/** Wait for WhatsApp QR scan to complete. */
export async function waitWhatsAppLogin(): Promise<WhatsAppLoginWaitResponse> {
  const res = await whatsappClient().post<WhatsAppLoginWaitResponse>('/api/whatsapp/login/wait', {});
  return res.data;
}

/** Logout / unlink WhatsApp. */
export async function logoutWhatsApp(): Promise<{ message?: string }> {
  const res = await whatsappClient().post<{ message?: string }>('/api/whatsapp/logout', {});
  return res.data;
}

/** Save WhatsApp channel configuration. */
export async function saveWhatsAppConfig(config: WhatsAppConfigValues): Promise<{ ok?: boolean; error?: string }> {
  const res = await whatsappClient().post<{ ok?: boolean; error?: string }>('/api/whatsapp/config', config);
  return res.data;
}

/** Fetch current WhatsApp channel configuration. */
export async function getWhatsAppConfig(): Promise<WhatsAppConfigValues> {
  const res = await whatsappClient().get<WhatsAppConfigValues>('/api/whatsapp/config');
  return res.data;
}

/** Fetch recent WhatsApp message log. */
export async function getWhatsAppMessages(params?: {
  limit?: number;
  before?: string;
}): Promise<WhatsAppLogEntry[]> {
  const res = await whatsappClient().get<WhatsAppLogEntry[]>('/api/whatsapp/messages', { params });
  return res.data;
}

/** Send a test WhatsApp message. */
export async function sendWhatsAppMessage(params: {
  to: string;
  text: string;
}): Promise<{ ok?: boolean; messageId?: string; error?: string }> {
  const res = await whatsappClient().post<{ ok?: boolean; messageId?: string; error?: string }>(
    '/api/whatsapp/send',
    params,
  );
  return res.data;
}

/** Auto-setup OM on linked phone (allowlist, listener, welcome). */
export async function bootstrapOmWhatsApp(): Promise<
  WhatsAppStatus & { ok?: boolean; message?: string; error?: string; busy?: boolean }
> {
  const res = await whatsappClient().post('/api/whatsapp/bootstrap', {});
  return res.data;
}

/** Send arbitrary text to the linked phone (Message yourself). */
export async function sendOmWhatsAppToPhone(text: string): Promise<
  WhatsAppStatus & { ok?: boolean; error?: string }
> {
  const res = await whatsappClient().post('/api/whatsapp/send-to-phone', { text });
  return res.data;
}

/** Resend OM welcome to linked phone. */
export async function sendOmWhatsAppWelcome(): Promise<
  WhatsAppStatus & { ok?: boolean; error?: string }
> {
  const res = await whatsappClient().post('/api/whatsapp/welcome', {});
  return res.data;
}

/** Save studio JWT so WhatsApp OM can list/create via Filevault API. */
export async function linkWhatsAppAuth(phone?: string | null): Promise<{
  ok?: boolean;
  message?: string;
  error?: string;
}> {
  const res = await whatsappClient().post('/api/whatsapp/link-auth', {
    phone: phone || undefined,
  });
  return res.data;
}

export async function syncWhatsAppProject(params?: {
  phone?: string | null;
  notify?: boolean;
}): Promise<{
  ok?: boolean;
  snapshot?: {
    syncedAt?: string;
    counts?: { events?: number; albums?: number; images?: number; contacts?: number };
  };
  summary?: string;
  error?: string;
}> {
  const res = await whatsappClient().post('/api/whatsapp/sync-project', {
    phone: params?.phone || undefined,
    notify: params?.notify ?? false,
  });
  return res.data;
}

export async function getWhatsAppLinkAuthStatus(): Promise<{
  ok?: boolean;
  linked?: boolean;
  phone?: string | null;
  userId?: string;
}> {
  const res = await whatsappClient().get('/api/whatsapp/link-auth/status');
  return res.data;
}
