import type { ProgressiveFinalTarget, ProgressiveStrategy } from './progressiveImageConfig';
import { isHlsStreamUrl, isVideoMediaItem } from './videoPlayback';

export type VariantStatus = 'processing' | 'partial' | 'ready';

export interface VariantTier {
  available?: boolean;
  url?: string;
  maxEdgePx?: number;
  jpegQuality?: number;
  storedSize?: number;
}

export interface ImageVariants {
  status?: VariantStatus;
  readyCount?: number;
  expectedCount?: number;
  previewFallbackUrl?: string;
  recommendedUrl?: string;
  recommendedVariant?: string | null;
  thumbnailUrl?: string;
  thumbnailVariant?: string;
  autoUrl?: string;
  tiers?: Record<string, VariantTier>;
}

export interface UserImageWithVariants {
  id?: number | string;
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  thumbnailUrl: string;
  enabledServices?: { [key: string]: string };
  uploadTime: string;
  fileType: string;
  mediaType?: string;
  variants?: ImageVariants;
}

export { getConnectionHint, getSaveData } from './progressiveImageConfig';

const TIER_KEY_PATTERN = /^s(\d+)$/i;

function isVideoDisplayItem(image: UserImageWithVariants): boolean {
  return isVideoMediaItem(image) || isHlsStreamUrl(image.previewUrl) || isHlsStreamUrl(image.downloadUrl);
}

function stillImageUrl(url?: string | null): string {
  if (!url || isHlsStreamUrl(url)) return '';
  return url;
}

/** Gallery card: smallest/fastest src only (no variant ladder). */
export function getThumbnailSrc(image: UserImageWithVariants): string {
  const v = image.variants;
  if (isVideoDisplayItem(image)) {
    const videoThumb =
      stillImageUrl(image.thumbnailUrl) ||
      stillImageUrl(v?.thumbnailUrl) ||
      stillImageUrl(v?.previewFallbackUrl);
    if (videoThumb) return videoThumb;
  }
  if (v?.thumbnailUrl) return v.thumbnailUrl;
  if (image.thumbnailUrl) return image.thumbnailUrl;
  const thumbKey = v?.thumbnailVariant;
  if (thumbKey && v?.tiers?.[thumbKey]?.available && v.tiers[thumbKey].url) {
    return v.tiers[thumbKey].url!;
  }
  const ordered = getOrderedVariantUrls(image);
  if (ordered.length > 0) return ordered[0];
  if (v?.recommendedUrl) return v.recommendedUrl;
  return stillImageUrl(image.previewUrl) || '';
}

/** Single tier URL when marked available (e.g. s01). */
export function getTierSrc(image: UserImageWithVariants, tierKey: string): string | null {
  const tier = image.variants?.tiers?.[tierKey];
  if (tier?.available && tier.url) return tier.url;
  return null;
}

/**
 * Gallery grid display — prefer s01 variant for photos.
 * For videos, always use thumbnailUrl (never HLS m3u8 as an <img> src).
 */
export function getGalleryDisplaySrc(image: UserImageWithVariants): string {
  if (isVideoDisplayItem(image)) {
    return getThumbnailSrc(image);
  }

  const s01 = getTierSrc(image, 's01');
  if (s01) return s01;

  const ordered = getOrderedVariantUrls(image);
  if (ordered.length > 0) return ordered[0];

  const v = image.variants;
  if (v?.autoUrl) return v.autoUrl;
  if (v?.recommendedUrl) return v.recommendedUrl;
  if (v?.previewFallbackUrl) return v.previewFallbackUrl;
  return stillImageUrl(image.previewUrl) || stillImageUrl(image.thumbnailUrl) || '';
}

/** Ordered gallery candidates (no thumbnail for photos); used for img onError fallbacks. */
export function getGalleryDisplayCandidates(image: UserImageWithVariants): string[] {
  if (isVideoDisplayItem(image)) {
    const urls: string[] = [];
    const seen = new Set<string>();
    const push = (url?: string | null) => {
      const still = stillImageUrl(url);
      if (!still || seen.has(still)) return;
      seen.add(still);
      urls.push(still);
    };
    push(image.thumbnailUrl);
    push(image.variants?.thumbnailUrl);
    push(image.variants?.previewFallbackUrl);
    return urls;
  }

  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url?: string | null) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  push(getTierSrc(image, 's01'));
  for (const url of getOrderedVariantUrls(image)) push(url);

  const v = image.variants;
  push(v?.autoUrl);
  push(v?.recommendedUrl);
  push(v?.previewFallbackUrl);
  push(stillImageUrl(image.previewUrl));
  push(stillImageUrl(image.downloadUrl));

  return urls;
}

/** Lightbox first paint: lowest variant tier (s01). */
export function getFirstVariantSrc(image: UserImageWithVariants): string {
  const gallery = getGalleryDisplaySrc(image);
  if (gallery) return gallery;
  return image.previewUrl || '';
}

/** Full original (preview) — final step in lightbox ladder when distinct from tiers. */
export function getOriginalViewSrc(image: UserImageWithVariants): string {
  return (
    image.previewUrl ||
    image.variants?.previewFallbackUrl ||
    getUpgradeStopUrl(image) ||
    ''
  );
}

/** Lightbox ladder: s01 → … → recommended → final (deduped, no thumbnail). */
export function getProgressiveLadderUrls(
  image: UserImageWithVariants,
  finalTarget: 'original' | 'recommended' = 'original'
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const boot = getGalleryDisplaySrc(image);
  if (boot) {
    seen.add(boot);
    urls.push(boot);
  }
  for (const url of getOrderedVariantUrls(image)) {
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  const recommended = image.variants?.recommendedUrl;
  if (recommended && !seen.has(recommended)) {
    seen.add(recommended);
    urls.push(recommended);
  }
  const original = getOriginalViewSrc(image);
  const final =
    finalTarget === 'recommended' && recommended
      ? recommended
      : original || recommended;
  if (final && !seen.has(final)) {
    urls.push(final);
  }
  return urls;
}

/** Evenly subsample a ladder while keeping first and last. */
export function subsampleLadderUrls(urls: string[], maxSteps: number): string[] {
  if (urls.length <= maxSteps || maxSteps < 2) return urls;
  const first = urls[0];
  const last = urls[urls.length - 1];
  const middle = urls.slice(1, -1);
  const slots = maxSteps - 2;
  if (middle.length === 0 || slots <= 0) return [first, last];

  const picked: string[] = [];
  for (let i = 0; i < slots; i++) {
    const idx = Math.round(((i + 1) / (slots + 1)) * (middle.length - 1));
    const url = middle[idx];
    if (url && picked[picked.length - 1] !== url) picked.push(url);
  }
  return [first, ...picked, last];
}

export function buildViewLadder(
  image: UserImageWithVariants,
  strategy: ProgressiveStrategy,
  finalTarget: ProgressiveFinalTarget,
  maxSteps: number
): string[] {
  const full = getProgressiveLadderUrls(image, finalTarget);
  if (full.length === 0) return full;

  switch (strategy) {
    case 'quick': {
      const first = full[0];
      const last = full[full.length - 1];
      return first === last ? [first] : [first, last];
    }
    case 'step-on-load':
    case 'full':
      return subsampleLadderUrls(full, maxSteps);
    case 'smart':
    default:
      return subsampleLadderUrls(full, maxSteps);
  }
}

/** Human-readable quality hint for lightbox UI. */
export function getStepQualityLabel(
  stepIndex: number,
  totalSteps: number,
  isFinal: boolean
): string {
  if (totalSteps <= 1) return 'Loading…';
  if (isFinal) return 'Original';
  if (stepIndex <= 0) return 'Preview';
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  if (pct < 40) return 'Low';
  if (pct < 70) return 'Medium';
  return 'High';
}

/** @deprecated Use getFirstVariantSrc for lightbox; kept for callers that expect this name. */
export function getBootstrapSrc(image: UserImageWithVariants): string {
  return getFirstVariantSrc(image);
}

export function sortTierKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ma = a.match(TIER_KEY_PATTERN);
    const mb = b.match(TIER_KEY_PATTERN);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    return a.localeCompare(b);
  });
}

/** Ordered variant URLs (s01 → s10) that are available. */
export function getOrderedVariantUrls(image: UserImageWithVariants): string[] {
  const tiers = image.variants?.tiers;
  if (!tiers) return [];
  const keys = sortTierKeys(Object.keys(tiers));
  const urls: string[] = [];
  for (const key of keys) {
    const tier = tiers[key];
    if (tier?.available && tier.url) {
      urls.push(tier.url);
    }
  }
  return urls;
}

export function getUpgradeStopUrl(image: UserImageWithVariants): string | null {
  const recommended = image.variants?.recommendedUrl;
  if (recommended) return recommended;
  const ordered = getOrderedVariantUrls(image);
  return ordered.length > 0 ? ordered[ordered.length - 1] : null;
}

export function variantsNeedPolling(images: UserImageWithVariants[]): boolean {
  return images.some((img) => {
    const v = img.variants;
    if (!v) return false;
    if (v.status === 'processing') return true;
    if (v.status === 'partial') {
      const ready = v.readyCount ?? 0;
      const expected = v.expectedCount ?? 0;
      return expected > 0 && ready < expected;
    }
    return false;
  });
}

export function canStartVariantLadder(image: UserImageWithVariants): boolean {
  const status = image.variants?.status;
  if (!status || status === 'processing') return false;
  return getOrderedVariantUrls(image).length > 0;
}

export function fallbackStaticSrc(image: UserImageWithVariants): string {
  return getGalleryDisplaySrc(image) || image.previewUrl || '';
}

export function imageVariantsNeedPolling(image: UserImageWithVariants): boolean {
  const v = image.variants;
  if (!v) return false;
  if (v.status === 'processing') return true;
  if (v.status === 'partial') {
    const ready = v.readyCount ?? 0;
    const expected = v.expectedCount ?? 0;
    return expected > 0 && ready < expected;
  }
  return false;
}

/** Stable key so the ladder effect re-runs when variants change, not on every query object reference. */
export function getVariantsFingerprint(image: UserImageWithVariants): string {
  const v = image.variants;
  if (!v) return 'none';
  const tierUrls = getOrderedVariantUrls(image).join('|');
  return [
    v.status ?? '',
    v.readyCount ?? 0,
    v.expectedCount ?? 0,
    v.recommendedUrl ?? '',
    v.previewFallbackUrl ?? '',
    v.autoUrl ?? '',
    tierUrls,
  ].join(':');
}
