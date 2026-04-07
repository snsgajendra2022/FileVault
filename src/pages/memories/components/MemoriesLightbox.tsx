import React from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Navigation } from 'swiper/modules';
import { FaDownload, FaHeart, FaShare, FaTimes } from 'react-icons/fa';
import type { MemoriesImage } from '../../../features/memories/types';
import 'swiper/css';
import 'swiper/css/navigation';

type Props = {
  open: boolean;
  images: MemoriesImage[];
  initialIndex: number;
  onClose: () => void;
  onLike: (imageId: string) => void;
  title: string;
  /** Server-backed gallery — likes not persisted locally */
  readOnly?: boolean;
};

export const MemoriesLightbox: React.FC<Props> = ({
  open,
  images,
  initialIndex,
  onClose,
  onLike,
  title,
  readOnly = false,
}) => {
  const [hdLoaded, setHdLoaded] = React.useState<Record<string, boolean>>({});
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

  if (!open) return null;

  const img = images[active];

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white">
      <header className="flex shrink-0 items-center justify-between px-4 py-3 safe-area-pt border-b border-white/10">
        <p className="text-sm font-medium truncate pr-4">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <FaTimes className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex items-center [&_.swiper-button-next]:text-white [&_.swiper-button-prev]:text-white [&_.swiper-button-next]:drop-shadow [&_.swiper-button-prev]:drop-shadow">
        <Swiper
          key={`${initialIndex}-${images.length}`}
          modules={[Keyboard, Navigation]}
          keyboard
          navigation
          initialSlide={initialIndex}
          onSlideChange={(s) => setActive(s.activeIndex)}
          className="w-full h-full max-h-[calc(100dvh-8rem)] memories-lightbox-swiper"
        >
          {images.map((m, idx) => (
            <SwiperSlide key={m.id} className="!flex items-center justify-center bg-black">
              <div className="relative w-full h-full flex items-center justify-center p-2">
                {!hdLoaded[m.id] && (
                  <img
                    src={m.thumbUrl}
                    alt=""
                    className="absolute max-h-full max-w-full object-contain blur-sm scale-105 opacity-80"
                  />
                )}
                <img
                  src={m.hdUrl}
                  alt=""
                  className={`relative z-[1] max-h-[calc(100dvh-10rem)] max-w-full object-contain transition-opacity duration-500 ${
                    hdLoaded[m.id] ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setHdLoaded((prev) => ({ ...prev, [m.id]: true }))}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {img && (
        <footer className="shrink-0 flex items-center justify-center gap-4 px-4 py-4 safe-area-pb border-t border-white/10 bg-black/80 backdrop-blur-md">
          <a
            href={img.hdUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
          >
            <span className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <FaDownload className="h-5 w-5" />
            </span>
            Save
          </a>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onLike(img.id)}
            className={`flex flex-col items-center gap-1 text-[10px] ${
              readOnly ? 'text-white/40 cursor-not-allowed' : 'text-white/80 hover:text-rose-300'
            }`}
          >
            <span
              className={`p-3 rounded-full ${
                readOnly ? 'bg-white/5' : 'bg-white/10 hover:bg-rose-500/30 transition-colors'
              }`}
            >
              <FaHeart className="h-5 w-5" />
            </span>
            {img.likes}
          </button>
          <button
            type="button"
            onClick={() => share()}
            className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
          >
            <span className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <FaShare className="h-5 w-5" />
            </span>
            Share
          </button>
        </footer>
      )}
    </div>,
    document.body
  );
};
