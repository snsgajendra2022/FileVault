import React from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MemoriesImage } from '../../../../features/memories/types';
import { resolveMemoriesImageSrc } from '../../../../features/guest-book/albumUtils';
import 'swiper/css';
import 'swiper/css/navigation';

type Props = {
  open: boolean;
  images: MemoriesImage[];
  initialIndex: number;
  onClose: () => void;
  title?: string;
};

export const ImageLightbox: React.FC<Props> = ({
  open,
  images,
  initialIndex,
  onClose,
  title,
}) => {
  const [loaded, setLoaded] = React.useState<Record<string, boolean>>({});
  const [active, setActive] = React.useState(initialIndex);

  React.useEffect(() => {
    setActive(initialIndex);
  }, [initialIndex, open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !images.length) return null;

  const current = images[active];

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95 text-white gb-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Photo gallery'}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold truncate">{title}</p> : null}
          <p className="text-xs text-slate-400">
            {active + 1} of {images.length}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <Swiper
          modules={[Navigation, Keyboard]}
          navigation={{
            prevEl: '.gb-lightbox-prev',
            nextEl: '.gb-lightbox-next',
          }}
          keyboard={{ enabled: true }}
          initialSlide={initialIndex}
          onSlideChange={(s) => setActive(s.activeIndex)}
          className="h-full w-full"
          spaceBetween={0}
        >
          {images.map((img) => {
            const src = resolveMemoriesImageSrc(img, true) || resolveMemoriesImageSrc(img);
            return (
            <SwiperSlide key={img.id} className="flex items-center justify-center bg-black">
              <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8">
                {!loaded[img.id] ? (
                  <div className="absolute inset-8 rounded-2xl gb-shimmer" aria-hidden />
                ) : null}
                {src ? (
                <img
                  src={src}
                  alt=""
                  className="max-h-full max-w-full object-contain select-none"
                  onLoad={() => setLoaded((p) => ({ ...p, [img.id]: true }))}
                  onError={(e) => {
                    const fallback = resolveMemoriesImageSrc(img);
                    if (fallback && e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                  draggable={false}
                />
                ) : (
                  <p className="text-sm text-slate-400">Image unavailable</p>
                )}
              </div>
            </SwiperSlide>
          );})}
        </Swiper>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              className="gb-lightbox-prev absolute left-2 sm:left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              className="gb-lightbox-next absolute right-2 sm:right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {current ? (
        <div className="px-4 py-3 border-t border-white/10 bg-black/40 text-center text-xs text-slate-500">
          Swipe or use arrow keys to navigate · Esc to close
        </div>
      ) : null}
    </div>,
    document.body
  );
};

export default ImageLightbox;
