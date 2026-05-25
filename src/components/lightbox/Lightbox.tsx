import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
} from 'react-icons/fa';
import LightboxImage from './LightboxImage';
import LightboxProgressiveView from './LightboxProgressiveView';
import { getImagePreloadManager } from '../../utils/imagePreloader/ImagePreloadManager';
import type { UserImageWithVariants } from '../../utils/progressiveImageVariants';

export interface LightboxItem {
  id: number | string;
  src: string | null;
  thumbnailSrc?: string | null;
  alt: string;
  filename?: string;
  /** When set (with variants from API), lightbox steps s01 → … → original. */
  progressiveImage?: UserImageWithVariants;
}

interface LightboxProps {
  items: LightboxItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Called to perform the actual download. Should return a Promise. */
  onDownload?: (item: LightboxItem) => Promise<void>;
  renderActions?: (item: LightboxItem) => React.ReactNode;
  /** Fired when the visible slide changes (arrows, swipe, thumb strip). */
  onIndexChange?: (index: number) => void;
  /** Server-side total when known (e.g. album image count). */
  totalCount?: number;
  /** More items exist beyond the current `items` array. */
  hasMoreItems?: boolean;
  /** Request the next page (e.g. album infinite query). */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** When false, navigation stops at first/last instead of wrapping. Default false. */
  loop?: boolean;
}

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

const PRELOAD_NEXT = 2;
const PRELOAD_PREV = 1;
const MAX_CACHE = 100;

const LOAD_MORE_THRESHOLD = 2;
const THUMB_STRIP_RADIUS = 12;

const Lightbox: React.FC<LightboxProps> = ({
  items,
  initialIndex,
  isOpen,
  onClose,
  onDownload,
  renderActions,
  onIndexChange,
  totalCount,
  hasMoreItems = false,
  onLoadMore,
  isLoadingMore = false,
  loop = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dlState, setDlState] = useState<DownloadState>('idle');
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadNeighborTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const manager = getImagePreloadManager({
    preloadNext: PRELOAD_NEXT,
    preloadPrev: PRELOAD_PREV,
    maxCacheSize: MAX_CACHE,
  });

  // Sync index when lightbox opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Reset download state when image changes
  useEffect(() => {
    setDlState('idle');
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
  }, [currentIndex]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    if (preloadNeighborTimerRef.current) clearTimeout(preloadNeighborTimerRef.current);
  }, []);

  // Preload only neighbors — debounced so rapid navigation doesn't flood requests
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    if (preloadNeighborTimerRef.current) clearTimeout(preloadNeighborTimerRef.current);
    preloadNeighborTimerRef.current = setTimeout(() => {
      const start = Math.max(0, currentIndex - PRELOAD_PREV);
      const end = Math.min(items.length, currentIndex + PRELOAD_NEXT + 1);
      const urls = items
        .slice(start, end)
        .map((i) => i.thumbnailSrc || i.src)
        .filter(Boolean) as string[];
      manager.preloadForIndex(currentIndex - start, urls).catch(() => {});
    }, 100);
    return () => {
      if (preloadNeighborTimerRef.current) clearTimeout(preloadNeighborTimerRef.current);
    };
  }, [currentIndex, items, isOpen]);

  const maybeLoadMore = useCallback(
    (index: number) => {
      if (!hasMoreItems || isLoadingMore) return;
      if (index >= items.length - LOAD_MORE_THRESHOLD) onLoadMoreRef.current?.();
    },
    [hasMoreItems, isLoadingMore, items.length]
  );

  const notifyIndexChange = useCallback(
    (next: number) => {
      requestAnimationFrame(() => {
        onIndexChangeRef.current?.(next);
        maybeLoadMore(next);
      });
    },
    [maybeLoadMore]
  );

  const goTo = useCallback(
    (index: number) => {
      const total = items.length;
      if (!total) return;
      let next: number;
      if (loop) {
        next = (index + total) % total;
      } else {
        next = Math.max(0, Math.min(index, total - 1));
      }
      if (next === currentIndex) return;
      setCurrentIndex(next);
      notifyIndexChange(next);
    },
    [items.length, loop, currentIndex, notifyIndexChange]
  );

  const goPrev = useCallback(() => {
    const total = items.length;
    if (!total) return;
    if (currentIndex <= 0) {
      if (loop) goTo(total - 1);
      return;
    }
    goTo(currentIndex - 1);
  }, [currentIndex, goTo, loop, items.length]);

  const goNext = useCallback(() => {
    const total = items.length;
    if (!total) return;
    if (currentIndex >= total - 1) {
      if (hasMoreItems) {
        onLoadMoreRef.current?.();
      } else if (loop) {
        goTo(0);
      }
      return;
    }
    goTo(currentIndex + 1);
  }, [currentIndex, goTo, loop, items.length, hasMoreItems]);

  // Prefetch next API page when opening or navigating near the end of the loaded set
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    maybeLoadMore(currentIndex);
  }, [isOpen, currentIndex, items.length, maybeLoadMore]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, goPrev, goNext, onClose]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Download handler — fully self-contained state machine
  const handleDownload = useCallback(async () => {
    if (!onDownload || dlState === 'downloading') return;
    const item = items[currentIndex];
    if (!item) return;

    setDlState('downloading');
    try {
      await onDownload(item);
      setDlState('done');
      // Auto-reset to idle after 2.5 s so user can download again
      doneTimerRef.current = setTimeout(() => setDlState('idle'), 2500);
    } catch {
      setDlState('error');
      doneTimerRef.current = setTimeout(() => setDlState('idle'), 3000);
    }
  }, [onDownload, dlState, items, currentIndex]);

  const total = items.length;
  const thumbStripSlice = useMemo(() => {
    if (total <= 1) return { items: [] as LightboxItem[], offset: 0 };
    const start = Math.max(0, currentIndex - THUMB_STRIP_RADIUS);
    const end = Math.min(total, currentIndex + THUMB_STRIP_RADIUS + 1);
    return { items: items.slice(start, end), offset: start };
  }, [items, currentIndex, total]);

  if (!isOpen || items.length === 0) return null;
  const current = items[currentIndex];
  if (!current) return null;
  const displayTotal = totalCount != null && totalCount > total ? totalCount : total;
  const atEndLoading = hasMoreItems && isLoadingMore && currentIndex >= total - 1;

  // ── Download button appearance ──────────────────────────────────────────
  const dlConfig = {
    idle: { icon: <FaDownload className="h-3.5 w-3.5" />, label: 'Download', cls: 'bg-white/20 hover:bg-white/30' },
    downloading: { icon: <FaSpinner className="h-3.5 w-3.5 animate-spin" />, label: 'Downloading…', cls: 'bg-white/20 cursor-not-allowed' },
    done: { icon: <FaCheck className="h-3.5 w-3.5" />, label: 'Downloaded', cls: 'bg-green-500/80 hover:bg-green-500' },
    error: { icon: <FaExclamationTriangle className="h-3.5 w-3.5" />, label: 'Failed — retry', cls: 'bg-red-500/80 hover:bg-red-500' },
  }[dlState];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/50">
        <p className="text-white/60 text-sm tabular-nums shrink-0">
          {currentIndex + 1} / {displayTotal}
          {hasMoreItems && total < displayTotal ? '+' : ''}
        </p>
        <p className="text-white text-sm font-medium truncate mx-4 flex-1 text-center">
          {current.filename || current.alt}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {renderActions?.(current)}

          {onDownload && (
            <button
              type="button"
              onClick={dlState === 'error' ? handleDownload : handleDownload}
              disabled={dlState === 'downloading'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all duration-200 ${dlConfig.cls}`}
              title={dlConfig.label}
            >
              {dlConfig.icon}
              <span className="hidden sm:inline">{dlConfig.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>
      </div>

      {/* ── Main image area ── */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-30 transition-colors"
            aria-label="Previous image"
          >
            <FaChevronLeft className="text-lg" />
          </button>
        )}

        <div className="w-full h-full relative">
          {current.progressiveImage ? (
            <LightboxProgressiveView
              image={current.progressiveImage}
              alt={current.alt}
            />
          ) : (
            <LightboxImage
              src={current.src}
              thumbnailSrc={current.thumbnailSrc}
              alt={current.alt}
            />
          )}
          {atEndLoading && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white/90">
              <FaSpinner className="animate-spin" />
              Loading more…
            </div>
          )}
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-30 transition-colors"
            aria-label="Next image"
          >
            <FaChevronRight className="text-lg" />
          </button>
        )}
      </div>

      {/* ── Download progress bar — visible only while downloading ── */}
      {dlState === 'downloading' && (
        <div className="absolute bottom-[72px] left-0 right-0 h-0.5 bg-white/10 z-40 overflow-hidden">
          <div className="h-full bg-white/70 animate-[progress_1.8s_ease-in-out_infinite]"
            style={{ width: '60%', animation: 'lightbox-progress 1.8s ease-in-out infinite' }} />
        </div>
      )}

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-black/50 items-center"
          style={{ scrollbarWidth: 'none' }}>
          {thumbStripSlice.offset > 0 && (
            <span className="text-white/40 text-xs px-1 shrink-0">+{thumbStripSlice.offset}</span>
          )}
          {thumbStripSlice.items.map((item, localIdx) => {
            const idx = thumbStripSlice.offset + localIdx;
            const thumb = item.thumbnailSrc || item.src;
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${isActive ? 'border-white opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                aria-label={`Go to image ${idx + 1}`}
              >
                {thumb
                  ? <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  : <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs">{idx + 1}</div>
                }
              </button>
            );
          })}
          {thumbStripSlice.offset + thumbStripSlice.items.length < total && (
            <span className="text-white/40 text-xs px-1 shrink-0">
              +{total - thumbStripSlice.offset - thumbStripSlice.items.length}
            </span>
          )}
        </div>
      )}

      {/* Keyframe for indeterminate progress bar */}
      <style>{`
        @keyframes lightbox-progress {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(80%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Lightbox;
