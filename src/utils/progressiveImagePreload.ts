const preloadCache = new Set<string>();
const inflightPreloads = new Map<string, Promise<boolean>>();

export function isImagePreloaded(url: string): boolean {
  return !!url && preloadCache.has(url);
}

export function preloadImageUrl(url: string, signal: { cancelled: boolean }): Promise<boolean> {
  if (!url || signal.cancelled) return Promise.resolve(false);
  if (preloadCache.has(url)) return Promise.resolve(true);

  const existing = inflightPreloads.get(url);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    const finish = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      inflightPreloads.delete(url);
      if (ok) preloadCache.add(url);
      resolve(ok);
    };
    img.onload = () => finish(!signal.cancelled);
    img.onerror = () => finish(false);
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      finish(!signal.cancelled);
    }
  });

  inflightPreloads.set(url, promise);
  return promise;
}

export function preloadManyParallel(urls: string[], signal: { cancelled: boolean }): void {
  for (const url of urls) {
    if (url && !preloadCache.has(url)) preloadImageUrl(url, signal);
  }
}

export function clearProgressivePreloadCache(): void {
  preloadCache.clear();
  inflightPreloads.clear();
}
