import React, { memo } from 'react';
import type { UserImageWithVariants } from '../../utils/progressiveImageVariants';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc';

export interface ProgressiveImageProps {
  image: UserImageWithVariants;
  enabled: boolean;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ProgressiveImage = memo(function ProgressiveImage({
  image,
  enabled,
  alt,
  className = 'h-full w-full object-cover',
  onLoad,
  onError,
}: ProgressiveImageProps) {
  const { baseSrc, overlaySrc, overlayVisible, markLoaded, markError } =
    useProgressiveImageSrc(image, enabled);

  const handleLoad = onLoad ?? markLoaded;
  const handleError = onError ?? markError;

  if (!enabled || !baseSrc) {
    return null;
  }

  return (
    <div className="absolute inset-0">
      <img
        src={baseSrc}
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
