import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FamilyRelationship } from '../../types/user';
import { variantsNeedPolling } from '../../utils/progressiveImageVariants';
import { deleteMyImage, fetchMyImagesPage } from './myImagesApi';
import {
  formatDayKeyLabel,
  getMyImageKey,
  myImageDedupeKey,
  resolveImageIdForDelete,
  uploadDayKey,
} from './myImagesHelpers';
import type { GalleryDayGroup, GalleryImageRow, MyImage, MyImagesViewMode } from './types';

export interface UseMyImagesGalleryOptions {
  userId?: string | number;
  enabled: boolean;
  viewMode: MyImagesViewMode;
  selectedFamilyMember: FamilyRelationship | null;
  gallerySearch: string;
  galleryDateFilter: string;
  invalidDateLabel: string;
}

export function useMyImagesGallery(options: UseMyImagesGalleryOptions) {
  const {
    enabled,
    viewMode,
    selectedFamilyMember,
    gallerySearch,
    galleryDateFilter,
    invalidDateLabel,
  } = options;

  const queryClient = useQueryClient();
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const cardRefsMapRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  const resolveToken = useCallback(() => {
    let token = localStorage.getItem('token') || '';
    if (selectedFamilyMember && viewMode === 'invited') {
      token = selectedFamilyMember.inviterApiToken;
    }
    return token;
  }, [selectedFamilyMember, viewMode]);

  const query = useInfiniteQuery({
    queryKey: ['userImages', selectedFamilyMember?.inviterApiToken, viewMode],
    queryFn: ({ pageParam }) => fetchMyImagesPage({ token: resolveToken(), page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 0;
      const totalPages = lastPage?.totalPages ?? 1;
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 2,
    refetchInterval: (q) => {
      const pages = q.state.data?.pages ?? [];
      const all = pages.flatMap((p) => p.images ?? []);
      return variantsNeedPolling(all) ? 4000 : false;
    },
    enabled:
      enabled &&
      (viewMode === 'my' || (viewMode === 'invited' && !!selectedFamilyMember)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
  });

  const images = useMemo(() => {
    const flat = query.data?.pages?.flatMap((p) => p.images ?? []) ?? [];
    const seen = new Set<string>();
    return flat.filter((img) => {
      const key = myImageDedupeKey(img);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [query.data]);

  const totalCount = query.data?.pages?.[0]?.totalImages ?? images.length;

  const availableUploadDays = useMemo(() => {
    const keys = new Set<string>();
    for (const img of images) {
      const k = uploadDayKey(img.uploadTime);
      if (k !== 'invalid') keys.add(k);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [images]);

  const filteredRows = useMemo((): GalleryImageRow[] => {
    const q = gallerySearch.trim().toLowerCase();
    return images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => {
        if (galleryDateFilter && uploadDayKey(image.uploadTime) !== galleryDateFilter) {
          return false;
        }
        if (!q) return true;
        return image.filename.toLowerCase().includes(q);
      });
  }, [images, gallerySearch, galleryDateFilter]);

  const galleryByDay = useMemo((): GalleryDayGroup[] => {
    const byDay = new Map<string, GalleryImageRow[]>();
    for (const row of filteredRows) {
      const key = uploadDayKey(row.image.uploadTime);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(row);
    }
    const sortTime = (a: GalleryImageRow, b: GalleryImageRow) => {
      const ta = new Date(a.image.uploadTime).getTime();
      const tb = new Date(b.image.uploadTime).getTime();
      return tb - ta;
    };
    return Array.from(byDay.entries())
      .sort(([a], [b]) => {
        if (a === 'invalid') return 1;
        if (b === 'invalid') return -1;
        return b.localeCompare(a);
      })
      .map(([dayKey, items]) => ({
        dayKey,
        dayLabel: formatDayKeyLabel(dayKey, invalidDateLabel),
        items: [...items].sort(sortTime),
      }));
  }, [filteredRows, invalidDateLabel]);

  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.has(getMyImageKey(img))),
    [images, selectedImageIds]
  );

  const toggleSelect = useCallback((image: MyImage) => {
    const key = getMyImageKey(image);
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedImageIds(new Set()), []);

  const deleteImage = useCallback(
    (image: MyImage) => {
      const imageId = resolveImageIdForDelete(image);
      if (imageId) deleteMutation.mutate(imageId);
      return !!imageId;
    },
    [deleteMutation]
  );

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) el.dataset.index = String(index);
      cardRefsMapRef.current.set(index, el);
    },
    []
  );

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) query.fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  useEffect(() => {
    if (images.length === 0) return;
    const observer =
      observerRef.current ||
      new IntersectionObserver(
        (entries) => {
          setVisibleIndices((prev) => {
            const next = new Set(prev);
            let changed = false;
            entries.forEach((entry) => {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              if (Number.isNaN(idx)) return;
              if (entry.isIntersecting && !next.has(idx)) {
                next.add(idx);
                changed = true;
              } else if (!entry.isIntersecting && next.has(idx)) {
                next.delete(idx);
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        },
        { rootMargin: '100px', threshold: 0.01 }
      );
    observerRef.current = observer;
    const map = cardRefsMapRef.current;
    const scheduleObserve = () => {
      map.forEach((el) => {
        if (el) observer.observe(el);
      });
    };
    const id = requestAnimationFrame(scheduleObserve);
    return () => {
      cancelAnimationFrame(id);
      map.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [images.length]);

  const isImageVisible = useCallback((index: number) => visibleIndices.has(index), [visibleIndices]);

  return {
    query,
    images,
    totalCount,
    filteredCount: filteredRows.length,
    galleryByDay,
    availableUploadDays,
    selectedImageIds,
    selectedImages,
    toggleSelect,
    clearSelection,
    deleteImage,
    deletePending: deleteMutation.isPending,
    isImageVisible,
    setCardRef,
    loadMoreSentinelRef,
    getMyImageKey,
  };
}
