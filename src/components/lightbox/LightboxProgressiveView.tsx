import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc';
import { LIGHTBOX_PROGRESSIVE_OPTIONS } from '../../utils/progressiveImageConfig';
import {
  getFirstVariantSrc,
  getThumbnailSrc,
  type UserImageWithVariants,
} from '../../utils/progressiveImageVariants';

interface LightboxProgressiveViewProps {
  image: UserImageWithVariants;
  alt: string;
}

function resolveImageKey(image: UserImageWithVariants): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename;
}

/** Synchronously check whether a URL is already in the browser cache. */
function isInBrowserCache(url: string): boolean {
  if (!url) return false;
  const probe = new window.Image();
  probe.src = url;
  return probe.complete && probe.naturalWidth > 0;
}

/**
 * Lightbox image viewer with seamless navigation.
 *
 * Navigation model:
 *   • Outgoing layer (previous image) is shown at full opacity and only fades
 *     out AFTER the new base <img> fires onLoad — so the user NEVER sees blank.
 *   • If the new boot frame is already in the browser cache the transition is
 *     instant (no outgoing shown — avoids unnecessary animation noise).
 *   • Step-up ladder: thumb → mid-quality → original with 150 ms crossfades.
 */
const LightboxProgressiveView = memo(function LightboxProgressiveView({
  image,
  alt,
}: LightboxProgressiveViewProps) {
  const progressive = useProgressiveImageSrc(
    image,
    true,
    'progressive',
    LIGHTBOX_PROGRESSIVE_OPTIONS
  );
  const { baseSrc, overlaySrc, overlayVisible, isUpgrading, stepIndex, totalSteps } = progressive;

  // ── Track the latest non-empty baseSrc synchronously during render ──────
  // (before any effect fires, so useLayoutEffect can capture it as "outgoing")
  const latestSrcRef = useRef<string | null>(null);
  if (baseSrc) latestSrcRef.current = baseSrc;

  const imageKey = resolveImageKey(image);
  const prevKeyRef = useRef<string | null>(null);

  // ── Outgoing layer ────────────────────────────────────────────────────────
  const [outgoingSrc, setOutgoingSrc] = useState<string | null>(null);
  const [outgoingVisible, setOutgoingVisible] = useState(false);
  // true = waiting for the new base <img> to fire onLoad before hiding outgoing
  const awaitingBaseLoadRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startOutgoingFade = useCallback(() => {
    awaitingBaseLoadRef.current = false;
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setOutgoingVisible(false); // CSS transition: opacity 1 → 0
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setOutgoingSrc(null), 430);
  }, []);

  // Fires in layout phase — before the hook's useEffect resets baseSrc —
  // so latestSrcRef still holds the previous image's src.
  useLayoutEffect(() => {
    if (prevKeyRef.current !== null && prevKeyRef.current !== imageKey) {
      const snap = latestSrcRef.current;
      if (snap) {
        // If the new image's first frame is already in the browser cache, skip
        // the outgoing overlay entirely — the swap is imperceptibly fast.
        const newBoot = getFirstVariantSrc(image) || getThumbnailSrc(image) || '';
        if (isInBrowserCache(newBoot)) {
          prevKeyRef.current = imageKey;
          return;
        }

        // Not cached yet — hold the previous frame as an opaque cover until the
        // new base image fires onLoad (max 2 s fallback to avoid stale overlay).
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

        setOutgoingSrc(snap);
        setOutgoingVisible(true);
        awaitingBaseLoadRef.current = true;

        fallbackTimerRef.current = setTimeout(startOutgoingFade, 2000);
      }
    }
    prevKeyRef.current = imageKey;
  }, [imageKey, image, startOutgoingFade]);

  // Called when the base <img> fires onLoad.
  const handleBaseLoad = useCallback(() => {
    if (!awaitingBaseLoadRef.current) return; // step-up onLoad — ignore
    startOutgoingFade();
  }, [startOutgoingFade]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!baseSrc && !outgoingSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        Loading…
      </div>
    );
  }

  const isFinal = !isUpgrading && stepIndex >= totalSteps - 1;
  const progress = totalSteps > 1 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 100;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {/* Layer 1 — base: current displayed frame of the new image */}
      {baseSrc && (
        <img
          src={baseSrc}
          alt={alt}
          draggable={false}
          decoding="async"
          onLoad={handleBaseLoad}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {/* Layer 2 — step-up overlay: higher-quality crossfade within same image */}
      {overlaySrc && (
        <img
          src={overlaySrc}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[150ms] ease-in-out will-change-[opacity]"
          style={{ opacity: overlayVisible ? 1 : 0 }}
        />
      )}

      {/* Layer 3 — outgoing: previous image held until new base is loaded */}
      {outgoingSrc && (
        <img
          src={outgoingSrc}
          alt=""
          aria-hidden
          draggable={false}
          decoding="sync"
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[400ms] ease-out will-change-[opacity]"
          style={{ opacity: outgoingVisible ? 1 : 0 }}
        />
      )}

      {/* Quality-progress bar — visible only during step-up */}
      {!isFinal && totalSteps > 1 && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-white/10"
          aria-hidden
        >
          <div
            className="h-full bg-white/50 transition-[width] duration-[150ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

    </div>
  );
});

export default LightboxProgressiveView;
