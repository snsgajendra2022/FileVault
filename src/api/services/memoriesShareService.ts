import api from '../client/axiosInstance';
import type { MemoriesEvent, MemoriesImage } from '../../features/memories/types';
import {
  flattenImagesFromGroups,
  getMemoriesEventById,
  mapMemoriesApiImage,
  mapMemoriesImageGroupFromApi,
} from './memoriesService';

/** Flattened user from GET /api/simple-invitations/family-relationships (same tree as Photo Studio album share). */
export type InvitableUser = {
  id: number;
  userId: number;
  fullName: string;
  email?: string;
  relation?: string;
};

function flattenFamilyRelationships(data: unknown): InvitableUser[] {
  const allMembers: InvitableUser[] = [];

  const toMember = (m: any): InvitableUser | null => {
    if (!m || (m.userId == null && m.id == null && !m.name && !m.email)) return null;
    const uid = Number(m.userId ?? m.id);
    if (!Number.isFinite(uid)) return null;
    const name = typeof m.name === 'string' ? m.name : '';
    const parts = name.trim().split(/\s+/);
    return {
      id: uid,
      userId: uid,
      fullName: name.trim() || m.email || `User ${uid}`,
      email: typeof m.email === 'string' ? m.email : undefined,
      relation: typeof m.relation === 'string' ? m.relation : undefined,
    };
  };

  const addMember = (m: any) => {
    const row = toMember(m);
    if (row) allMembers.push(row);
  };

  const addList = (list: any[]) => {
    if (!Array.isArray(list)) return;
    list.forEach((m: any) => {
      addMember(m);
      if (m?.clients?.length) addList(m.clients);
    });
  };

  const d = data as Record<string, unknown>;
  const fd = d?.familyData as Record<string, unknown> | undefined;
  if (fd && typeof fd === 'object') {
    if (fd.you) addMember(fd.you);
    addList((fd.parents as any[]) ?? []);
    addList((fd.siblings as any[]) ?? []);
    if (fd.spouse) addMember(fd.spouse);
    addList((fd.children as any[]) ?? []);
    addList((fd.grandparents as any[]) ?? []);
    addList((fd.unclesAunts as any[]) ?? []);
    addList((fd.cousins as any[]) ?? []);
    addList((fd.clients as any[]) ?? []);
  }
  if (Array.isArray(d?.clients) && allMembers.length === 0) addList(d.clients as any[]);

  return allMembers.filter(
    (c, i, self) => i === self.findIndex((x) => x.id === c.id)
  );
}

export async function fetchInvitableUsers(): Promise<InvitableUser[]> {
  const response = await api.get('/api/simple-invitations/family-relationships');
  return flattenFamilyRelationships(response.data);
}

/**
 * Share Our Memories event with invited users (same pattern as share-album).
 * Body: { eventId, slug, accessToken, clientIds } — all three identifiers must be non-empty for the server.
 */
export async function shareMemoriesEventWithClients(body: {
  eventId: string;
  slug: string;
  accessToken: string;
  clientIds: number[];
}): Promise<void> {
  const slug = body.slug.trim();
  const accessToken = body.accessToken.trim();
  const idNum = Number(body.eventId);
  const eventId = Number.isFinite(idNum) ? idNum : body.eventId;
  await api.post('/api/simple-invitations/share-memories-event', {
    eventId,
    slug,
    accessToken,
    clientIds: body.clientIds,
  });
}

export type SharedMemoriesEventRow = {
  eventId: string;
  slug: string;
  name: string;
  accessToken?: string;
  sharedByUserId?: number;
  sharedByUsername?: string;
  sharedByEmail?: string;
  sharedAt?: string;
};

function normalizeSharedList(data: unknown): SharedMemoriesEventRow[] {
  const d = data as Record<string, unknown>;
  const raw =
    (Array.isArray(d?.sharedMemoriesEvents) && d.sharedMemoriesEvents) ||
    (Array.isArray(d?.sharedEvents) && d.sharedEvents) ||
    (Array.isArray(d?.events) && d.events) ||
    (Array.isArray(data) ? data : []);
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => ({
    eventId: String(item.eventId ?? item.memoriesEventId ?? item.id ?? ''),
    slug: String(item.slug ?? ''),
    name: String(item.name ?? item.eventName ?? item.title ?? 'Event'),
    accessToken: item.accessToken != null ? String(item.accessToken) : undefined,
    sharedByUserId: item.sharedByUserId != null ? Number(item.sharedByUserId) : undefined,
    sharedByUsername: item.sharedByUsername != null ? String(item.sharedByUsername) : undefined,
    sharedByEmail: item.sharedByEmail != null ? String(item.sharedByEmail) : undefined,
    sharedAt: item.sharedAt != null ? String(item.sharedAt) : undefined,
  })).filter((r) => r.slug.length > 0);
}

export async function fetchSharedMemoriesEventsForMe(): Promise<SharedMemoriesEventRow[]> {
  const response = await api.get('/api/simple-invitations/shared-memories-events');
  return normalizeSharedList(response.data);
}

/** Guest/public load when event is not in local zustand (invited user on another device). */
export async function fetchGuestMemoriesEventBySlug(
  slug: string,
  token?: string,
  shareId?: string
): Promise<MemoriesEvent | null> {
  try {
    const bearer = token?.trim() || undefined;
    const sid = shareId?.trim() || undefined;
    const response = await api.get('/api/simple-invitations/memories-event-guest', {
      params: {
        slug,
        ...(sid ? { shareId: sid } : {}),
      },
      ...(bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {}),
    });
    const data = response.data as Record<string, unknown>;
    const ev = (data?.event ?? data) as Record<string, unknown>;
    if (!ev || typeof ev !== 'object') return null;
    const slugOut = String(ev.slug ?? slug);
    const imagesRaw = (Array.isArray(ev.images) ? ev.images : data.images) as any[];
    const imagesFlat: MemoriesImage[] = Array.isArray(imagesRaw)
      ? imagesRaw.map(mapMemoriesApiImage).filter((i) => i.thumbUrl || i.hdUrl)
      : [];
    const groupsRaw = Array.isArray(ev.imageGroups) ? ev.imageGroups : [];
    const imageGroups = groupsRaw.map(mapMemoriesImageGroupFromApi).filter((g) => g.images.length > 0);
    const images: MemoriesImage[] =
      imageGroups.length > 0 ? flattenImagesFromGroups(imageGroups) : imagesFlat;
    const desc =
      ev.description != null && String(ev.description).trim()
        ? String(ev.description).trim()
        : ev.details != null && String(ev.details).trim()
          ? String(ev.details).trim()
          : undefined;
    const summ =
      ev.summary != null && String(ev.summary).trim()
        ? String(ev.summary).trim()
        : ev.subtitle != null && String(ev.subtitle).trim()
          ? String(ev.subtitle).trim()
          : undefined;
    const eventTypeRaw =
      ev.eventType != null && String(ev.eventType).trim()
        ? String(ev.eventType).trim()
        : ev.type != null && String(ev.type).trim()
          ? String(ev.type).trim()
          : ev.eventCategory != null && String(ev.eventCategory).trim()
            ? String(ev.eventCategory).trim()
            : undefined;
    return {
      id: String(ev.id ?? ev.eventId ?? `remote_${slugOut}`),
      slug: slugOut,
      name: String(ev.name ?? 'Event'),
      dateTime: String(ev.dateTime ?? ev.startsAt ?? new Date().toISOString()),
      location: String(ev.location ?? ''),
      ...(desc ? { description: desc } : {}),
      ...(summ ? { summary: summ } : {}),
      ...(eventTypeRaw ? { eventType: eventTypeRaw } : {}),
      coverImageUrl: ev.coverImageUrl != null ? String(ev.coverImageUrl) : undefined,
      accessToken: String(ev.accessToken ?? token ?? ''),
      createdAt: String(ev.createdAt ?? new Date().toISOString()),
      updatedAt: String(ev.updatedAt ?? new Date().toISOString()),
      views: Number(ev.views ?? 0) || 0,
      images,
      ...(imageGroups.length > 0 ? { imageGroups } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Load event for `/memories/e/:slug` when not in local demo store.
 * - **Numeric slug** (e.g. `/memories/e/3`): always **`GET /api/memories/events/{id}`** with query
 *   `t`, `token` (when present), and `shareId` (when present) — same on localhost and any public host/IP.
 * - **Non-numeric slug**: **`GET /api/simple-invitations/memories-event-guest`** with slug + token + shareId.
 */
export async function loadRemoteMemoriesForPublicGallery(
  slug: string,
  token: string,
  shareId: string
): Promise<MemoriesEvent | null> {
  const t = token.trim();
  const sid = shareId.trim();
  const isNumericSlug = /^\d+$/.test(slug);

  if (isNumericSlug) {
    return getMemoriesEventById(slug, {
      accessToken: t || undefined,
      shareId: sid || undefined,
    });
  }

  return fetchGuestMemoriesEventBySlug(slug, t || undefined, sid || undefined);
}


