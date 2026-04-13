import api from './api';
import type {
  MemoriesAlbumComment,
  MemoriesEvent,
  MemoriesImage,
  MemoriesImageGroup,
  MemoriesPrivacy,
} from '../features/memories/types';
import { randomToken } from '../features/memories/utils';
import imageService, { type UploadResponse } from './imageService';
import toast from 'react-hot-toast';

type ApiEvent = Record<string, any>;

/** Map one API image object to `MemoriesImage` (used by event list + image groups). */
export function mapMemoriesApiImage(x: any): MemoriesImage {
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

function mapAlbumComment(c: any): MemoriesAlbumComment | undefined {
  if (!c || typeof c !== 'object') return undefined;
  const text = String(c.text ?? '').trim();
  if (!text) return undefined;
  return {
    id: String(c.id ?? `c_${Math.random().toString(36).slice(2)}`),
    text,
    createdAt: String(c.createdAt ?? new Date().toISOString()),
    ...(c.userId != null && Number.isFinite(Number(c.userId)) ? { userId: Number(c.userId) } : {}),
    ...(c.userName != null ? { userName: String(c.userName) } : {}),
    ...(c.displayName != null ? { displayName: String(c.displayName) } : {}),
  };
}

/** Map API `imageGroups[]` entry (share batch + album note). */
export function mapMemoriesImageGroupFromApi(g: any): MemoriesImageGroup {
  const imgs = Array.isArray(g?.images)
    ? g.images.map(mapMemoriesApiImage).filter((i) => i.thumbUrl || i.hdUrl)
    : [];
  const ac = mapAlbumComment(g?.comment);
  return {
    shareId:
      g?.shareId == null || g?.shareId === ''
        ? null
        : Number.isFinite(Number(g.shareId))
          ? Number(g.shareId)
          : null,
    recipientEmail:
      g?.recipientEmail != null && String(g.recipientEmail).trim()
        ? String(g.recipientEmail)
        : null,
    recipientName:
      g?.recipientName != null && String(g.recipientName).trim()
        ? String(g.recipientName)
        : null,
    recipientMobile:
      g?.recipientMobile != null && String(g.recipientMobile).trim()
        ? String(g.recipientMobile)
        : null,
    images: imgs,
    ...(ac ? { comment: ac } : {}),
  };
}

export function flattenImagesFromGroups(imageGroups: MemoriesImageGroup[]): MemoriesImage[] {
  const seen = new Set<string>();
  const out: MemoriesImage[] = [];
  for (const g of imageGroups) {
    for (const im of g.images) {
      if (seen.has(im.id)) continue;
      seen.add(im.id);
      out.push(im);
    }
  }
  return out;
}

const authHeader = (bearerToken?: string) =>
  bearerToken?.trim() ? { Authorization: `Bearer ${bearerToken.trim()}` } : undefined;

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
  const groupsRaw = Array.isArray(ev?.imageGroups) ? ev.imageGroups : [];
  const imageGroups = groupsRaw.map(mapMemoriesImageGroupFromApi).filter((g) => g.images.length > 0);
  const imagesFlat = Array.isArray(imagesRaw)
    ? imagesRaw.map(mapMemoriesApiImage).filter((i) => i.thumbUrl || i.hdUrl)
    : [];
  const images = imageGroups.length > 0 ? flattenImagesFromGroups(imageGroups) : imagesFlat;

  return {
    id: String(ev?.id ?? ev?.eventId ?? ''),
    slug: String(ev?.slug ?? ev?.id ?? ev?.eventId ?? ''),
    name: String(ev?.name ?? ev?.title ?? 'Event'),
    dateTime: String(ev?.dateTime ?? ev?.startsAt ?? ev?.date ?? new Date().toISOString()),
    location: String(ev?.location ?? ev?.venue ?? ''),
    description:
      ev?.description != null && String(ev.description).trim()
        ? String(ev.description).trim()
        : ev?.details != null && String(ev.details).trim()
          ? String(ev.details).trim()
          : undefined,
    summary:
      ev?.summary != null && String(ev.summary).trim()
        ? String(ev.summary).trim()
        : ev?.subtitle != null && String(ev.subtitle).trim()
          ? String(ev.subtitle).trim()
          : undefined,
    eventType:
      ev?.eventType != null && String(ev.eventType).trim()
        ? String(ev.eventType).trim()
        : ev?.type != null && String(ev.type).trim()
          ? String(ev.type).trim()
          : ev?.eventCategory != null && String(ev.eventCategory).trim()
            ? String(ev.eventCategory).trim()
            : undefined,
    coverImageUrl: ev?.coverImageUrl != null ? String(ev.coverImageUrl) : undefined,
    accessToken: pickAccessToken(ev),
    createdAt: String(ev?.createdAt ?? new Date().toISOString()),
    updatedAt: String(ev?.updatedAt ?? new Date().toISOString()),
    views: Number(ev?.views ?? 0) || 0,
    images,
    ...(imageGroups.length > 0 ? { imageGroups } : {}),
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

export async function getMemoriesEventById(
  id: string,
  opts?: { accessToken?: string; shareId?: string }
): Promise<MemoriesEvent | null> {
  try {
    const t = opts?.accessToken?.trim();
    const sid = opts?.shareId?.trim();
    const params: Record<string, string> = {};
    if (t) {
      params.t = t;
      params.token = t;
    }
    if (sid) params.shareId = sid;
    const res = await api.get(`/api/memories/events/${encodeURIComponent(id)}`, {
      params: Object.keys(params).length ? params : undefined,
    });
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
  summary?: string;
  description?: string;
  eventType?: string;
}): Promise<MemoriesEvent> {
  const res = await api.post('/api/memories/events', {
    name: input.name,
    dateTime: input.dateTime,
    location: input.location,
    privacy: input.privacy ?? 'invite',
    ...(input.summary?.trim() ? { summary: input.summary.trim() } : {}),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.eventType?.trim() ? { eventType: input.eventType.trim() } : {}),
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

export async function addImagesToMemoriesEvent(eventId: string, imageIds: Array<number | string>,shareId?: string): Promise<void> {
  const ids = imageIds
    .map((x) => (typeof x === 'string' ? x.trim() : x))
    .filter((x) => x !== '' && x != null);
  await api.post(`/api/memories/events/${encodeURIComponent(eventId)}/images`, { imageIds: ids, shareId: shareId});
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
  shareId?: string | number,
  bearerToken?: string
): Promise<void> {
  const sid = shareId != null && String(shareId).trim() !== '' ? String(shareId).trim() : undefined;
  const url = `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/likes`;
  const headers = authHeader(bearerToken);
  await api.post(
    url,
    { delta, ...(sid ? { shareId: sid } : {}) },
    { params: sid ? { shareId: sid } : undefined, ...(headers ? { headers } : {}) }
  );
}

export async function addMemoriesEventImageComment(
  eventId: string,
  imageId: string,
  text: string,
  auth?: { bearerToken?: string; shareId?: string }
): Promise<{ id: string; text: string; createdAt: string }> {
  const sid = auth?.shareId?.trim();
  const res = await api.post(
    `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/comments`,
    { text },
    {
      params: sid ? { shareId: sid } : undefined,
      headers: authHeader(auth?.bearerToken),
    }
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
  imageId: string,
  auth?: { bearerToken?: string; shareId?: string }
): Promise<Array<{ id: string; text: string; createdAt: string; userId?: number; userName?: string; displayName?: string }>> {
  const sid = auth?.shareId?.trim();
  const params = sid ? { shareId: sid } : undefined;
  const headers = authHeader(auth?.bearerToken);
  const res = await api.get(
    `/api/memories/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}/comments`,
    { params, ...(headers ? { headers } : {}) }
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

/**
 * ID used for `/api/memories/events/.../images/{imageId}/...` must match the **image row**
 * returned by `/api/images/upload` (usually `response.image.id`), not the S3 file row
 * (`cloudUploads.s3.id`) — those can differ and cause 404 on comments.
 */
function pickUploadedImageId(res: UploadResponse): string | null {
  const tryPick = (raw: unknown): string | null => {
    if (raw == null) return null;
    const s = String(raw).trim();
    return s.length > 0 ? s : null;
  };
  // Prefer canonical Image entity id from upload payload (same id the event gallery uses).
  const fromImage = tryPick(res.image?.id);
  if (fromImage) return fromImage;
  const fromTop = tryPick(res.id);
  if (fromTop) return fromTop;
  const s3 = res.cloudUploads?.s3?.id;
  return tryPick(s3);
}

/**
 * Register guest upload metadata after each successful `/api/images/upload`.
 * POST /api/memories/events/{eventId}/image
 */
export async function postMemoriesEventImageUploadDetails(
  eventId: string,
  body: { imageId: number | string},
  opts?: { bearerToken?: string }
): Promise<string | undefined> {
  const res = await api.post(
    `/api/memories/events/${encodeURIComponent(eventId)}/images`,
    body,
    { headers: authHeader(opts?.bearerToken) }
  );
  const d = res.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== 'object') return undefined;
  const raw =
    (d as { imageId?: unknown }).imageId ??
    (d as { image?: { id?: unknown } }).image?.id ??
    (d as { id?: unknown }).id;
  if (raw == null) return undefined;
  const s = String(raw).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Guest uploads: `POST /api/images/upload` per file. If the guest entered a note, then
 * `POST .../image` and `POST .../images/{imageId}/comments` with the same text
 * (Bearer = share link `t` when not logged in).
 */
export async function guestUploadToMemoriesEvent(input: {
  eventId: string;
  files: File[];
  note?: string;
  token?: string;
  shareId?: string;
}): Promise<void> {
  if (!input.files.length) return;
  const bearer = input.token?.trim() || undefined;
  const text = input.note?.trim() ?? '';

  for (const file of input.files) {
    const res = await imageService.uploadImage(file, { bearerToken: bearer });
    const imageId:any = res.id
    console.log('imageId', imageId);
    if (imageId == null) {
      throw new Error('Upload succeeded but no image id was returned');
    }
     await addImagesToMemoriesEvent( input.eventId, [imageId],input.shareId)
        .then(() => {
          toast.success(`✓ Added image to event`);
        })
        .catch((err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to add images to event';
          toast.error(msg);
        });
    if (text) {
      await addMemoriesEventImageComment(input.eventId, String(imageId), text, {
        bearerToken: bearer,
      });
    }
  }
}

