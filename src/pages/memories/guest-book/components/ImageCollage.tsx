import React from 'react';
import { resolveMemoriesImageSrc } from '../../../../features/guest-book/albumUtils';

type ImageItem = { id: string; thumbUrl: string; hdUrl?: string };

type Props = {
  images: ImageItem[];
  onImageClick?: (index: number) => void;
  className?: string;
};

export const ImageCollage: React.FC<Props> = ({ images, onImageClick, className = '' }) => {
  const count = images.length;
  if (count === 0) return null;

  const layoutClass =
    count === 1
      ? 'gb-image-collage--1'
      : count === 2
        ? 'gb-image-collage--2'
        : count === 3
          ? 'gb-image-collage--3'
          : 'gb-image-collage--4';

  const visible = count <= 4 ? images : images.slice(0, 4);
  const extra = count > 4 ? count - 4 : 0;

  return (
    <div className={`gb-image-collage ${layoutClass} ${className}`} role="group" aria-label="Photo collage">
      {visible.map((img, index) => {
        const isLastWithMore = extra > 0 && index === 3;
        const isMain = count === 3 && index === 0;
        const src = resolveMemoriesImageSrc(img);
        return (
          <button
            key={img.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(index);
            }}
            className={`gb-collage-cell ${isMain ? 'gb-collage-main' : ''} focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-inset`}
            aria-label={isLastWithMore ? `View all ${count} photos` : `View photo ${index + 1}`}
          >
            {src ? (
              <img
                src={src}
                alt=""
                loading="lazy"
                className="transition-transform duration-500 hover:scale-[1.03]"
                onError={(e) => {
                  const hd = resolveMemoriesImageSrc(img, true);
                  if (hd && e.currentTarget.src !== hd) e.currentTarget.src = hd;
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs text-slate-500">
                Photo
              </div>
            )}
            {isLastWithMore ? (
              <span className="gb-more-overlay" aria-hidden>
                +{extra} more
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default ImageCollage;
