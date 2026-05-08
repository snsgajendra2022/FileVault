import api from '../client/axiosInstance';

export type PhoneBookContact = {
  id: string;
  displayName: string;
  email?: string;
  mobile?: string;
  countryCode?: string;
  avatarUrl?: string;
  notes?: string;
  meta?: PhoneBookContactMeta;
  createdAt?: string;
  updatedAt?: string;
};

export type PhoneBookContactType =
  | 'Client'
  | 'Family'
  | 'Bride/Groom'
  | 'Event Organizer'
  | 'Photographer'
  | 'Staff'
  | 'VIP Customer'
  | 'Other';

export type PhoneBookContactMeta = {
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  contactType?: PhoneBookContactType;
  tags?: string[];
  favorite?: boolean;
  linkedEventIds?: string[];
  inviteStatus?: 'invited' | 'not_invited' | 'accepted' | 'rejected';
};

export type PhoneBookListResponse = {
  contacts: PhoneBookContact[];
  total?: number;
};

const META_PREFIX = 'FV_PHONEBOOK_META:';

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function unpackPhoneBookNotes(rawNotes?: string): { userNotes?: string; meta?: PhoneBookContactMeta } {
  const notes = typeof rawNotes === 'string' ? rawNotes : '';
  if (!notes.trim()) return {};
  const idx = notes.indexOf(META_PREFIX);
  if (idx === -1) return { userNotes: notes };
  const before = notes.slice(0, idx).trim();
  const jsonPart = notes.slice(idx + META_PREFIX.length).trim();
  const meta = safeJsonParse<PhoneBookContactMeta>(jsonPart) ?? undefined;
  return { userNotes: before || undefined, meta };
}

export function packPhoneBookNotes(input: { userNotes?: string; meta?: PhoneBookContactMeta }): string | undefined {
  const userNotes = (input.userNotes ?? '').trim();
  const meta = input.meta && Object.keys(input.meta).length > 0 ? input.meta : undefined;
  if (!userNotes && !meta) return undefined;
  if (!meta) return userNotes;
  const json = JSON.stringify(meta);
  return userNotes ? `${userNotes}\n\n${META_PREFIX}${json}` : `${META_PREFIX}${json}`;
}

function normalizeContact(raw: any): PhoneBookContact | null {
  if (!raw) return null;
  const id = raw.id != null ? String(raw.id) : raw.contactId != null ? String(raw.contactId) : '';
  const displayName = String(raw.displayName ?? raw.name ?? raw.fullName ?? '').trim();
  if (!id || !displayName) return null;
  const unpacked = unpackPhoneBookNotes(raw.notes != null ? String(raw.notes) : undefined);
  return {
    id,
    displayName,
    email: raw.email != null ? String(raw.email) : undefined,
    mobile: raw.mobile != null ? String(raw.mobile) : undefined,
    countryCode: raw.countryCode != null ? String(raw.countryCode) : undefined,
    avatarUrl: raw.avatarUrl != null ? String(raw.avatarUrl) : raw.photoUrl != null ? String(raw.photoUrl) : undefined,
    notes: unpacked.userNotes,
    meta: unpacked.meta,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

export async function listPhoneBookContacts(input?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PhoneBookListResponse> {
  const params = new URLSearchParams();
  if (input?.search?.trim()) params.set('search', input.search.trim());
  params.set('limit', String(input?.limit ?? 50));
  params.set('offset', String(input?.offset ?? 0));
  const res = await api.get(`/api/public-share/contacts?${params.toString()}`);
  const raw = res.data as any;
  const list = Array.isArray(raw?.contacts) ? raw.contacts : Array.isArray(raw) ? raw : [];
  const contacts = list.map(normalizeContact).filter(Boolean) as PhoneBookContact[];
  return { contacts, total: typeof raw?.total === 'number' ? raw.total : undefined };
}

export async function getPhoneBookContactById(id: string): Promise<PhoneBookContact | null> {
  try {
    const res = await api.get(`/api/public-share/contacts/${encodeURIComponent(id)}`);
    const c = normalizeContact((res.data as any)?.contact ?? res.data);
    return c;
  } catch {
    // Fallback when backend doesn't expose GET by id yet
    const all = await listPhoneBookContacts({ limit: 200, offset: 0 });
    return all.contacts.find((c) => c.id === id) ?? null;
  }
}

export async function createPhoneBookContact(input: {
  displayName: string;
  email?: string;
  mobile?: string;
  countryCode?: string;
  avatarUrl?: string;
  notes?: string;
  meta?: PhoneBookContactMeta;
}): Promise<PhoneBookContact> {
  const payload = {
    displayName: input.displayName,
    email: input.email,
    mobile: input.mobile,
    countryCode: input.countryCode,
    avatarUrl: input.avatarUrl,
    notes: packPhoneBookNotes({ userNotes: input.notes, meta: input.meta }),
  };
  const res = await api.post('/api/public-share/contacts', payload);
  const created = normalizeContact((res.data as any)?.contact ?? res.data);
  if (!created) throw new Error('Invalid create contact response');
  return created;
}

export async function updatePhoneBookContact(
  id: string,
  patch: Partial<
    Pick<PhoneBookContact, 'displayName' | 'email' | 'mobile' | 'countryCode' | 'avatarUrl' | 'notes' | 'meta'>
  >
): Promise<PhoneBookContact> {
  const payload: Record<string, unknown> = { ...patch };
  if ('notes' in patch || 'meta' in patch) {
    payload.notes = packPhoneBookNotes({ userNotes: patch.notes, meta: patch.meta });
    delete payload.meta;
  }
  const res = await api.put(`/api/public-share/contacts/${encodeURIComponent(id)}`, payload);
  const updated = normalizeContact((res.data as any)?.contact ?? res.data);
  if (!updated) throw new Error('Invalid update contact response');
  return updated;
}

export async function deletePhoneBookContact(id: string): Promise<void> {
  await api.delete(`/api/public-share/contacts/${encodeURIComponent(id)}`);
}


