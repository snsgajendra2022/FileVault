/** Backend variant payload from GET /api/images/user/all */

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
  variants?: ImageVariants;
}

const TIER_KEY_PATTERN = /^s(\d+)$/i;

export function getConnectionHint(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType;
}

export function getSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/** First paint: always full original. */
export function getBootstrapSrc(image: UserImageWithVariants): string {
  return image.previewUrl || image.thumbnailUrl || '';
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
  return image.thumbnailUrl || image.previewUrl || '';
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
    tierUrls,
  ].join(':');
}
