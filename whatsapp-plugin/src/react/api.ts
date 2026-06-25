import axios, { type AxiosInstance } from 'axios';
import type { WhatsAppAiConfig } from './context';

export type WaStatus = {
  connected?: boolean;
  linked?: boolean;
  running?: boolean;
  linkedPhoneE164?: string | null;
  omSetupComplete?: boolean;
  needsRelink?: boolean;
  gatewayReachable?: boolean | null;
  lastError?: string | null;
  selfChatMode?: boolean;
};

export type WaLogEntry = {
  id: string;
  direction: 'inbound' | 'outbound';
  from?: string;
  to?: string;
  text?: string;
  timestamp: string;
};

export type WaLoginStart = {
  message?: string;
  qrDataUrl?: string | null;
  qrPayload?: string | null;
  source?: string;
};

function resolveUserId(config: WhatsAppAiConfig): string | null {
  if (config.userId) return String(config.userId);
  if (typeof localStorage === 'undefined') return null;
  const phone = localStorage.getItem('waLinkedPhone');
  if (phone) return phone.replace(/\D/g, '');
  return null;
}

export function createWaClient(config: WhatsAppAiConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.apiUrl,
    timeout: 120_000,
  });
  client.interceptors.request.use((req) => {
    const token =
      config.authToken ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    if (token && !req.headers.Authorization) {
      req.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    const uid = resolveUserId(config);
    if (uid) req.headers['X-User-Id'] = uid;
    return req;
  });
  return client;
}

export async function waGetStatus(c: AxiosInstance): Promise<WaStatus> {
  const res = await c.get<WaStatus>('/api/whatsapp/status');
  return res.data;
}

export async function waStartLogin(c: AxiosInstance, force = false): Promise<WaLoginStart> {
  const res = await c.post('/api/whatsapp/login/start', { force });
  return res.data;
}

export async function waWaitLogin(c: AxiosInstance): Promise<{ connected?: boolean; message?: string }> {
  const res = await c.post('/api/whatsapp/login/wait', {});
  return res.data;
}

export async function waLogout(c: AxiosInstance): Promise<void> {
  await c.post('/api/whatsapp/logout', {});
}

export async function waBootstrap(c: AxiosInstance): Promise<{ ok?: boolean; message?: string }> {
  const res = await c.post('/api/whatsapp/bootstrap', {});
  return res.data;
}

export async function waMessages(c: AxiosInstance, limit = 50): Promise<WaLogEntry[]> {
  const res = await c.get<WaLogEntry[]>('/api/whatsapp/messages', { params: { limit } });
  return res.data;
}

export async function waLinkAuth(c: AxiosInstance, phone?: string | null): Promise<void> {
  await c.post('/api/whatsapp/link-auth', { phone: phone || undefined });
}

export async function waSyncProject(c: AxiosInstance, phone?: string | null): Promise<void> {
  await c.post('/api/whatsapp/sync-project', { phone: phone || undefined, notify: false });
}
