/**
 * useLightboxPreloader - React hook for lightbox image preloading
 * 
 * Manages the sliding-window preload strategy for a lightbox/gallery.
 * Handles direction detection, cache management, and loading states.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getImagePreloadManager, resetImagePreloadManager } from './ImagePreloadManager';

export type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface LightboxPreloaderOptions {
  /** All image URLs in the gallery */
  urls: string[];
  /** Currently active index */
  currentIndex: number;
  /** Whether the lightbox is open */
  enabled: boolean;
  /** Number of images to preload ahead */
  preloadNext?: number;
  /** Number of images to keep behind */
  preloadPrev?: number;
  /** Max images to keep in memory */
  maxCacheSize?: number;
}

interface LightboxPreloaderResult {
  /** Whether the current image is ready to display */
  isCurrentReady: boolean;
  /** Whether the current image is loading */
  isCurrentLoading: boolean;
  /** Whether the current image failed to load */
  isCurrentError: boolean;
  /** Thumbnail URL to show while loading (blurred placeholder) */
  placeholderUrl: string | null;
  /** Trigger navigation to a new index */
  navigateTo: (index: number) => void;
  /** Cache stats for debugging */
  cacheStats: { cacheSize: number; loadingCount: number };
}

export function useLightboxPreloader({
  urls,
  currentIndex,
  enabled,
  preloadNext = 2,
  preloadPrev = 1,
  maxCacheSize = 20,
}: LightboxPreloaderOptions): LightboxPreloaderResult {
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const [cacheStats, setCacheStats] = useState({ cacheSize: 0, loadingCount: 0 });
  const prevIndexRef = useRef<number>(-1);
  const currentUrlRef = useRef<string>('');
  const mountedRef = useRef(true);

  // Get or create manager
  const manager = getImagePreloadManager({
    preloadNext,
    preloadPrev,
    maxCacheSize,
    retryAttempts: 3,
    retryDelay: 800,
  });

  const currentUrl = urls[currentIndex] ?? '';

  // Preload when index or urls change
  useEffect(() => {
    if (!enabled || urls.length === 0 || !currentUrl) {
      return;
    }

    mountedRef.current = true;

    // If already cached, mark as loaded immediately
    if (manager.isLoaded(currentUrl)) {
      if (mountedRef.current) {
        setLoadState('loaded');
        currentUrlRef.current = currentUrl;
      }
    } else {
      // Show loading state
      if (mountedRef.current) {
        setLoadState('loading');
      }
    }

    // Trigger preload for current window
    manager.preloadForIndex(currentIndex, urls).then(() => {
      if (mountedRef.current && currentUrlRef.current !== currentUrl) {
        // Check if current image is now loaded
        if (manager.isLoaded(currentUrl)) {
          setLoadState('loaded');
          currentUrlRef.current = currentUrl;
        }
      }
    }).catch(() => {
      if (mountedRef.current) {
        setLoadState('error');
      }
    });

    // Update stats
    setCacheStats(manager.getStats());
    prevIndexRef.current = currentIndex;

    return () => {
      mountedRef.current = false;
    };
  }, [currentIndex, urls, enabled, currentUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Navigate to a specific index
  const navigateTo = useCallback((index: number) => {
    if (index < 0 || index >= urls.length) return;
    // Navigation is handled by parent; this just triggers preload
    manager.preloadForIndex(index, urls).catch(() => {});
  }, [urls, manager]);

  // Determine placeholder URL (thumbnail of current image for blur-up effect)
  const placeholderUrl = currentUrl || null;

  return {
    isCurrentReady: loadState === 'loaded' || manager.isLoaded(currentUrl),
    isCurrentLoading: loadState === 'loading' && !manager.isLoaded(currentUrl),
    isCurrentError: loadState === 'error',
    placeholderUrl,
    navigateTo,
    cacheStats,
  };
}
