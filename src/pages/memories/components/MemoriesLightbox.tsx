import React from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Navigation } from 'swiper/modules';
import { FaArrowUp, FaDownload, FaHeart, FaShare, FaTimes } from 'react-icons/fa';
import type { MemoriesImage } from '../../../features/memories/types';
import 'swiper/css';
import 'swiper/css/navigation';

type Props = {
  open: boolean;
  images: MemoriesImage[];
  initialIndex: number;
  onClose: () => void;
  onLike: (imageId: string) => void;
  onComment: (imageId: string, text: string) => void;
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
  onComment,
  title,
  readOnly = false,
}) => {
  const [hdLoaded, setHdLoaded] = React.useState<Record<string, boolean>>({});
  const [active, setActive] = React.useState(initialIndex);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');

  React.useEffect(() => {
    setActive(initialIndex);
    setCommentsOpen(false);
    setCommentDraft('');
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
  const comments = Array.isArray(img?.comments) ? img.comments : [];

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
        <footer className="shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-md safe-area-pb">
          {commentsOpen && (
            <div className="px-4 pt-4">
              <div className="max-h-40 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-white/50">No comments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-xl bg-black/40 px-3 py-2">
                        <p className="text-xs text-white/90 leading-relaxed">{c.text}</p>
                        <p className="mt-1 text-[10px] text-white/40">
                          {new Date(c.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder={readOnly ? 'Comments disabled' : 'Write a comment…'}
                  disabled={readOnly}
                  className="flex-1 min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (readOnly) return;
                      const txt = commentDraft.trim();
                      if (!txt) return;
                      onComment(img.id, txt);
                      setCommentDraft('');
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={readOnly || !commentDraft.trim()}
                  onClick={() => {
                    if (readOnly) return;
                    const txt = commentDraft.trim();
                    if (!txt) return;
                    onComment(img.id, txt);
                    setCommentDraft('');
                  }}
                  className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors"
                  aria-label="Send comment"
                >
                  <FaArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 px-4 py-4">
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
            onClick={() => setCommentsOpen((v) => !v)}
            className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
          >
            <span className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <span className="text-xs font-semibold">C</span>
            </span>
            {comments.length}
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
          </div>
        </footer>
      )}
    </div>,
    document.body
  );
};
