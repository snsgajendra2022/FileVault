import api from './api';
import type { MemoriesEvent, MemoriesImage } from '../features/memories/types';

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
 * Backend should accept: { eventId, slug?, accessToken?, clientIds: number[] }
 */
export async function shareMemoriesEventWithClients(body: {
  eventId: string;
  slug: string;
  accessToken: string;
  clientIds: number[];
}): Promise<void> {
  await api.post('/api/simple-invitations/share-memories-event', body);
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

function mapGuestImage(x: any): MemoriesImage {
  return {
    id: String(x.id ?? `img_${Math.random().toString(36).slice(2)}`),
    thumbUrl: String(x.thumbUrl ?? x.thumbnailUrl ?? x.previewUrl ?? x.hdUrl ?? ''),
    hdUrl: String(x.hdUrl ?? x.fullUrl ?? x.downloadUrl ?? x.thumbUrl ?? ''),
    likes: Number(x.likes ?? x.likeCount ?? 0) || 0,
  };
}

/** Guest/public load when event is not in local zustand (invited user on another device). */
export async function fetchGuestMemoriesEventBySlug(
  slug: string,
  token?: string
): Promise<MemoriesEvent | null> {
  try {
    const response = await api.get('/api/simple-invitations/memories-event-guest', {
      params: { slug, ...(token ? { t: token } : {}) },
    });
    const data = response.data as Record<string, unknown>;
    const ev = (data?.event ?? data) as Record<string, unknown>;
    if (!ev || typeof ev !== 'object') return null;
    const slugOut = String(ev.slug ?? slug);
    const imagesRaw = (Array.isArray(ev.images) ? ev.images : data.images) as any[];
    const images: MemoriesImage[] = Array.isArray(imagesRaw)
      ? imagesRaw.map(mapGuestImage).filter((i) => i.thumbUrl || i.hdUrl)
      : [];
    return {
      id: String(ev.id ?? ev.eventId ?? `remote_${slugOut}`),
      slug: slugOut,
      name: String(ev.name ?? 'Event'),
      dateTime: String(ev.dateTime ?? ev.startsAt ?? new Date().toISOString()),
      location: String(ev.location ?? ''),
      coverImageUrl: ev.coverImageUrl != null ? String(ev.coverImageUrl) : undefined,
      privacy: (ev.privacy as MemoriesEvent['privacy']) ?? 'private',
      accessToken: String(ev.accessToken ?? token ?? ''),
      createdAt: String(ev.createdAt ?? new Date().toISOString()),
      updatedAt: String(ev.updatedAt ?? new Date().toISOString()),
      views: Number(ev.views ?? 0) || 0,
      images,
    };
  } catch {
    return null;
  }
}
