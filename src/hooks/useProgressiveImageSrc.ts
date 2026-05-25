import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveProgressiveViewOptions,
  type ProgressiveViewOptions,
} from '../utils/progressiveImageConfig';
import { preloadImageUrl, preloadManyParallel } from '../utils/progressiveImagePreload';
import type { UserImageWithVariants } from '../utils/progressiveImageVariants';
import {
  buildViewLadder,
  canStartVariantLadder,
  fallbackStaticSrc,
  getFirstVariantSrc,
  getOriginalViewSrc,
  getStepQualityLabel,
  getThumbnailSrc,
  getVariantsFingerprint,
} from '../utils/progressiveImageVariants';

export type ProgressiveDisplayMode = 'thumbnail' | 'progressive';

export interface UseProgressiveImageSrcResult {
  baseSrc: string;
  overlaySrc: string | null;
  overlayVisible: boolean;
  /** 0-based index in the view ladder */
  stepIndex: number;
  totalSteps: number;
  isUpgrading: boolean;
  qualityLabel: string;
  strategy: string;
  markLoaded: () => void;
  markError: () => void;
}

function imageKey(image: UserImageWithVariants): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/**
 * Gallery: thumbnail only.
 * Lightbox: configurable ladder (smart / step-on-load / quick / full).
 */
export function useProgressiveImageSrc(
  image: UserImageWithVariants,
  enabled: boolean,
  mode: ProgressiveDisplayMode = 'progressive',
  options?: Partial<ProgressiveViewOptions>
): UseProgressiveImageSrcResult {
  const viewOptions = useMemo(
    () => resolveProgressiveViewOptions(options),
    [
      options?.strategy,
      options?.finalTarget,
      options?.preloadParallel,
      options?.crossfadeMs,
      options?.minStepMs,
      options?.maxSteps,
      options?.connectionAware,
    ]
  );

  const boot =
    mode === 'thumbnail'
      ? getThumbnailSrc(image) || fallbackStaticSrc(image)
      : getFirstVariantSrc(image) || fallbackStaticSrc(image);

  const [baseSrc, setBaseSrc] = useState(boot);
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(1);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const displaySrcRef = useRef(boot);
  const ladderRunRef = useRef(0);
  const imageIdRef = useRef(imageKey(image));
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageRef = useRef(image);
  imageRef.current = image;
  const optionsRef = useRef(viewOptions);
  optionsRef.current = viewOptions;

  const variantsFingerprint = getVariantsFingerprint(image);
  const currentImageKey = imageKey(image);

  const qualityLabel = useMemo(
    () => getStepQualityLabel(stepIndex, totalSteps, stepIndex >= totalSteps - 1 && !isUpgrading),
    [stepIndex, totalSteps, isUpgrading]
  );

  const commitDisplay = useCallback((url: string, index: number, total: number, upgrading: boolean) => {
    if (url && displaySrcRef.current !== url) {
      displaySrcRef.current = url;
      setBaseSrc(url);
    }
    setStepIndex(index);
    setTotalSteps(total);
    setIsUpgrading(upgrading);
  }, []);

  const applyStep = useCallback(
    async (url: string, index: number, total: number, signal: { cancelled: boolean }) => {
      const opts = optionsRef.current;
      if (opts.crossfadeMs > 0 && displaySrcRef.current && displaySrcRef.current !== url) {
        if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
        setOverlaySrc(url);
        setOverlayVisible(false);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        setOverlayVisible(true);
        await delay(opts.crossfadeMs);
        if (signal.cancelled) return;
        displaySrcRef.current = url;
        setBaseSrc(url);
        setOverlaySrc(null);
        setOverlayVisible(false);
      } else {
        displaySrcRef.current = url;
        setBaseSrc(url);
      }
      setStepIndex(index);
      setTotalSteps(total);
      setIsUpgrading(index < total - 1);
      if (opts.minStepMs > 0 && index < total - 1) {
        await delay(opts.minStepMs);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const key = currentImageKey;
    if (imageIdRef.current !== key) {
      imageIdRef.current = key;
      ladderRunRef.current += 1;
      const nextBoot =
        mode === 'thumbnail'
          ? getThumbnailSrc(imageRef.current) || fallbackStaticSrc(imageRef.current)
          : getFirstVariantSrc(imageRef.current) || fallbackStaticSrc(imageRef.current);
      displaySrcRef.current = nextBoot;
      setBaseSrc(nextBoot);
      setOverlaySrc(null);
      setOverlayVisible(false);
      setStepIndex(0);
      setTotalSteps(1);
      setIsUpgrading(false);
    }
  }, [currentImageKey, mode]);

  useEffect(() => {
    if (!enabled) return;

    const currentImage = imageRef.current;
    const opts = optionsRef.current;

    if (mode === 'thumbnail') {
      const thumb = getThumbnailSrc(currentImage) || fallbackStaticSrc(currentImage);
      if (thumb) commitDisplay(thumb, 0, 1, false);
      return;
    }

    const ladder = buildViewLadder(
      currentImage,
      opts.strategy,
      opts.finalTarget,
      opts.maxSteps
    );
    const first = ladder[0] || getFirstVariantSrc(currentImage) || fallbackStaticSrc(currentImage);
    const total = Math.max(ladder.length, 1);

    commitDisplay(first, 0, total, total > 1);

    const runId = ++ladderRunRef.current;
    const signal = { cancelled: false };

    const runLadder = async () => {
      if (ladder.length <= 1) {
        const only = getOriginalViewSrc(currentImage) || fallbackStaticSrc(currentImage);
        if (only && only !== first && (await preloadImageUrl(only, signal))) {
          if (!signal.cancelled && ladderRunRef.current === runId) {
            await applyStep(only, 0, 1, signal);
            setIsUpgrading(false);
          }
        }
        return;
      }

      if (!canStartVariantLadder(currentImage)) {
        const original = getOriginalViewSrc(currentImage) || first;
        if (original !== first && (await preloadImageUrl(original, signal))) {
          if (!signal.cancelled && ladderRunRef.current === runId) {
            await applyStep(original, total - 1, total, signal);
            setIsUpgrading(false);
          }
        }
        return;
      }

      if (opts.preloadParallel) {
        preloadManyParallel(ladder.slice(1), signal);
      }

      for (let i = 1; i < ladder.length; i++) {
        if (signal.cancelled || ladderRunRef.current !== runId) return;
        const url = ladder[i];
        if (!url) continue;

        const ok = await preloadImageUrl(url, signal);
        if (signal.cancelled || ladderRunRef.current !== runId) return;
        if (!ok) continue;

        await applyStep(url, i, total, signal);
      }

      if (!signal.cancelled && ladderRunRef.current === runId) {
        setIsUpgrading(false);
      }
    };

    runLadder();

    return () => {
      signal.cancelled = true;
      ladderRunRef.current += 1;
    };
  }, [
    enabled,
    mode,
    currentImageKey,
    variantsFingerprint,
    commitDisplay,
    applyStep,
    viewOptions.strategy,
    viewOptions.finalTarget,
    viewOptions.maxSteps,
  ]);

  const markLoaded = useCallback(() => {}, []);
  const markError = useCallback(() => {}, []);

  return {
    baseSrc,
    overlaySrc,
    overlayVisible,
    stepIndex,
    totalSteps,
    isUpgrading,
    qualityLabel,
    strategy: viewOptions.strategy,
    markLoaded,
    markError,
  };
}
