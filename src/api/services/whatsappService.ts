import api from '../../api/client/axiosInstance';
import type { WhatsAppConfigValues } from '../../components/OmAiWhatsappConfig/WhatsAppConfigForm';

// ── Types ──────────────────────────────────────────────────────────────────

export type WhatsAppStatus = {
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  lastConnectedAt?: string | null;
  lastMessageAt?: string | null;
  authAgeMs?: number | null;
  lastError?: string | null;
};

export type WhatsAppLoginStartResponse = {
  message?: string;
  qrDataUrl?: string;
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
  const res = await api.get<WhatsAppStatus>('/api/whatsapp/status');
  return res.data;
}

/** Start WhatsApp QR login. Returns QR code data URL and message. */
export async function startWhatsAppLogin(force = false): Promise<WhatsAppLoginStartResponse> {
  const res = await api.post<WhatsAppLoginStartResponse>('/api/whatsapp/login/start', { force });
  return res.data;
}

/** Wait for WhatsApp QR scan to complete. */
export async function waitWhatsAppLogin(): Promise<WhatsAppLoginWaitResponse> {
  const res = await api.post<WhatsAppLoginWaitResponse>('/api/whatsapp/login/wait', {});
  return res.data;
}

/** Logout / unlink WhatsApp. */
export async function logoutWhatsApp(): Promise<{ message?: string }> {
  const res = await api.post<{ message?: string }>('/api/whatsapp/logout', {});
  return res.data;
}

/** Save WhatsApp channel configuration. */
export async function saveWhatsAppConfig(config: WhatsAppConfigValues): Promise<{ ok?: boolean; error?: string }> {
  const res = await api.post<{ ok?: boolean; error?: string }>('/api/whatsapp/config', config);
  return res.data;
}

/** Fetch current WhatsApp channel configuration. */
export async function getWhatsAppConfig(): Promise<WhatsAppConfigValues> {
  const res = await api.get<WhatsAppConfigValues>('/api/whatsapp/config');
  return res.data;
}

/** Fetch recent WhatsApp message log. */
export async function getWhatsAppMessages(params?: {
  limit?: number;
  before?: string;
}): Promise<WhatsAppLogEntry[]> {
  const res = await api.get<WhatsAppLogEntry[]>('/api/whatsapp/messages', { params });
  return res.data;
}

/** Send a test WhatsApp message. */
export async function sendWhatsAppMessage(params: {
  to: string;
  text: string;
}): Promise<{ ok?: boolean; messageId?: string; error?: string }> {
  const res = await api.post<{ ok?: boolean; messageId?: string; error?: string }>(
    '/api/whatsapp/send',
    params,
  );
  return res.data;
}
