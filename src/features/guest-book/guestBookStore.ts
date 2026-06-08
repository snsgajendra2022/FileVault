import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemoriesImage } from '../memories/types';
import type { GuestBookEntry, GuestBookEntryInput, GuestBookEntryMeta, GuestBookReaction } from './types';
import { newId } from '../memories/utils';

type LocalEntryRecord = GuestBookEntry & { blobUrls?: string[] };

type GuestBookState = {
  metaByEvent: Record<string, Record<string, GuestBookEntryMeta>>;
  localEntriesByEvent: Record<string, LocalEntryRecord[]>;

  getMeta: (eventId: string, entryId: string) => GuestBookEntryMeta | undefined;
  setEntryMeta: (eventId: string, entryId: string, patch: Partial<GuestBookEntryMeta>) => void;
  togglePin: (eventId: string, entryId: string) => void;
  toggleFeatured: (eventId: string, entryId: string) => void;
  toggleLike: (eventId: string, entryId: string) => void;
  setReaction: (eventId: string, entryId: string, reaction: GuestBookReaction) => void;
  addLocalEntry: (eventId: string, input: GuestBookEntryInput) => GuestBookEntry;
  updateLocalEntry: (eventId: string, entryId: string, patch: Partial<GuestBookEntryInput>) => void;
  deleteLocalEntry: (eventId: string, entryId: string) => void;
  getLocalEntries: (eventId: string) => GuestBookEntry[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function filesToLocalImages(files: File[]): { images: MemoriesImage[]; blobUrls: string[] } {
  const blobUrls = files.map((f) => URL.createObjectURL(f));
  const images: MemoriesImage[] = blobUrls.map((url, i) => ({
    id: newId('local_img'),
    thumbUrl: url,
    hdUrl: url,
    likes: 0,
  }));
  return { images, blobUrls };
}

export const useGuestBookStore = create<GuestBookState>()(
  persist(
    (set, get) => ({
      metaByEvent: {},
      localEntriesByEvent: {},

      getMeta: (eventId, entryId) => get().metaByEvent[eventId]?.[entryId],

      setEntryMeta: (eventId, entryId, patch) => {
        set((state) => {
          const prev = state.metaByEvent[eventId]?.[entryId] ?? {};
          return {
            metaByEvent: {
              ...state.metaByEvent,
              [eventId]: {
                ...(state.metaByEvent[eventId] ?? {}),
                [entryId]: { ...prev, ...patch },
              },
            },
          };
        });
      },

      togglePin: (eventId, entryId) => {
        const cur = get().getMeta(eventId, entryId)?.pinned ?? false;
        get().setEntryMeta(eventId, entryId, { pinned: !cur });
      },

      toggleFeatured: (eventId, entryId) => {
        const cur = get().getMeta(eventId, entryId)?.featured ?? false;
        get().setEntryMeta(eventId, entryId, { featured: !cur });
      },

      toggleLike: (eventId, entryId) => {
        const meta = get().getMeta(eventId, entryId) ?? {};
        const liked = Boolean(meta.userLiked);
        get().setEntryMeta(eventId, entryId, {
          userLiked: !liked,
          extraLikes: (meta.extraLikes ?? 0) + (liked ? -1 : 1),
        });
      },

      setReaction: (eventId, entryId, reaction) => {
        const meta = get().getMeta(eventId, entryId) ?? {};
        const prev = meta.userReaction;
        const reactions = { heart: 0, smile: 0, celebrate: 0, ...(meta.reactions ?? {}) };
        if (prev && prev !== reaction) {
          reactions[prev] = Math.max(0, (reactions[prev] ?? 0) - 1);
        }
        if (prev === reaction) {
          reactions[reaction] = Math.max(0, (reactions[reaction] ?? 0) - 1);
          get().setEntryMeta(eventId, entryId, { userReaction: undefined, reactions });
        } else {
          reactions[reaction] = (reactions[reaction] ?? 0) + 1;
          get().setEntryMeta(eventId, entryId, { userReaction: reaction, reactions });
        }
      },

      addLocalEntry: (eventId, input) => {
        const { images, blobUrls } = filesToLocalImages(input.images);
        const id = newId('gb_entry');
        const entry: LocalEntryRecord = {
          id,
          eventId,
          guestName: input.guestName.trim(),
          message: input.message.trim(),
          title: input.title?.trim() || undefined,
          date: input.date || nowIso(),
          category: input.category?.trim() || undefined,
          tag: input.tag?.trim() || undefined,
          images,
          likes: 0,
          pinned: false,
          featured: false,
          reactions: { heart: 0, smile: 0, celebrate: 0 },
          userLiked: false,
          createdAt: input.date || nowIso(),
          source: 'local',
          canEdit: true,
          canDelete: true,
          blobUrls,
        };
        set((state) => ({
          localEntriesByEvent: {
            ...state.localEntriesByEvent,
            [eventId]: [entry, ...(state.localEntriesByEvent[eventId] ?? [])],
          },
        }));
        return entry;
      },

      updateLocalEntry: (eventId, entryId, patch) => {
        set((state) => {
          const list = state.localEntriesByEvent[eventId] ?? [];
          const next = list.map((e) => {
            if (e.id !== entryId) return e;
            let images = e.images;
            let blobUrls = e.blobUrls ?? [];
            if (patch.images?.length) {
              blobUrls.forEach((u) => URL.revokeObjectURL(u));
              const converted = filesToLocalImages(patch.images);
              images = converted.images;
              blobUrls = converted.blobUrls;
            }
            return {
              ...e,
              guestName: patch.guestName?.trim() ?? e.guestName,
              message: patch.message?.trim() ?? e.message,
              title: patch.title !== undefined ? patch.title?.trim() || undefined : e.title,
              date: patch.date ?? e.date,
              category: patch.category !== undefined ? patch.category?.trim() || undefined : e.category,
              tag: patch.tag !== undefined ? patch.tag?.trim() || undefined : e.tag,
              images,
              blobUrls,
            };
          });
          return {
            localEntriesByEvent: { ...state.localEntriesByEvent, [eventId]: next },
          };
        });
      },

      deleteLocalEntry: (eventId, entryId) => {
        set((state) => {
          const list = state.localEntriesByEvent[eventId] ?? [];
          const target = list.find((e) => e.id === entryId);
          target?.blobUrls?.forEach((u) => URL.revokeObjectURL(u));
          return {
            localEntriesByEvent: {
              ...state.localEntriesByEvent,
              [eventId]: list.filter((e) => e.id !== entryId),
            },
          };
        });
      },

      getLocalEntries: (eventId) => {
        return (get().localEntriesByEvent[eventId] ?? []).map(({ blobUrls: _b, ...rest }) => rest);
      },
    }),
    { name: 'filevault-guest-book-v1' }
  )
);
