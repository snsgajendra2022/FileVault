import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { UserImageWithVariants } from '../../utils/progressiveImageVariants';
import {
  getGalleryDisplayCandidates,
  getVariantsFingerprint,
} from '../../utils/progressiveImageVariants';
import {
  useProgressiveImageSrc,
  type ProgressiveDisplayMode,
} from '../../hooks/useProgressiveImageSrc';
import type { ProgressiveViewOptions } from '../../utils/progressiveImageConfig';

export interface ProgressiveImageProps {
  image: UserImageWithVariants;
  enabled: boolean;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  /** Gallery cards use s01 variants; lightbox uses progressive upgrades. */
  mode?: ProgressiveDisplayMode;
  viewOptions?: Partial<ProgressiveViewOptions>;
}

function imageKey(image: UserImageWithVariants): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename;
}

const ProgressiveImage = memo(function ProgressiveImage({
  image,
  enabled,
  alt,
  className = 'h-full w-full object-cover',
  onLoad,
  onError,
  mode = 'thumbnail',
  viewOptions,
}: ProgressiveImageProps) {
  const { baseSrc, overlaySrc, overlayVisible, markLoaded, markError } =
    useProgressiveImageSrc(image, enabled, mode, viewOptions);

  const variantsFingerprint = getVariantsFingerprint(image);
  const currentImageKey = imageKey(image);

  const galleryCandidates = useMemo(() => {
    if (mode !== 'gallery') return [];
    return getGalleryDisplayCandidates(image);
  }, [mode, image, variantsFingerprint]);

  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    setFallbackIndex(0);
  }, [currentImageKey, variantsFingerprint, mode]);

  const displaySrc =
    mode === 'gallery'
      ? galleryCandidates[fallbackIndex] || baseSrc
      : baseSrc;

  const handleLoad = useCallback(() => {
    (onLoad ?? markLoaded)();
  }, [onLoad, markLoaded]);

  const handleError = useCallback(() => {
    if (mode === 'gallery' && fallbackIndex < galleryCandidates.length - 1) {
      setFallbackIndex((index) => index + 1);
      return;
    }
    (onError ?? markError)();
  }, [mode, fallbackIndex, galleryCandidates.length, onError, markError]);

  if (!enabled || !displaySrc) {
    return null;
  }

  return (
    <div className="absolute inset-0">
      <img
        key={`${currentImageKey}-${displaySrc}`}
        src={displaySrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
      {overlaySrc && (
        <img
          src={overlaySrc}
          alt=""
          aria-hidden
          className={`absolute inset-0 ${className} transition-opacity duration-[400ms] ease-in-out`}
          style={{ opacity: overlayVisible ? 1 : 0 }}
          decoding="async"
        />
      )}
    </div>
  );
});

export default ProgressiveImage;
