import React, { memo, useEffect, useRef, useState } from 'react';
import ProgressiveImage from './ProgressiveImage';
import { toProgressiveImage, type AlbumImageLike } from '../../utils/albumImageVariants';

interface AlbumGalleryThumbProps {
  image: AlbumImageLike;
  fileType: string;
  alt: string;
  className?: string;
  /** Load immediately (above-the-fold grid cells). */
  eager?: boolean;
}

/** Lazy-mounts variant thumbnail when near viewport — fast album grid. */
const AlbumGalleryThumb = memo(function AlbumGalleryThumb({
  image,
  fileType,
  alt,
  className = 'h-full w-full object-cover group-hover:scale-105 transition-transform duration-300',
  eager = false,
}: AlbumGalleryThumbProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager) return;
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { rootMargin: '500px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <div ref={rootRef} className="absolute inset-0 bg-gray-100">
      {visible ? (
        <ProgressiveImage
          image={toProgressiveImage(image, fileType)}
          enabled
          mode="thumbnail"
          alt={alt}
          className={className}
        />
      ) : null}
    </div>
  );
});

export default AlbumGalleryThumb;
