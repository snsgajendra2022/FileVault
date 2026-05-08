/**
 * ImagePreloadManager - Advanced image preloading and caching system
 * 
 * Features:
 * - Smart sliding-window preload strategy
 * - Memory-efficient cache management
 * - Directional preloading (forward/backward)
 * - Automatic cache cleanup
 * - Retry logic for failed loads
 * - No quality loss or compression
 */

interface PreloadConfig {
  maxCacheSize: number;        // Maximum images to keep in cache
  preloadNext: number;          // Number of images to preload ahead
  preloadPrev: number;          // Number of images to preload behind
  retryAttempts: number;        // Number of retry attempts for failed loads
  retryDelay: number;           // Delay between retries (ms)
}

interface CacheEntry {
  url: string;
  image: HTMLImageElement;
  timestamp: number;
  loadedAt: number;
  size?: number;
}

interface PreloadRequest {
  url: string;
  priority: number;
  index: number;
}

type PreloadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ImageStatus {
  url: string;
  status: PreloadStatus;
  error?: Error;
  retries: number;
}

export class ImagePreloadManager {
  private cache: Map<string, CacheEntry> = new Map();
  private loadingQueue: Map<string, Promise<HTMLImageElement>> = new Map();
  private statusMap: Map<string, ImageStatus> = new Map();
  private config: PreloadConfig;
  private lastDirection: 'forward' | 'backward' | null = null;
  private lastIndex: number = -1;

  constructor(config?: Partial<PreloadConfig>) {
    this.config = {
      maxCacheSize: 100,          // Keep all viewed images in session
      preloadNext: 2,
      preloadPrev: 1,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Main preload method - called when user navigates to a new image
   */
  async preloadForIndex(
    currentIndex: number,
    urls: string[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    if (urls.length === 0) return;

    // Detect navigation direction
    const direction = this.detectDirection(currentIndex);
    this.lastIndex = currentIndex;

    // Build preload queue with priorities
    const requests = this.buildPreloadQueue(currentIndex, urls, direction);

    // Execute preload requests
    const promises = requests.map((req) => 
      this.preloadImage(req.url, req.priority)
    );

    // Track progress
    let loaded = 0;
    promises.forEach((promise) => {
      promise.then(() => {
        loaded++;
        onProgress?.(loaded, promises.length);
      }).catch(() => {
        loaded++;
        onProgress?.(loaded, promises.length);
      });
    });

    // Wait for critical images (current + immediate neighbors)
    const criticalPromises = promises.slice(0, Math.min(3, promises.length));
    await Promise.allSettled(criticalPromises);

    // Cleanup old cache entries
    this.cleanupCache(currentIndex, urls);
  }

  /**
   * Preload a single image with retry logic
   */
  private async preloadImage(
    url: string,
    priority: number = 0
  ): Promise<HTMLImageElement> {
    // Return cached image if available
    const cached = this.cache.get(url);
    if (cached) {
      cached.timestamp = Date.now(); // Update LRU timestamp
      return cached.image;
    }

    // Return existing loading promise if in progress
    const existing = this.loadingQueue.get(url);
    if (existing) {
      return existing;
    }

    // Create new load promise
    const loadPromise = this.loadImageWithRetry(url, priority);
    this.loadingQueue.set(url, loadPromise);

    try {
      const image = await loadPromise;
      
      // Add to cache
      this.cache.set(url, {
        url,
        image,
        timestamp: Date.now(),
        loadedAt: Date.now(),
      });

      // Update status
      this.statusMap.set(url, {
        url,
        status: 'loaded',
        retries: 0,
      });

      return image;
    } catch (error) {
      // Update error status
      this.statusMap.set(url, {
        url,
        status: 'error',
        error: error as Error,
        retries: this.statusMap.get(url)?.retries || 0,
      });
      throw error;
    } finally {
      this.loadingQueue.delete(url);
    }
  }

  /**
   * Load image with retry logic
   */
  private async loadImageWithRetry(
    url: string,
    priority: number,
    attempt: number = 0
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve(img);
      };

      img.onerror = async () => {
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * (attempt + 1));
          try {
            const retried = await this.loadImageWithRetry(url, priority, attempt + 1);
            resolve(retried);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Failed to load image after ${attempt} attempts: ${url}`));
        }
      };

      img.src = url;
    });
  }

  /**
   * Build prioritized preload queue based on current index and direction
   */
  private buildPreloadQueue(
    currentIndex: number,
    urls: string[],
    direction: 'forward' | 'backward' | null
  ): PreloadRequest[] {
    const requests: PreloadRequest[] = [];
    const total = urls.length;

    // Current image - highest priority
    requests.push({
      url: urls[currentIndex],
      priority: 10,
      index: currentIndex,
    });

    // Directional preloading
    if (direction === 'forward' || direction === null) {
      // Preload next images
      for (let i = 1; i <= this.config.preloadNext; i++) {
        const idx = (currentIndex + i) % total;
        requests.push({
          url: urls[idx],
          priority: 10 - i,
          index: idx,
        });
      }

      // Preload previous images (lower priority)
      for (let i = 1; i <= this.config.preloadPrev; i++) {
        const idx = (currentIndex - i + total) % total;
        requests.push({
          url: urls[idx],
          priority: 5 - i,
          index: idx,
        });
      }
    } else {
      // Backward navigation - prioritize previous images
      for (let i = 1; i <= this.config.preloadNext; i++) {
        const idx = (currentIndex - i + total) % total;
        requests.push({
          url: urls[idx],
          priority: 10 - i,
          index: idx,
        });
      }

      // Preload next images (lower priority)
      for (let i = 1; i <= this.config.preloadPrev; i++) {
        const idx = (currentIndex + i) % total;
        requests.push({
          url: urls[idx],
          priority: 5 - i,
          index: idx,
        });
      }
    }

    return requests;
  }

  /**
   * Detect navigation direction
   */
  private detectDirection(currentIndex: number): 'forward' | 'backward' | null {
    if (this.lastIndex === -1) {
      return null;
    }

    if (currentIndex > this.lastIndex) {
      this.lastDirection = 'forward';
    } else if (currentIndex < this.lastIndex) {
      this.lastDirection = 'backward';
    }

    return this.lastDirection;
  }

  /**
   * Cleanup cache - remove images far from current index
   */
  private cleanupCache(currentIndex: number, urls: string[]): void {
    if (this.cache.size <= this.config.maxCacheSize) {
      return;
    }

    const total = urls.length;
    const keepRange = this.config.preloadNext + this.config.preloadPrev + 1;

    // Identify URLs to keep
    const keepUrls = new Set<string>();
    for (let i = -this.config.preloadPrev; i <= this.config.preloadNext; i++) {
      const idx = (currentIndex + i + total) % total;
      keepUrls.add(urls[idx]);
    }

    // Remove old entries (LRU)
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    let removed = 0;
    for (const [url, entry] of entries) {
      if (this.cache.size <= this.config.maxCacheSize) {
        break;
      }

      if (!keepUrls.has(url)) {
        this.cache.delete(url);
        this.statusMap.delete(url);
        
        // Help garbage collection
        entry.image.src = '';
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[ImagePreloadManager] Cleaned up ${removed} cached images`);
    }
  }

  /**
   * Get cached image if available
   */
  getCachedImage(url: string): HTMLImageElement | null {
    const cached = this.cache.get(url);
    if (cached) {
      cached.timestamp = Date.now(); // Update LRU
      return cached.image;
    }
    return null;
  }

  /**
   * Check if image is loaded
   */
  isLoaded(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Check if image is currently loading
   */
  isLoading(url: string): boolean {
    return this.loadingQueue.has(url);
  }

  /**
   * Get image status
   */
  getStatus(url: string): PreloadStatus {
    return this.statusMap.get(url)?.status || 'idle';
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingQueue.size,
      maxCacheSize: this.config.maxCacheSize,
    };
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.forEach((entry) => {
      entry.image.src = '';
    });
    this.cache.clear();
    this.loadingQueue.clear();
    this.statusMap.clear();
    this.lastIndex = -1;
    this.lastDirection = null;
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Prefetch images in background (low priority)
   */
  async prefetchRange(
    startIndex: number,
    endIndex: number,
    urls: string[]
  ): Promise<void> {
    const requests: PreloadRequest[] = [];
    
    for (let i = startIndex; i <= endIndex && i < urls.length; i++) {
      requests.push({
        url: urls[i],
        priority: 1,
        index: i,
      });
    }

    // Load in background without blocking
    requests.forEach((req) => {
      this.preloadImage(req.url, req.priority).catch(() => {
        // Ignore errors for background prefetch
      });
    });
  }
}

// Singleton instance
let managerInstance: ImagePreloadManager | null = null;

export function getImagePreloadManager(config?: Partial<PreloadConfig>): ImagePreloadManager {
  if (!managerInstance) {
    managerInstance = new ImagePreloadManager(config);
  }
  return managerInstance;
}

export function resetImagePreloadManager(): void {
  if (managerInstance) {
    managerInstance.clearCache();
    managerInstance = null;
  }
}
