import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { GuestBookEntry, GuestBookEntryMeta, GuestBookFiltersState } from './types';
import { useGuestBookStore } from './guestBookStore';
import {
  collectCategoriesAndTags,
  filterAndSortGuestEntries,
} from './utils';

const DEFAULT_FILTERS: GuestBookFiltersState = {
  search: '',
  category: '',
  tag: '',
  dateFrom: '',
  dateTo: '',
  sort: 'newest',
  layout: 'masonry',
};

const EMPTY_SCOPE_META: Record<string, GuestBookEntryMeta> = {};
const EMPTY_LOCAL_ENTRIES: GuestBookEntry[] = [];

type UseGuestBookOptions = {
  scopeId: string;
  apiEntries: GuestBookEntry[];
  canManage?: boolean;
};

export function useGuestBook({ scopeId, apiEntries, canManage = false }: UseGuestBookOptions) {
  const scopeMeta = useGuestBookStore((s) =>
    scopeId ? s.metaByEvent[scopeId] ?? EMPTY_SCOPE_META : EMPTY_SCOPE_META
  );
  const scopeLocalEntries = useGuestBookStore((s) =>
    scopeId ? s.localEntriesByEvent[scopeId] ?? EMPTY_LOCAL_ENTRIES : EMPTY_LOCAL_ENTRIES
  ) as Array<GuestBookEntry & { blobUrls?: string[] }>;

  const {
    togglePin,
    toggleFeatured,
    toggleLike,
    setReaction,
    addLocalEntry,
    updateLocalEntry,
    deleteLocalEntry,
    setEntryMeta,
  } = useGuestBookStore(
    useShallow((s) => ({
      togglePin: s.togglePin,
      toggleFeatured: s.toggleFeatured,
      toggleLike: s.toggleLike,
      setReaction: s.setReaction,
      addLocalEntry: s.addLocalEntry,
      updateLocalEntry: s.updateLocalEntry,
      deleteLocalEntry: s.deleteLocalEntry,
      setEntryMeta: s.setEntryMeta,
    }))
  );

  const [filters, setFilters] = React.useState<GuestBookFiltersState>(DEFAULT_FILTERS);

  const allEntries = React.useMemo(() => {
    if (!scopeId) return [];
    const localRaw = scopeLocalEntries.map(({ blobUrls: _b, ...rest }) => {
      const m = scopeMeta[rest.id];
      return {
        ...rest,
        pinned: m?.pinned ?? rest.pinned,
        featured: m?.featured ?? rest.featured,
        title: m?.title ?? rest.title,
        date: m?.date ?? rest.date,
        category: m?.category ?? rest.category,
        tag: m?.tag ?? rest.tag,
        likes: rest.likes + (m?.extraLikes ?? 0),
        userLiked: m?.userLiked ?? rest.userLiked,
        reactions: {
          heart: m?.reactions?.heart ?? rest.reactions.heart,
          smile: m?.reactions?.smile ?? rest.reactions.smile,
          celebrate: m?.reactions?.celebrate ?? rest.reactions.celebrate,
        },
        userReaction: m?.userReaction ?? rest.userReaction,
      } satisfies GuestBookEntry;
    });
    const seen = new Set(apiEntries.map((e) => e.id));
    return [...apiEntries, ...localRaw.filter((e) => !seen.has(e.id))];
  }, [scopeId, apiEntries, scopeMeta, scopeLocalEntries]);

  const filteredEntries = React.useMemo(
    () => filterAndSortGuestEntries(allEntries, filters),
    [allEntries, filters]
  );

  const featuredEntries = React.useMemo(
    () => filteredEntries.filter((e) => e.featured).slice(0, 6),
    [filteredEntries]
  );

  const { categories, tags } = React.useMemo(
    () => collectCategoriesAndTags(allEntries),
    [allEntries]
  );

  const patchFilters = React.useCallback((patch: Partial<GuestBookFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    filters,
    setFilters: patchFilters,
    allEntries,
    filteredEntries,
    featuredEntries,
    categories,
    tags,
    togglePin,
    toggleFeatured,
    toggleLike,
    setReaction,
    addLocalEntry,
    updateLocalEntry,
    deleteLocalEntry,
    setEntryMeta,
  };
}
