import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserImageWithVariants } from '../utils/progressiveImageVariants';
import {
  canStartVariantLadder,
  fallbackStaticSrc,
  getBootstrapSrc,
  getOrderedVariantUrls,
  getUpgradeStopUrl,
  getVariantsFingerprint,
} from '../utils/progressiveImageVariants';

const CROSSFADE_MS = 400;
const TIER_STEP_DELAY_MS = 80;

function preloadImage(url: string, signal: { cancelled: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || signal.cancelled) {
      resolve(false);
      return;
    }
    const img = new Image();
    const finish = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    img.onload = () => finish(!signal.cancelled);
    img.onerror = () => finish(false);
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      finish(!signal.cancelled);
    }
  });
}

function imageKey(image: UserImageWithVariants): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename;
}

export interface UseProgressiveImageSrcResult {
  baseSrc: string;
  overlaySrc: string | null;
  overlayVisible: boolean;
  markLoaded: () => void;
  markError: () => void;
}

/**
 * Starts on previewUrl; when variants are ready, preloads and crossfades through tiers silently.
 */
export function useProgressiveImageSrc(
  image: UserImageWithVariants,
  enabled: boolean
): UseProgressiveImageSrcResult {
  const boot = getBootstrapSrc(image) || fallbackStaticSrc(image);
  const [baseSrc, setBaseSrc] = useState(boot);
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const displaySrcRef = useRef(boot);
  const ladderRunRef = useRef(0);
  const imageIdRef = useRef(imageKey(image));
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageRef = useRef(image);
  imageRef.current = image;

  const variantsFingerprint = getVariantsFingerprint(image);
  const currentImageKey = imageKey(image);

  const applyCrossfade = useCallback((nextUrl: string) => {
    if (!nextUrl) return;
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    setOverlaySrc(nextUrl);
    setOverlayVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOverlayVisible(true));
    });
    crossfadeTimeoutRef.current = setTimeout(() => {
      crossfadeTimeoutRef.current = null;
      displaySrcRef.current = nextUrl;
      setBaseSrc(nextUrl);
      setOverlaySrc(null);
      setOverlayVisible(false);
    }, CROSSFADE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const key = currentImageKey;
    if (imageIdRef.current !== key) {
      imageIdRef.current = key;
      ladderRunRef.current += 1;
      const nextBoot = getBootstrapSrc(imageRef.current) || fallbackStaticSrc(imageRef.current);
      displaySrcRef.current = nextBoot;
      setBaseSrc(nextBoot);
      setOverlaySrc(null);
      setOverlayVisible(false);
    }
  }, [currentImageKey]);

  useEffect(() => {
    if (!enabled) return;

    const currentImage = imageRef.current;

    if (!currentImage.variants) {
      const staticSrc = fallbackStaticSrc(currentImage);
      if (staticSrc && displaySrcRef.current !== staticSrc) {
        displaySrcRef.current = staticSrc;
        setBaseSrc(staticSrc);
      }
      return;
    }

    const bootstrap = getBootstrapSrc(currentImage) || fallbackStaticSrc(currentImage);
    if (!canStartVariantLadder(currentImage)) {
      if (bootstrap && displaySrcRef.current !== bootstrap) {
        displaySrcRef.current = bootstrap;
        setBaseSrc(bootstrap);
      }
      return;
    }

    const runId = ++ladderRunRef.current;
    const signal = { cancelled: false };

    const runLadder = async () => {
      const tiers = getOrderedVariantUrls(currentImage);
      const stopUrl = getUpgradeStopUrl(currentImage);
      let current = displaySrcRef.current || bootstrap;

      for (const url of tiers) {
        if (signal.cancelled || ladderRunRef.current !== runId) return;
        if (!url || url === current) continue;
        if (stopUrl && current === stopUrl) break;

        const ok = await preloadImage(url, signal);
        if (signal.cancelled || ladderRunRef.current !== runId) return;
        if (!ok) continue;

        applyCrossfade(url);
        current = url;
        await new Promise((r) => window.setTimeout(r, CROSSFADE_MS + TIER_STEP_DELAY_MS));
        if (stopUrl && current === stopUrl) break;
      }
    };

    const startTimer = window.setTimeout(runLadder, 120);

    return () => {
      signal.cancelled = true;
      window.clearTimeout(startTimer);
      ladderRunRef.current += 1;
    };
  }, [enabled, currentImageKey, variantsFingerprint, applyCrossfade]);

  const markLoaded = useCallback(() => {}, []);
  const markError = useCallback(() => {}, []);

  return {
    baseSrc,
    overlaySrc,
    overlayVisible,
    markLoaded,
    markError,
  };
}
