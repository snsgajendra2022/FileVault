/**
 * useImageLoader - Hook for loading a single image with status tracking
 * 
 * Handles loading, error, and retry states for a single image URL.
 * Integrates with the preload cache for instant display when cached.
 */

import { useState, useEffect, useRef } from 'react';
import { getImagePreloadManager } from './ImagePreloadManager';

export type ImageLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface UseImageLoaderOptions {
  url: string | null;
  /** Thumbnail URL to show while loading */
  thumbnailUrl?: string | null;
  /** Whether to use the preload cache */
  useCache?: boolean;
  /** Retry attempts on failure */
  retryAttempts?: number;
}

interface UseImageLoaderResult {
  status: ImageLoadStatus;
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  /** The URL to display (may be thumbnail while loading) */
  displayUrl: string | null;
  /** Whether we're showing the thumbnail placeholder */
  isShowingPlaceholder: boolean;
  retry: () => void;
}

export function useImageLoader({
  url,
  thumbnailUrl,
  useCache = true,
  retryAttempts = 3,
}: UseImageLoaderOptions): UseImageLoaderResult {
  const [status, setStatus] = useState<ImageLoadStatus>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      return;
    }

    // Check preload cache first
    if (useCache) {
      const manager = getImagePreloadManager();
      if (manager.isLoaded(url)) {
        setStatus('loaded');
        return;
      }
    }

    setStatus('loading');

    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      if (mountedRef.current) {
        setStatus('loaded');
      }
    };

    img.onerror = () => {
      if (mountedRef.current) {
        if (retryCount < retryAttempts) {
          // Auto-retry with delay
          const delay = 1000 * (retryCount + 1);
          setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount((c) => c + 1);
            }
          }, delay);
        } else {
          setStatus('error');
        }
      }
    };

    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url, retryCount, useCache, retryAttempts]);

  const retry = () => {
    setRetryCount(0);
    setStatus('idle');
  };

  const isLoaded = status === 'loaded';
  const isLoading = status === 'loading';
  const isShowingPlaceholder = isLoading && !!thumbnailUrl;

  return {
    status,
    isLoading,
    isLoaded,
    isError: status === 'error',
    displayUrl: isLoaded ? url : isShowingPlaceholder ? thumbnailUrl! : null,
    isShowingPlaceholder,
    retry,
  };
}
