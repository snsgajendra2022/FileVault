/**
 * Lightbox - Full-screen image viewer with advanced preloading
 * 
 * Handles 1000+ high-resolution images with:
 * - Sliding-window preload strategy
 * - Directional preloading (forward/backward)
 * - Keyboard navigation
 * - Touch/swipe support
 * - Thumbnail strip
 * - Download support
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaSpinner,
} from 'react-icons/fa';
import LightboxImage from './LightboxImage';
import { getImagePreloadManager } from '../../utils/imagePreloader/ImagePreloadManager';

export interface LightboxItem {
  id: number | string;
  /** Full-resolution URL */
  src: string | null;
  /** Thumbnail URL for blur-up placeholder */
  thumbnailSrc?: string | null;
  alt: string;
  filename?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: LightboxItem) => void;
  isDownloading?: boolean;
  /** Render extra actions in the top bar */
  renderActions?: (item: LightboxItem) => React.ReactNode;
}

const PRELOAD_NEXT = 2;
const PRELOAD_PREV = 1;
const MAX_CACHE = 100; // Keep all viewed images — never evict on a normal session

const Lightbox: React.FC<LightboxProps> = ({
  items,
  initialIndex,
  isOpen,
  onClose,
  onDownload,
  isDownloading,
  renderActions,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const manager = getImagePreloadManager({
    preloadNext: PRELOAD_NEXT,
    preloadPrev: PRELOAD_PREV,
    maxCacheSize: MAX_CACHE,
  });

  // Sync index when initialIndex changes (e.g. user clicks different image)
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  // Trigger preload window whenever index changes
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const urls = items.map((item) => item.src).filter(Boolean) as string[];
    if (urls.length === 0) return;

    // Preload current window
    manager.preloadForIndex(currentIndex, urls).catch(() => {});
  }, [currentIndex, items, isOpen]);

  // Cleanup cache when lightbox closes
  useEffect(() => {
    if (!isOpen) {
      // Don't clear — keep cache warm for re-open
    }
  }, [isOpen]);

  const goTo = useCallback(
    (index: number) => {
      const total = items.length;
      if (total === 0) return;
      const next = (index + total) % total;
      setCurrentIndex(next);
    },
    [items.length]
  );

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, goPrev, goNext, onClose]);

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!isOpen || items.length === 0) return null;

  const current = items[currentIndex];
  if (!current) return null;

  const total = items.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/40">
        <p className="text-white/60 text-sm tabular-nums">
          {currentIndex + 1} / {total}
        </p>
        <p className="text-white text-sm font-medium truncate max-w-[40vw]">
          {current.filename || current.alt}
        </p>
        <div className="flex items-center gap-2">
          {renderActions?.(current)}
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(current)}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm disabled:opacity-50 transition-colors"
              title="Download"
            >
              {isDownloading ? (
                <FaSpinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FaDownload className="h-3.5 w-3.5" />
              )}
              Download
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
        {/* Prev button — floats over image */}
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

        {/* Image fills the entire area — NOT keyed so it never remounts */}
        <div className="w-full h-full">
          <LightboxImage
            src={current.src}
            thumbnailSrc={current.thumbnailSrc}
            alt={current.alt}
          />
        </div>

        {/* Next button — floats over image */}
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

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide bg-black/40">
          {items.map((item, idx) => {
            const thumb = item.thumbnailSrc || item.src;
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-white opacity-100 scale-105'
                    : 'border-transparent opacity-50 hover:opacity-80'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs">
                    {idx + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
};

export default Lightbox;
