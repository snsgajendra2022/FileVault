import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemoriesEvent, MemoriesImage, MemoriesPrivacy } from '../../features/memories/types';
import { newId, picsumPair, randomToken, slugify } from '../../features/memories/utils';

type MemoriesState = {
  events: MemoriesEvent[];
  createEvent: (input: {
    name: string;
    dateTime: string;
    location: string;
    coverImageUrl?: string;
  }) => MemoriesEvent;
  updateEvent: (id: string, patch: Partial<Pick<MemoriesEvent, 'name' | 'dateTime' | 'location' | 'coverImageUrl'>>) => void;
  deleteEvent: (id: string) => void;
  getBySlug: (slug: string) => MemoriesEvent | undefined;
  getById: (id: string) => MemoriesEvent | undefined;
  addSamplePhotos: (eventId: string, count?: number) => void;
  toggleLike: (eventId: string, imageId: string) => void;
  addComment: (eventId: string, imageId: string, text: string) => void;
  incrementViews: (eventId: string) => void;
  setSharedWithUsers: (eventId: string, userIds: number[]) => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

export const useMemoriesStore = create<MemoriesState>()(
  persist(
    (set, get) => ({
      events: [],

      createEvent: (input) => {
        const base = slugify(input.name);
        const existing = get().events;
        let slug = base;
        let n = 1;
        while (existing.some((e) => e.slug === slug)) {
          slug = `${base}-${n}`;
          n += 1;
        }
        const ev: MemoriesEvent = {
          id: newId('ev'),
          slug,
          name: input.name.trim(),
          dateTime: input.dateTime,
          location: input.location.trim(),
          coverImageUrl: input.coverImageUrl,
          accessToken: randomToken(16),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          views: 0,
          images: [],
        };
        set({ events: [ev, ...get().events] });
        return ev;
      },

      updateEvent: (id, patch) => {
        set({
          events: get().events.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: nowIso() } : e
          ),
        });
      },

      deleteEvent: (id) => {
        set({ events: get().events.filter((e) => e.id !== id) });
      },

      getBySlug: (slug) => get().events.find((e) => e.slug === slug),

      getById: (id) => get().events.find((e) => e.id === id),

      addSamplePhotos: (eventId, count = 12) => {
        const ev = get().events.find((e) => e.id === eventId);
        if (!ev) return;
        const start = ev.images.length;
        const added: MemoriesImage[] = [];
        for (let i = 0; i < count; i += 1) {
          const { thumbUrl, hdUrl } = picsumPair(start + i + ev.createdAt.length);
          added.push({
            id: newId('img'),
            thumbUrl,
            hdUrl,
            likes: Math.floor(Math.random() * 40),
          });
        }
        set({
          events: get().events.map((e) =>
            e.id === eventId
              ? { ...e, images: [...e.images, ...added], updatedAt: nowIso() }
              : e
          ),
        });
      },

      toggleLike: (eventId, imageId) => {
        set({
          events: get().events.map((e) => {
            if (e.id !== eventId) return e;
            return {
              ...e,
              images: e.images.map((img) =>
                img.id === imageId ? { ...img, likes: img.likes + 1 } : img
              ),
              updatedAt: nowIso(),
            };
          }),
        });
      },

      addComment: (eventId, imageId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set({
          events: get().events.map((e) => {
            if (e.id !== eventId) return e;
            return {
              ...e,
              images: e.images.map((img) => {
                if (img.id !== imageId) return img;
                const nextComments = [
                  ...(Array.isArray(img.comments) ? img.comments : []),
                  { id: newId('cmt'), text: trimmed, createdAt: nowIso() },
                ];
                return { ...img, comments: nextComments };
              }),
              updatedAt: nowIso(),
            };
          }),
        });
      },

      incrementViews: (eventId) => {
        set({
          events: get().events.map((e) =>
            e.id === eventId ? { ...e, views: e.views + 1, updatedAt: nowIso() } : e
          ),
        });
      },

      setSharedWithUsers: (eventId, userIds) => {
        set({
          events: get().events.map((e) =>
            e.id === eventId
              ? { ...e, sharedWithUserIds: Array.from(new Set(userIds)), updatedAt: nowIso() }
              : e
          ),
        });
      },
    }),
    { name: 'filevault_memories_v1' }
  )
);
