/**
 * FaceSync API client — all GET/POST/PATCH/DELETE go to REACT_APP_FACESYNC_API_URL
 * (e.g. http://192.168.1.9:8000). Restart `npm start` after changing .env.
 */

const FACESYNC_ENV_KEY = 'REACT_APP_FACESYNC_API_URL';

/** Base URL from .env, no trailing slash. Empty only if env unset (dev proxy fallback). */
export function getFaceSyncBaseUrl(): string {
  const raw = (process.env[FACESYNC_ENV_KEY] || '').trim();
  return raw.replace(/\/$/, '');
}

/** Build absolute API URL: `{REACT_APP_FACESYNC_API_URL}/api/...` */
export function apiUrl(path: string): string {
  const base = getFaceSyncBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** Prefix relative asset paths (`/api/album/photo/...`) with the FaceSync base URL. */
export function resolveFaceSyncUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return apiUrl(trimmed);
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

export function formatApiError(data: unknown, status?: number): string {
  if (!data || typeof data !== 'object') return String(data ?? status ?? 'Error');
  const d = (data as { detail?: unknown }).detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: string }).msg);
        return JSON.stringify(item);
      })
      .join('\n');
  }
  if (d != null) return JSON.stringify(d, null, 2);
  return JSON.stringify(data, null, 2);
}

export async function faceSyncFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(apiUrl(path), init);
  const data = await parseJson<T>(res);
  return { ok: res.ok, status: res.status, data };
}

export async function faceSyncGet<T = unknown>(path: string): Promise<T> {
  const { ok, status, data } = await faceSyncFetch<T>(path);
  if (!ok) throw new Error(formatApiError(data, status));
  return data;
}

export async function faceSyncPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { ok, status, data } = await faceSyncFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!ok) throw new Error(formatApiError(data, status));
  return data;
}

export async function faceSyncPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const { ok, status, data } = await faceSyncFetch<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!ok) throw new Error(formatApiError(data, status));
  return data;
}

export async function faceSyncDelete(path: string): Promise<void> {
  const { ok, status, data } = await faceSyncFetch(path, { method: 'DELETE' });
  if (!ok) throw new Error(formatApiError(data, status));
}

export function photoAssetUrl(person: string, filename: string): string {
  return resolveFaceSyncUrl(
    `/api/album/photo/${encodeURIComponent(person)}/${encodeURIComponent(filename)}`
  );
}

// --- API endpoints ---

export type FaceSyncPerson = {
  person_id: string;
  name?: string;
  count?: number;
  image_count?: number;
  maturity_level?: string;
  stability?: string;
  identity_locked?: boolean;
  locked?: boolean;
  suggested_name?: string;
  suggested_display_name?: string;
  pending_suggested_name?: string;
  average_age?: number;
  gender_distribution?: { male?: number; female?: number };
  duplicate_risk_score?: number;
  duplicate_risk_neighbor?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  preview_url?: string;
  url?: string;
  image_url?: string;
  original_url?: string;
};

export type FaceSyncPhoto = {
  person_id: string;
  filename: string;
  url?: string;
  thumbnail_url?: string;
  preview_url?: string;
  original_url?: string;
  image_url?: string;
  quality_score?: number;
  quality_level?: string;
  timestamp?: number;
};

export type PeopleListResponse = {
  people: FaceSyncPerson[];
  count?: number;
  unknown_count?: number;
  has_next?: boolean;
  page?: number;
};

export type PhotosListResponse = {
  photos: FaceSyncPhoto[];
  count?: number;
  has_next?: boolean;
  page?: number;
};

export type PersonDetail = FaceSyncPerson & {
  images?: Array<{ filename: string; url?: string; thumbnail_url?: string; preview_url?: string; quality_score?: number; quality_level?: string }>;
  identity_cohesion?: number;
  manual_age?: number;
  manual_gender?: string;
  needs_manual_age_review?: boolean;
  suggested_name_detail?: { confidence?: number; source?: string };
};

export type SuggestionItem = {
  suggestion_id: string;
  summary?: string;
  type?: string;
  persons?: string[];
  evidence?: Record<string, unknown>;
};

export function fetchPeople(params: {
  page?: number;
  per_page?: number;
  search?: string;
  filter?: string;
  sort?: string;
}): Promise<PeopleListResponse> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('per_page', String(params.per_page ?? 40));
  if (params.search) q.set('search', params.search);
  if (params.filter) q.set('filter', params.filter);
  if (params.sort) q.set('sort', params.sort);
  return faceSyncGet(`/api/people?${q}`);
}

export function fetchPhotos(params: {
  page?: number;
  per_page?: number;
  search?: string;
  person?: string;
  sort?: string;
}): Promise<PhotosListResponse> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('per_page', String(params.per_page ?? 40));
  if (params.search) q.set('search', params.search);
  if (params.person) q.set('person', params.person);
  if (params.sort) q.set('sort', params.sort);
  return faceSyncGet(`/api/photos?${q}`);
}

export function fetchPerson(personId: string): Promise<PersonDetail> {
  return faceSyncGet(`/api/person/${encodeURIComponent(personId)}`);
}

export function renamePerson(personId: string, name: string): Promise<unknown> {
  return faceSyncPost('/api/person/rename', { person_id: personId, name });
}

export function overrideDemographics(payload: {
  person_id: string;
  age?: number;
  gender?: string;
}): Promise<unknown> {
  return faceSyncPost('/api/person/override-demographics', payload);
}

export function mergePersons(payload: {
  source: string;
  target: string;
  force?: boolean;
  preview_only?: boolean;
  include_preview?: boolean;
}): Promise<Record<string, unknown>> {
  return faceSyncPost('/api/person/merge', {
    force: false,
    preview_only: false,
    include_preview: true,
    ...payload,
  });
}

export function fetchSuggestions(status = 'open'): Promise<{ items: SuggestionItem[] }> {
  return faceSyncGet(`/api/suggestions?status=${encodeURIComponent(status)}`);
}

export function dismissSuggestion(suggestionId: string): Promise<unknown> {
  return faceSyncPost(`/api/ops/suggestions/${encodeURIComponent(suggestionId)}/dismiss`, {
    note: 'ui_dismiss',
  });
}

export function acceptSuggestionQueue(suggestionId: string): Promise<unknown> {
  return faceSyncPost(`/api/ops/suggestions/${encodeURIComponent(suggestionId)}/accept`, {
    apply_merge: false,
    force_merge: false,
  });
}

export async function uploadImages(files: File[]): Promise<{
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
  text: string;
}> {
  const fd = new FormData();
  files.forEach((file) => fd.append('files', file, file.name));
  const res = await fetch(apiUrl('/upload-images'), { method: 'POST', body: fd });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body, text };
}

export function deletePhoto(personId: string, filename: string): Promise<void> {
  return faceSyncDelete(
    `/api/photos/${encodeURIComponent(personId)}/${encodeURIComponent(filename)}`
  );
}

export function renamePhoto(
  personId: string,
  filename: string,
  newName: string
): Promise<{ new_filename: string }> {
  return faceSyncPatch(
    `/api/photos/${encodeURIComponent(personId)}/${encodeURIComponent(filename)}`,
    { new_name: newName }
  );
}
