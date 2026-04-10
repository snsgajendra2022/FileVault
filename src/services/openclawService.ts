import axios, { type AxiosInstance } from 'axios';
import api from './api';
import { openclawApiPaths, openclawDevBaseUrl } from '../config/openclaw';
import { pickNavigateToFromApi } from '../utils/openclawNavigation';

let openclawDevClient: AxiosInstance | null = null;

/** In dev, OpenClaw may run on a separate port (see server/openclaw-dev-server.js). */
function openclawClient(): AxiosInstance {
  const base = openclawDevBaseUrl;
  if (!base) return api;

  if (!openclawDevClient) {
    openclawDevClient = axios.create({
      baseURL: base.replace(/\/$/, ''),
      timeout: 60_000,
    });
    openclawDevClient.interceptors.request.use((config) => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  return openclawDevClient;
}

export type OpenClawChatRequest = {
  message: string;
  sessionId?: string;
  /** Optional UI context for the agent (e.g. current route, feature) */
  context?: Record<string, unknown>;
};

export type OpenClawChatResponse = {
  reply?: string;
  message?: string;
  text?: string;
  sessionId?: string;
  error?: string;
  /** If set (must be an app route the client allows), the UI will navigate here after showing the reply. */
  navigateTo?: string;
  navigation?: { path?: string };
};

export type OpenClawVoiceRequest = {
  transcript: string;
  sessionId?: string;
  context?: Record<string, unknown>;
};

export type OpenClawSessionResponse = {
  sessionId?: string;
  ok?: boolean;
  error?: string;
};

function pickReply(data: OpenClawChatResponse | null | undefined): string {
  if (!data || typeof data !== 'object') return '';
  const r = data.reply ?? data.message ?? data.text;
  return typeof r === 'string' ? r : '';
}

export async function openclawSendChat(body: OpenClawChatRequest): Promise<{
  reply: string;
  sessionId?: string;
  navigateTo: string | null;
  raw: unknown;
}> {
  const res = await openclawClient().post<OpenClawChatResponse>(openclawApiPaths.chat, body);
  return {
    reply: pickReply(res.data) || (res.data?.error ? String(res.data.error) : ''),
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(res.data),
    raw: res.data,
  };
}

export async function openclawSendVoice(body: OpenClawVoiceRequest): Promise<{
  reply: string;
  sessionId?: string;
  navigateTo: string | null;
  raw: unknown;
}> {
  const res = await openclawClient().post<OpenClawChatResponse>(openclawApiPaths.voice, body);
  return {
    reply: pickReply(res.data) || (res.data?.error ? String(res.data.error) : ''),
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(res.data),
    raw: res.data,
  };
}

export async function openclawUploadImage(params: {
  file: File;
  sessionId?: string;
  prompt?: string;
  /** Serialized JSON for the dev server / bridge (current route, open event, etc.). */
  context?: Record<string, unknown>;
}): Promise<{ reply: string; sessionId?: string; navigateTo: string | null; raw: unknown }> {
  const fd = new FormData();
  fd.append('file', params.file);
  if (params.sessionId) fd.append('sessionId', params.sessionId);
  if (params.prompt?.trim()) fd.append('prompt', params.prompt.trim());
  if (params.context && Object.keys(params.context).length > 0) {
    try {
      fd.append('context', JSON.stringify(params.context));
    } catch {
      /* ignore */
    }
  }

  const res = await openclawClient().post<OpenClawChatResponse>(openclawApiPaths.image, fd);
  return {
    reply: pickReply(res.data) || (res.data?.error ? String(res.data.error) : ''),
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(res.data),
    raw: res.data,
  };
}

export async function openclawCreateSession(): Promise<{ sessionId?: string; raw: unknown }> {
  const res = await openclawClient().post<OpenClawSessionResponse>(openclawApiPaths.session, {});
  return {
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    raw: res.data,
  };
}
