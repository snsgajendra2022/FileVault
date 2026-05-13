import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export type UploadStatus =
  | 'idle'
  | 'selected'
  | 'uploading'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type AssistantUploadItem = {
  id: string;
  uploadAreaId: string;
  uploadAreaLabel?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: UploadStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  errorMessage?: string;
  requestId?: string;
  apiUrl?: string;
  apiMethod?: string;
  responseStatus?: number;
  responseBodyPreview?: unknown;
  relatedRecordType?: string;
  relatedRecordId?: string;
};

export type AssistantApiCallStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export type AssistantApiCall = {
  id: string;
  method: string;
  url: string;
  path?: string;
  status: AssistantApiCallStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  requestHeadersPreview?: Record<string, string>;
  requestPayloadPreview?: unknown;
  responseStatus?: number;
  responsePayloadPreview?: unknown;
  errorMessage?: string;
  relatedUploadId?: string;
};

export type AssistantUiError = {
  id: string;
  type: 'javascript' | 'promise' | 'react' | 'validation' | 'toast' | 'network';
  message: string;
  stackPreview?: string;
  source?: string;
  line?: number;
  column?: number;
  createdAt: string;
};

const MAX_API_CALLS = 40;
const MAX_UI_ERRORS = 20;
const MAX_UPLOADS = 60;

const assistantUploadStore = {
  uploads: new Map<string, AssistantUploadItem>(),
};

const assistantNetworkStore = {
  calls: [] as AssistantApiCall[],
};

const assistantUiErrorStore = {
  errors: [] as AssistantUiError[],
  listenersInstalled: false,
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isSensitiveKey(k: string): boolean {
  return /authorization|cookie|token|accessToken|refreshToken|password|secret|api[-_]?key|bearer|session/i.test(k);
}

export function sanitizeApiHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (typeof v === 'string') out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (v != null) out[k] = String(v).slice(0, 200);
  }
  return out;
}

export function sanitizeApiPayload(payload: unknown, depth = 0): unknown {
  if (depth > 4) return undefined;
  if (payload == null) return payload;
  if (typeof payload === 'string') return payload.length > 1000 ? `${payload.slice(0, 1000)}…` : payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') return payload;
  if (typeof File !== 'undefined' && payload instanceof File) {
    return { type: 'File', name: payload.name, size: payload.size, mimeType: payload.type };
  }
  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    return { type: 'Blob', size: payload.size, mimeType: payload.type };
  }
  if (Array.isArray(payload)) return payload.slice(0, 20).map((v) => sanitizeApiPayload(v, depth + 1));
  if (typeof payload === 'object') {
    const src = payload as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (isSensitiveKey(k)) {
        out[k] = '[REDACTED]';
        continue;
      }
      out[k] = sanitizeApiPayload(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

export function trackApiRequest(configOrRequest: AxiosRequestConfig & { metadata?: Record<string, unknown> }): string {
  const id = newId();
  const startedAt = new Date().toISOString();
  const url = String(configOrRequest.url || '');
  const method = String(configOrRequest.method || 'GET').toUpperCase();
  const relatedUploadId =
    typeof configOrRequest.metadata?.uploadId === 'string' ? String(configOrRequest.metadata.uploadId) : undefined;
  assistantNetworkStore.calls.unshift({
    id,
    method,
    url,
    path: (() => {
      try {
        return new URL(url, window.location.origin).pathname;
      } catch {
        return url;
      }
    })(),
    status: 'pending',
    startedAt,
    requestHeadersPreview: sanitizeApiHeaders(configOrRequest.headers),
    requestPayloadPreview: sanitizeApiPayload((configOrRequest as { data?: unknown }).data),
    ...(relatedUploadId ? { relatedUploadId } : {}),
  });
  assistantNetworkStore.calls = assistantNetworkStore.calls.slice(0, MAX_API_CALLS);
  return id;
}

export function trackApiResponse(requestId: string, response: AxiosResponse): void {
  const now = Date.now();
  assistantNetworkStore.calls = assistantNetworkStore.calls.map((call) => {
    if (call.id !== requestId) return call;
    const startedAtMs = new Date(call.startedAt).getTime();
    return {
      ...call,
      status: 'success',
      completedAt: new Date().toISOString(),
      durationMs: Number.isFinite(startedAtMs) ? Math.max(0, now - startedAtMs) : undefined,
      responseStatus: response.status,
      responsePayloadPreview: sanitizeApiPayload(response.data),
    };
  });
}

export function trackApiError(requestId: string, error: unknown): void {
  const e = error as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
  const now = Date.now();
  assistantNetworkStore.calls = assistantNetworkStore.calls.map((call) => {
    if (call.id !== requestId) return call;
    const startedAtMs = new Date(call.startedAt).getTime();
    return {
      ...call,
      status: e?.code === 'ERR_CANCELED' ? 'cancelled' : 'failed',
      completedAt: new Date().toISOString(),
      durationMs: Number.isFinite(startedAtMs) ? Math.max(0, now - startedAtMs) : undefined,
      responseStatus: e?.response?.status,
      responsePayloadPreview: sanitizeApiPayload(e?.response?.data),
      errorMessage: typeof e?.message === 'string' ? e.message.slice(0, 280) : 'Request failed',
    };
  });
}

export function getRecentApiCallsSnapshot(limit = 8): AssistantApiCall[] {
  return assistantNetworkStore.calls.slice(0, Math.max(1, limit));
}

export function trackUiError(error: AssistantUiError): void {
  assistantUiErrorStore.errors.unshift(error);
  assistantUiErrorStore.errors = assistantUiErrorStore.errors.slice(0, MAX_UI_ERRORS);
}

export function getRecentUiErrorsSnapshot(limit = 8): AssistantUiError[] {
  return assistantUiErrorStore.errors.slice(0, Math.max(1, limit));
}

export function installAssistantErrorListeners(): void {
  if (assistantUiErrorStore.listenersInstalled || typeof window === 'undefined') return;
  assistantUiErrorStore.listenersInstalled = true;

  window.addEventListener('error', (ev) => {
    trackUiError({
      id: newId(),
      type: 'javascript',
      message: String(ev.message || 'JavaScript error'),
      stackPreview: ev.error?.stack ? String(ev.error.stack).slice(0, 1000) : undefined,
      source: ev.filename,
      line: ev.lineno,
      column: ev.colno,
      createdAt: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason as { message?: string; stack?: string } | string | undefined;
    const msg =
      typeof reason === 'string'
        ? reason
        : typeof reason?.message === 'string'
          ? reason.message
          : 'Unhandled promise rejection';
    trackUiError({
      id: newId(),
      type: 'promise',
      message: msg.slice(0, 260),
      stackPreview: typeof reason === 'object' && reason?.stack ? String(reason.stack).slice(0, 1000) : undefined,
      createdAt: new Date().toISOString(),
    });
  });
}

export function trackUploadSelected(params: {
  uploadAreaId: string;
  uploadAreaLabel?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  relatedRecordType?: string;
  relatedRecordId?: string;
}): string {
  const id = newId();
  assistantUploadStore.uploads.set(id, {
    id,
    uploadAreaId: params.uploadAreaId,
    uploadAreaLabel: params.uploadAreaLabel,
    fileName: params.fileName,
    fileSize: params.fileSize,
    fileType: params.fileType,
    status: 'selected',
    progress: 0,
    ...(params.relatedRecordType ? { relatedRecordType: params.relatedRecordType } : {}),
    ...(params.relatedRecordId ? { relatedRecordId: params.relatedRecordId } : {}),
  });
  clearOldUploadStatuses();
  return id;
}

export function trackUploadStarted(uploadId: string, meta?: Partial<AssistantUploadItem>): void {
  const current = assistantUploadStore.uploads.get(uploadId);
  if (!current) return;
  assistantUploadStore.uploads.set(uploadId, {
    ...current,
    ...(meta || {}),
    status: 'uploading',
    progress: Math.max(current.progress || 0, 1),
    startedAt: new Date().toISOString(),
  });
}

export function trackUploadProgress(uploadId: string, progress: number): void {
  const current = assistantUploadStore.uploads.get(uploadId);
  if (!current) return;
  assistantUploadStore.uploads.set(uploadId, {
    ...current,
    status: 'uploading',
    progress: Math.min(100, Math.max(0, Math.round(progress))),
  });
}

export function trackUploadSuccess(uploadId: string, response?: unknown): void {
  const current = assistantUploadStore.uploads.get(uploadId);
  if (!current) return;
  assistantUploadStore.uploads.set(uploadId, {
    ...current,
    status: 'success',
    progress: 100,
    completedAt: new Date().toISOString(),
    responseBodyPreview: sanitizeApiPayload(response),
  });
}

export function trackUploadFailed(uploadId: string, error: unknown): void {
  const current = assistantUploadStore.uploads.get(uploadId);
  if (!current) return;
  const e = error as { response?: { status?: number; data?: unknown }; message?: string };
  assistantUploadStore.uploads.set(uploadId, {
    ...current,
    status: 'failed',
    failedAt: new Date().toISOString(),
    errorMessage: typeof e?.message === 'string' ? e.message.slice(0, 240) : 'Upload failed',
    ...(typeof e?.response?.status === 'number' ? { responseStatus: e.response.status } : {}),
    ...(e?.response?.data ? { responseBodyPreview: sanitizeApiPayload(e.response.data) } : {}),
  });
}

export function trackUploadCancelled(uploadId: string): void {
  const current = assistantUploadStore.uploads.get(uploadId);
  if (!current) return;
  assistantUploadStore.uploads.set(uploadId, {
    ...current,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  });
}

export function getUploadStatusSnapshot(): AssistantUploadItem[] {
  return Array.from(assistantUploadStore.uploads.values()).slice(-MAX_UPLOADS).reverse();
}

export function clearOldUploadStatuses(): void {
  const values = Array.from(assistantUploadStore.uploads.values());
  if (values.length <= MAX_UPLOADS) return;
  values
    .sort((a, b) => {
      const at = new Date(a.completedAt || a.failedAt || a.cancelledAt || a.startedAt || 0).getTime();
      const bt = new Date(b.completedAt || b.failedAt || b.cancelledAt || b.startedAt || 0).getTime();
      return at - bt;
    })
    .slice(0, values.length - MAX_UPLOADS)
    .forEach((x) => assistantUploadStore.uploads.delete(x.id));
}

export function getNetworkStatusSnapshot(): { online: boolean; effectiveType?: string; downlink?: number; rtt?: number } {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  };
  return {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    ...(nav.connection?.effectiveType ? { effectiveType: nav.connection.effectiveType } : {}),
    ...(typeof nav.connection?.downlink === 'number' ? { downlink: nav.connection.downlink } : {}),
    ...(typeof nav.connection?.rtt === 'number' ? { rtt: nav.connection.rtt } : {}),
  };
}

