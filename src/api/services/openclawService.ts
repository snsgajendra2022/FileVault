import axios, { type AxiosInstance } from 'axios';
import api from '../../api/client/axiosInstance';
import { openclawApiPaths, openclawDevBaseUrl } from '../../config/openclaw';
import { pickNavigateToFromApi } from '../../utils/openclawNavigation';
import { trackApiError, trackApiRequest, trackApiResponse } from '../../utils/openclawAssistantMonitor';

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
      const requestId = trackApiRequest(config as typeof config & { metadata?: Record<string, unknown> });
      (config as typeof config & { metadata?: Record<string, unknown> }).metadata = {
        ...((config as typeof config & { metadata?: Record<string, unknown> }).metadata || {}),
        requestId,
      };
      return config;
    });
    openclawDevClient.interceptors.response.use(
      (response) => {
        const requestId = (response.config as { metadata?: Record<string, unknown> })?.metadata?.requestId;
        if (typeof requestId === 'string') trackApiResponse(requestId, response);
        return response;
      },
      (error) => {
        const requestId = (error?.config as { metadata?: Record<string, unknown> })?.metadata?.requestId;
        if (typeof requestId === 'string') trackApiError(requestId, error);
        return Promise.reject(error);
      }
    );
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
  userId?: string;
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
  /** Optional controlled action(s) returned by backend/bridge. */
  action?: string;
  payload?: Record<string, unknown>;
  actions?: Array<{ id?: string; payload?: Record<string, unknown> }>;
};

export type OpenClawVoiceRequest = {
  transcript: string;
  sessionId?: string;
  userId?: string;
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
  action?: { id: string; payload?: Record<string, unknown> };
  actions?: Array<{ id: string; payload?: Record<string, unknown> }>;
  raw: unknown;
}> {
  const res = await openclawClient().post<OpenClawChatResponse>(openclawApiPaths.chat, body);
  const rawActions = Array.isArray(res.data?.actions) ? res.data.actions : undefined;
  const actions =
    rawActions
      ?.map((a) => ({
        id: typeof a?.id === 'string' ? a.id : '',
        payload: a?.payload && typeof a.payload === 'object' && !Array.isArray(a.payload) ? a.payload : undefined,
      }))
      .filter((a) => Boolean(a.id)) ?? undefined;
  const actionId = typeof res.data?.action === 'string' ? res.data.action : '';
  const actionPayload =
    res.data?.payload && typeof res.data.payload === 'object' && !Array.isArray(res.data.payload)
      ? res.data.payload
      : undefined;
  return {
    reply: pickReply(res.data) || (res.data?.error ? String(res.data.error) : ''),
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(res.data),
    ...(actionId ? { action: { id: actionId, ...(actionPayload ? { payload: actionPayload } : {}) } } : {}),
    ...(actions && actions.length > 0 ? { actions } : {}),
    raw: res.data,
  };
}

export async function openclawSendVoice(body: OpenClawVoiceRequest): Promise<{
  reply: string;
  sessionId?: string;
  navigateTo: string | null;
  action?: { id: string; payload?: Record<string, unknown> };
  actions?: Array<{ id: string; payload?: Record<string, unknown> }>;
  raw: unknown;
}> {
  const res = await openclawClient().post<OpenClawChatResponse>(openclawApiPaths.voice, body);
  const rawActions = Array.isArray(res.data?.actions) ? res.data.actions : undefined;
  const actions =
    rawActions
      ?.map((a) => ({
        id: typeof a?.id === 'string' ? a.id : '',
        payload: a?.payload && typeof a.payload === 'object' && !Array.isArray(a.payload) ? a.payload : undefined,
      }))
      .filter((a) => Boolean(a.id)) ?? undefined;
  const actionId = typeof res.data?.action === 'string' ? res.data.action : '';
  const actionPayload =
    res.data?.payload && typeof res.data.payload === 'object' && !Array.isArray(res.data.payload)
      ? res.data.payload
      : undefined;
  return {
    reply: pickReply(res.data) || (res.data?.error ? String(res.data.error) : ''),
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(res.data),
    ...(actionId ? { action: { id: actionId, ...(actionPayload ? { payload: actionPayload } : {}) } } : {}),
    ...(actions && actions.length > 0 ? { actions } : {}),
    raw: res.data,
  };
}

export async function openclawUploadImage(params: {
  file: File;
  sessionId?: string;
  userId?: string;
  uploadId?: string;
  onUploadProgress?: (progress: number) => void;
  prompt?: string;
  /** Serialized JSON for the dev server / bridge (current route, open event, etc.). */
  context?: Record<string, unknown>;
}): Promise<{
  reply: string;
  sessionId?: string;
  navigateTo: string | null;
  action?: { id: string; payload?: Record<string, unknown> };
  actions?: Array<{ id: string; payload?: Record<string, unknown> }>;
  raw: unknown;
}> {
  const fd = new FormData();
  fd.append('file', params.file);
  if (params.sessionId) fd.append('sessionId', params.sessionId);
  if (params.userId) fd.append('userId', params.userId);
  if (params.prompt?.trim()) fd.append('prompt', params.prompt.trim());
  if (params.context && Object.keys(params.context).length > 0) {
    try {
      fd.append('context', JSON.stringify(params.context));
    } catch {
      /* ignore */
    }
  }

  const res = await openclawClient().post<OpenClawChatResponse>(
    openclawApiPaths.image,
    fd,
    ({
      metadata: {
        ...(params.uploadId ? { uploadId: params.uploadId } : {}),
      },
      onUploadProgress: params.onUploadProgress
        ? (ev: { total?: number; loaded: number }) => {
            if (!ev.total || ev.total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
            params.onUploadProgress?.(pct);
          }
        : undefined,
    } as unknown as Record<string, unknown>)
  );
  const data = res.data as OpenClawChatResponse;
  const rawActions = Array.isArray(data?.actions) ? data.actions : undefined;
  const actions =
    rawActions
      ?.map((a) => ({
        id: typeof a?.id === 'string' ? a.id : '',
        payload: a?.payload && typeof a.payload === 'object' && !Array.isArray(a.payload) ? a.payload : undefined,
      }))
      .filter((a) => Boolean(a.id)) ?? undefined;
  const actionId = typeof data?.action === 'string' ? data.action : '';
  const actionPayload =
    data?.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload
      : undefined;
  return {
    reply: pickReply(data) || (data?.error ? String(data.error) : ''),
    sessionId: typeof data?.sessionId === 'string' ? data.sessionId : undefined,
    navigateTo: pickNavigateToFromApi(data),
    ...(actionId ? { action: { id: actionId, ...(actionPayload ? { payload: actionPayload } : {}) } } : {}),
    ...(actions && actions.length > 0 ? { actions } : {}),
    raw: data,
  };
}

export async function openclawCreateSession(): Promise<{ sessionId?: string; raw: unknown }> {
  const res = await openclawClient().post<OpenClawSessionResponse>(openclawApiPaths.session, {});
  return {
    sessionId: typeof res.data?.sessionId === 'string' ? res.data.sessionId : undefined,
    raw: res.data,
  };
}
