import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PhoneBookPrefsState = {
  favoriteContactIds: Set<string>;
  recentContactIds: string[];
  toggleFavorite: (id: string) => void;
  markRecent: (id: string) => void;
  clearRecents: () => void;
};

export const usePhoneBookPrefsStore = create<PhoneBookPrefsState>()(
  persist(
    (set, get) => ({
      favoriteContactIds: new Set<string>(),
      recentContactIds: [],

      toggleFavorite: (id) => {
        set((s) => {
          const next = new Set(Array.from(s.favoriteContactIds));
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { favoriteContactIds: next };
        });
      },

      markRecent: (id) => {
        set((s) => {
          const next = [id, ...s.recentContactIds.filter((x) => x !== id)].slice(0, 24);
          return { recentContactIds: next };
        });
      },

      clearRecents: () => set({ recentContactIds: [] }),
    }),
    {
      name: 'filevault_phonebook_prefs_v1',
      partialize: (s) => ({
        favoriteContactIds: Array.from(s.favoriteContactIds),
        recentContactIds: s.recentContactIds,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        favoriteContactIds: new Set<string>(Array.isArray(persisted?.favoriteContactIds) ? persisted.favoriteContactIds : []),
        recentContactIds: Array.isArray(persisted?.recentContactIds) ? persisted.recentContactIds : [],
      }),
    }
  )
);

