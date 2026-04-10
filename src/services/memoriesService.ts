import api from './api';
import type { MemoriesEvent, MemoriesImage, MemoriesPrivacy } from '../features/memories/types';
import { randomToken } from '../features/memories/utils';

type ApiEvent = Record<string, any>;

function mapImage(x: any): MemoriesImage {
  const likedByUserIdsRaw = Array.isArray(x?.likedByUserIds) ? x.likedByUserIds : [];
  const likedByUserIds = likedByUserIdsRaw
    .map((n: any) => Number(n))
    .filter((n: any) => Number.isFinite(n));
  return {
    id: String(x?.id ?? x?.imageId ?? `img_${Math.random().toString(36).slice(2)}`),
    thumbUrl: String(x?.thumbUrl ?? x?.thumbnailUrl ?? x?.previewUrl ?? x?.hdUrl ?? ''),
    hdUrl: String(x?.hdUrl ?? x?.fullUrl ?? x?.downloadUrl ?? x?.thumbUrl ?? ''),
    likes: Number(x?.likes ?? x?.likeCount ?? 0) || 0,
    comments: Array.isArray(x?.comments)
      ? x.comments
          .map((c: any) => ({
            id: String(c?.id ?? `c_${Math.random().toString(36).slice(2)}`),
            text: String(c?.text ?? ''),
            createdAt: String(c?.createdAt ?? new Date().toISOString()),
          }))
          .filter((c: any) => c.text)
      : undefined,
    ...(likedByUserIds.length ? ({ likedByUserIds } as any) : {}),
  };
}

function pickAccessToken(ev: ApiEvent): string {
  const raw =
    ev?.accessToken ??
    ev?.token ??
    ev?.access_token ??
    ev?.shareToken ??
    ev?.galleryToken ??
    ev?.publicToken ??
    ev?.guestToken;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

function mapEvent(ev: ApiEvent): MemoriesEvent {
  const imagesRaw = Array.isArray(ev?.images) ? ev.images : Array.isArray(ev?.photos) ? ev.photos : [];
  const privacy = String(ev?.privacy ?? ev?.visibility ?? 'invite') as MemoriesPrivacy;
  return {
    id: String(ev?.id ?? ev?.eventId ?? ''),
    slug: String(ev?.slug ?? ev?.id ?? ev?.eventId ?? ''),
    name: String(ev?.name ?? ev?.title ?? 'Event'),
    dateTime: String(ev?.dateTime ?? ev?.startsAt ?? ev?.date ?? new Date().toISOString()),
    location: String(ev?.location ?? ev?.venue ?? ''),
    coverImageUrl: ev?.coverImageUrl != null ? String(ev.coverImageUrl) : undefined,
    accessToken: pickAccessToken(ev),
    createdAt: String(ev?.createdAt ?? new Date().toISOString()),
    updatedAt: String(ev?.updatedAt ?? new Date().toISOString()),
    views: Number(ev?.views ?? 0) || 0,
    images: Array.isArray(imagesRaw) ? imagesRaw.map(mapImage).filter((i) => i.thumbUrl || i.hdUrl) : [],
    sharedWithUserIds: Array.isArray(ev?.sharedWithUserIds)
      ? ev.sharedWithUserIds.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
      : undefined,
    // privacy is used by UI but not in current type; keep it attached for list pages that show lock/globe icon
    ...(privacy ? ({ privacy } as any) : {}),
  };
}

function normalizeList(data: unknown): ApiEvent[] {
  const d = data as Record<string, unknown>;
  const raw =
    (Array.isArray(d?.events) && d.events) ||
    (Array.isArray(d?.memoriesEvents) && d.memoriesEvents) ||
    (Array.isArray(d?.items) && d.items) ||
    (Array.isArray(data) ? data : []);
  return Array.isArray(raw) ? (raw as any[]) : [];
}

export async function listMemoriesEvents(): Promise<MemoriesEvent[]> {
  const res = await api.get('/api/memories/events');
  return normalizeList(res.data).map(mapEvent).filter((e) => Boolean(e.id));
}

export async function getMemoriesEventById(id: string): Promise<MemoriesEvent | null> {
  try {
    const res = await api.get(`/api/memories/events/${encodeURIComponent(id)}`);
    const d = res.data as any;
    const ev = (d?.event ?? d) as ApiEvent;
    const mapped = mapEvent(ev);
    return mapped?.id ? mapped : null;
  } catch {
    return null;
  }
}

export async function createMemoriesEvent(input: {
  name: string;
  dateTime: string;
  location: string;
  privacy?: MemoriesPrivacy;
}): Promise<MemoriesEvent> {
  const res = await api.post('/api/memories/events', {
    name: input.name,
    dateTime: input.dateTime,
    location: input.location,
    privacy: input.privacy,
  });
  const d = res.data as any;
  const ev = (d?.event ?? d) as ApiEvent;
  const mapped = mapEvent(ev);
  if (!mapped?.id) throw new Error('Invalid create event response');
  return mapped;
}

export async function updateMemoriesEvent(
  id: string,
  patch: Partial<{
    name: string;
    dateTime: string;
    location: string;
    coverImageUrl?: string;
    privacy?: MemoriesPrivacy;
    accessToken?: string;
  }>
): Promise<MemoriesEvent> {
  const res = await api.put(`/api/memories/events/${encodeURIComponent(id)}`, patch);
  const d = res.data as any;
  const ev = (d?.event ?? d) as ApiEvent;
  const mapped = mapEvent(ev);
  if (!mapped?.id) throw new Error('Invalid update event response');
  return mapped;
}

export async function deleteMemoriesEvent(id: string): Promise<void> {
  await api.delete(`/api/memories/events/${encodeURIComponent(id)}`);
}

export async function addImagesToMemoriesEvent(eventId: string, imageIds: Array<number | string>): Promise<void> {
  const ids = imageIds
    .map((x) => (typeof x === 'string' ? x.trim() : x))
    .filter((x) => x !== '' && x != null);
  await api.post(`/api/memories/events/${encodeURIComponent(eventId)}/images`, { imageIds: ids });
}

/** Share API requires a non-empty access token; mint and persist one if the event payload omitted it. */
export async function ensureMemoriesEventAccessTokenForShare(ev: MemoriesEvent): Promise<MemoriesEvent> {
  if (ev.accessToken?.trim()) return ev;
  return updateMemoriesEvent(ev.id, { accessToken: randomToken(24) });
}

export async function likeMemoriesEventImage(
  eventId: string,
  imageId: string,
  delta: 1 | -1 = 1,
  shareId?: string | number
): Promise<void> {
  const sid = shareId != null && String(shareId).trim() !== '' ? String(shareId).trim() : undefined;
  const url = `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/likes`;
  await api.post(url, { delta, ...(sid ? { shareId: sid } : {}) }, { params: sid ? { shareId: sid } : undefined });
}

export async function addMemoriesEventImageComment(
  eventId: string,
  imageId: string,
  text: string
): Promise<{ id: string; text: string; createdAt: string }> {
  const res = await api.post(
    `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/comments`,
    { text }
  );
  const d = res.data as any;
  const c = (d?.comment ?? d) as any;
  return {
    id: String(c?.id ?? `c_${Math.random().toString(36).slice(2)}`),
    text: String(c?.text ?? text),
    createdAt: String(c?.createdAt ?? new Date().toISOString()),
  };
}

export async function getMemoriesEventImageComments(
  eventId: string,
  imageId: string
): Promise<Array<{ id: string; text: string; createdAt: string; userId?: number; userName?: string; displayName?: string }>> {
  const res = await api.get(
    `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/comments`
  );
  const d = res.data as any;
  const raw = (Array.isArray(d?.comments) && d.comments) || (Array.isArray(d) ? d : []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c: any) => ({
      id: String(c?.id ?? `c_${Math.random().toString(36).slice(2)}`),
      text: String(c?.text ?? ''),
      createdAt: String(c?.createdAt ?? new Date().toISOString()),
      userId: c?.userId != null ? Number(c.userId) : undefined,
      userName: c?.userName != null ? String(c.userName) : undefined,
      displayName: c?.displayName != null ? String(c.displayName) : undefined,
    }))
    .filter((c: any) => c.text);
}

