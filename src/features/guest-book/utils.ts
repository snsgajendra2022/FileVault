import type { MemoriesEvent, MemoriesImage, MemoriesImageGroup } from '../memories/types';
import type {
  GuestBookEntry,
  GuestBookEntryMeta,
  GuestBookFiltersState,
  GuestBookSortMode,
} from './types';

const TRUNCATE_LEN = 160;

export function truncateMessage(text: string, max = TRUNCATE_LEN): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= max) return { text: trimmed, truncated: false };
  const cut = trimmed.slice(0, max).replace(/\s+\S*$/, '');
  return { text: `${cut}…`, truncated: true };
}

export function entryImageUrls(entry: GuestBookEntry): { thumb: string; hd: string }[] {
  return entry.images
    .map((img) => ({
      thumb: img.thumbUrl || img.hdUrl,
      hd: img.hdUrl || img.thumbUrl,
    }))
    .filter((x) => x.thumb || x.hd);
}

export function sumImageLikes(images: MemoriesImage[]): number {
  return images.reduce((acc, img) => acc + (img.likes ?? 0), 0);
}

function groupEntryId(eventId: string, group: MemoriesImageGroup, index: number): string {
  if (group.shareId != null) return `${eventId}:share:${group.shareId}`;
  const name = group.recipientName?.trim() || 'guest';
  return `${eventId}:group:${index}:${name}`;
}

function imageEntryId(eventId: string, imageId: string): string {
  return `${eventId}:img:${imageId}`;
}

function galleryAlbumEntryId(eventId: string): string {
  return `${eventId}:album:gallery`;
}

/** Parses studio guest-book notes: `Name — Title — Message` or `Name — Message`. */
export function parseGuestUploadNote(note: string): {
  guestName?: string;
  title?: string;
  message: string;
} {
  const trimmed = note.trim();
  if (!trimmed) return { message: '' };
  const parts = trimmed.split(' — ').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { guestName: parts[0], title: parts[1], message: parts.slice(2).join(' — ') };
  }
  if (parts.length === 2) {
    return { guestName: parts[0], message: parts[1] };
  }
  return { message: trimmed };
}

function guestNameFromGroup(group: MemoriesImageGroup): string {
  const parsed = group.comment?.text ? parseGuestUploadNote(group.comment.text) : null;
  return (
    group.recipientName?.trim() ||
    group.comment?.displayName?.trim() ||
    group.comment?.userName?.trim() ||
    parsed?.guestName?.trim() ||
    'Guest'
  );
}

function messageFromGroup(group: MemoriesImageGroup): string {
  const raw = group.comment?.text?.trim() ?? '';
  if (!raw) return '';
  const parsed = parseGuestUploadNote(raw);
  return parsed.message || raw;
}

function titleFromGroup(group: MemoriesImageGroup): string | undefined {
  const raw = group.comment?.text?.trim();
  if (!raw) return undefined;
  return parseGuestUploadNote(raw).title;
}

function buildApiEntry(
  base: Omit<GuestBookEntry, 'id'>,
  id: string,
  metaByEntryId: Record<string, GuestBookEntryMeta>
): GuestBookEntry {
  return applyMeta({ ...base, id }, metaByEntryId[id]);
}

function applyMeta(entry: GuestBookEntry, meta?: GuestBookEntryMeta): GuestBookEntry {
  if (!meta) return entry;
  const reactions = {
    heart: meta.reactions?.heart ?? entry.reactions.heart,
    smile: meta.reactions?.smile ?? entry.reactions.smile,
    celebrate: meta.reactions?.celebrate ?? entry.reactions.celebrate,
  };
  const baseLikes = entry.likes;
  const extraLikes = meta.extraLikes ?? 0;
  return {
    ...entry,
    title: meta.title ?? entry.title,
    date: meta.date ?? entry.date,
    category: meta.category ?? entry.category,
    tag: meta.tag ?? entry.tag,
    pinned: meta.pinned ?? entry.pinned,
    featured: meta.featured ?? entry.featured,
    reactions,
    userReaction: meta.userReaction ?? entry.userReaction,
    likes: baseLikes + extraLikes,
    userLiked: meta.userLiked ?? entry.userLiked,
  };
}

export function mapEventToGuestEntries(
  event: MemoriesEvent,
  metaByEntryId: Record<string, GuestBookEntryMeta> = {},
  opts?: { canManage?: boolean; likedImageIds?: Set<string> }
): GuestBookEntry[] {
  const entries: GuestBookEntry[] = [];
  const canManage = Boolean(opts?.canManage);
  const likedImageIds = opts?.likedImageIds ?? new Set<string>();

  if (event.imageGroups?.length) {
    event.imageGroups.forEach((group, index) => {
      const id = groupEntryId(String(event.id), group, index);
      const guestName = guestNameFromGroup(group);
      const message = messageFromGroup(group);
      const title = titleFromGroup(group);
      const createdAt = group.comment?.createdAt ?? event.createdAt;
      const userLiked = group.images.some((img) => likedImageIds.has(img.id));

      entries.push(
        buildApiEntry(
          {
            eventId: String(event.id),
            guestName,
            message,
            title,
            images: group.images,
            likes: sumImageLikes(group.images),
            pinned: false,
            featured: false,
            reactions: { heart: 0, smile: 0, celebrate: 0 },
            userLiked,
            createdAt,
            source: 'api',
            canEdit: canManage,
            canDelete: canManage,
          },
          id,
          metaByEntryId
        )
      );
    });
  } else if (event.images.length) {
    const plainImages: MemoriesImage[] = [];

    event.images.forEach((img) => {
      const firstComment = img.comments?.[0];
      const commentText = firstComment?.text?.trim() ?? '';
      if (!commentText) {
        plainImages.push(img);
        return;
      }

      const parsed = parseGuestUploadNote(commentText);
      const id = imageEntryId(String(event.id), img.id);
      const guestName = parsed.guestName?.trim() || 'Guest';

      entries.push(
        buildApiEntry(
          {
            eventId: String(event.id),
            guestName,
            message: parsed.message || commentText,
            title: parsed.title,
            images: [img],
            likes: img.likes ?? 0,
            pinned: false,
            featured: false,
            reactions: { heart: 0, smile: 0, celebrate: 0 },
            userLiked: likedImageIds.has(img.id),
            createdAt: firstComment?.createdAt ?? event.createdAt,
            source: 'api',
            canEdit: canManage,
            canDelete: canManage,
          },
          id,
          metaByEntryId
        )
      );
    });

    if (plainImages.length) {
      const id = galleryAlbumEntryId(String(event.id));
      entries.push(
        buildApiEntry(
          {
            eventId: String(event.id),
            guestName: 'Event album',
            message: '',
            images: plainImages,
            likes: sumImageLikes(plainImages),
            pinned: false,
            featured: false,
            reactions: { heart: 0, smile: 0, celebrate: 0 },
            userLiked: plainImages.some((img) => likedImageIds.has(img.id)),
            createdAt: event.createdAt,
            source: 'api',
            canEdit: canManage,
            canDelete: canManage,
          },
          id,
          metaByEntryId
        )
      );
    }
  }

  return entries;
}

export function filterAndSortGuestEntries(
  entries: GuestBookEntry[],
  filters: GuestBookFiltersState
): GuestBookEntry[] {
  let list = [...entries];

  const q = filters.search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (e) =>
        e.guestName.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        (e.title?.toLowerCase().includes(q) ?? false) ||
        (e.category?.toLowerCase().includes(q) ?? false) ||
        (e.tag?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters.category.trim()) {
    const cat = filters.category.trim().toLowerCase();
    list = list.filter((e) => (e.category ?? '').toLowerCase() === cat);
  }

  if (filters.tag.trim()) {
    const tag = filters.tag.trim().toLowerCase();
    list = list.filter((e) => (e.tag ?? '').toLowerCase() === tag);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    list = list.filter((e) => new Date(e.date ?? e.createdAt).getTime() >= from);
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    list = list.filter((e) => new Date(e.date ?? e.createdAt).getTime() <= to);
  }

  const sortFns: Record<GuestBookSortMode, (a: GuestBookEntry, b: GuestBookEntry) => number> = {
    newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    mostLiked: (a, b) => b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  };

  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return sortFns[filters.sort](a, b);
  });

  return list;
}

export function collectCategoriesAndTags(entries: GuestBookEntry[]): {
  categories: string[];
  tags: string[];
} {
  const categories = new Set<string>();
  const tags = new Set<string>();
  entries.forEach((e) => {
    if (e.category?.trim()) categories.add(e.category.trim());
    if (e.tag?.trim()) tags.add(e.tag.trim());
  });
  return {
    categories: Array.from(categories).sort(),
    tags: Array.from(tags).sort(),
  };
}

export function formatGuestBookDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function objectUrlsFromFiles(files: File[]): string[] {
  return files.map((f) => URL.createObjectURL(f));
}

export function revokeObjectUrls(urls: string[]): void {
  urls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  });
}
