import React from 'react';
import { createPortal } from 'react-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Navigation } from 'swiper/modules';
import { FaArrowUp, FaDownload, FaHeart, FaShare, FaTimes } from 'react-icons/fa';
import type { MemoriesImage } from '../../../features/memories/types';
import { getMemoriesEventImageComments } from '../../../api/services/memoriesService';
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
  /** If provided, controls whether heart is filled/red */
  isLiked?: (imageId: string) => boolean;
  /** If provided, lightbox will hydrate comments from backend APIs */
  eventId?: string;
  /** Server-backed gallery — likes not persisted locally */
  readOnly?: boolean;
  /** Guest share link: Bearer + optional shareId for loading comments */
  commentsFetchAuth?: { bearerToken?: string; shareId?: string };
};

export const MemoriesLightbox: React.FC<Props> = ({
  open,
  images,
  initialIndex,
  onClose,
  onLike,
  onComment,
  title,
  isLiked,
  eventId,
  readOnly = false,
  commentsFetchAuth,
}) => {
  const [hdLoaded, setHdLoaded] = React.useState<Record<string, boolean>>({});
  const [active, setActive] = React.useState(initialIndex);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [serverCommentsByImageId, setServerCommentsByImageId] = React.useState<
    Record<
      string,
      Array<{ id: string; text: string; createdAt: string; userId?: number; userName?: string; displayName?: string }>
    >
  >({});
  const [loadingCommentsForId, setLoadingCommentsForId] = React.useState<Record<string, boolean>>({});

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

  React.useEffect(() => {
    if (!open) return;
    if (!commentsOpen) return;
    const cur = images[active];
    if (!eventId || !cur?.id) return;
    if (serverCommentsByImageId[cur.id]) return;

    let cancelled = false;
    setLoadingCommentsForId((prev) => ({ ...prev, [cur.id]: true }));
    getMemoriesEventImageComments(eventId, cur.id, commentsFetchAuth)
      .then((list) => {
        if (cancelled) return;
        setServerCommentsByImageId((prev) => ({ ...prev, [cur.id]: list }));
      })
      .finally(() => {
        if (!cancelled) setLoadingCommentsForId((prev) => ({ ...prev, [cur.id]: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [open, commentsOpen, eventId, active, images, serverCommentsByImageId, commentsFetchAuth]);

  if (!open) return null;

  const img = images[active];
  const comments =
    (img?.id && Array.isArray(serverCommentsByImageId[img.id]) && serverCommentsByImageId[img.id]) ||
    (Array.isArray(img?.comments) ? img.comments : []);
  const canComment = !readOnly;

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
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/18 blur-[120px]" />
        <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/14 blur-[140px]" />
      </div>

      <header className="relative flex shrink-0 items-center justify-between px-4 py-3 safe-area-pt border-b border-white/10 bg-black/40 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/25">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Our Memories</p>
          <p className="text-sm font-semibold truncate pr-4">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <FaTimes className="h-5 w-5" />
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
      </header>

      {img && (
        <div
          className={`fixed z-[120] bottom-[5.5rem] right-3 left-3 sm:left-auto sm:right-4 sm:w-[380px] transition-all duration-200 ${
            commentsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
          aria-hidden={!commentsOpen}
        >
          <div className="rounded-3xl border border-white/10 bg-black/55 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/90 truncate">Comments</p>
                <p className="text-[11px] text-white/50">{comments.length} total</p>
              </div>
              <div className="flex items-center gap-2">
                {readOnly && (
                  <span className="text-[10px] font-semibold rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/70">
                    Read-only
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCommentsOpen(false)}
                  className="p-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close comments"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[40vh] sm:max-h-[340px] overflow-y-auto px-4 py-3 space-y-2">
              {img?.id && loadingCommentsForId[img.id] ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-6 text-center">
                  <p className="text-xs text-white/70">Loading comments…</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-6 text-center">
                  <p className="text-xs text-white/70">No comments yet.</p>
                  <p className="mt-1 text-[11px] text-white/45">Be the first to leave a note.</p>
                </div>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex">
                    <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2">
                      {(c.displayName || c.userName) && (
                        <p className="text-[10px] font-semibold text-white/75 truncate">
                          {c.displayName || c.userName}
                        </p>
                      )}
                      <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap break-words">{c.text}</p>
                      <p className="mt-1 text-[10px] text-white/40">
                        {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-end gap-2">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder={canComment ? 'Write a comment…' : 'Comments disabled'}
                  disabled={!canComment}
                  rows={1}
                  className="flex-1 min-w-0 resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!canComment) return;
                      const txt = commentDraft.trim();
                      if (!txt) return;
                      onComment(img.id, txt);
                      if (eventId && img?.id) {
                        const optimistic = {
                          id: `tmp_${Date.now()}`,
                          text: txt,
                          createdAt: new Date().toISOString(),
                          displayName: 'You',
                        };
                        setServerCommentsByImageId((prev) => ({
                          ...prev,
                          [img.id]: [...(prev[img.id] ?? comments), optimistic],
                        }));
                      }
                      setCommentDraft('');
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!canComment || !commentDraft.trim()}
                  onClick={() => {
                    if (!canComment) return;
                    const txt = commentDraft.trim();
                    if (!txt) return;
                    onComment(img.id, txt);
                    if (eventId && img?.id) {
                      const optimistic = {
                        id: `tmp_${Date.now()}`,
                        text: txt,
                        createdAt: new Date().toISOString(),
                        displayName: 'You',
                      };
                      setServerCommentsByImageId((prev) => ({
                        ...prev,
                        [img.id]: [...(prev[img.id] ?? comments), optimistic],
                      }));
                    }
                    setCommentDraft('');
                  }}
                  className="shrink-0 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-colors"
                  aria-label="Send comment"
                >
                  <FaArrowUp className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-white/35">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex items-center [&_.swiper-button-next]:text-white [&_.swiper-button-prev]:text-white [&_.swiper-button-next]:drop-shadow [&_.swiper-button-prev]:drop-shadow">
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
            <SwiperSlide key={m.id} className="!flex items-center justify-center bg-black/0">
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
                {/* Blurred thumbnail — always visible as background while HD loads */}
                <img
                  src={m.thumbUrl}
                  alt=""
                  aria-hidden
                  className={`absolute max-h-full max-w-full object-contain transition-opacity duration-300 ${
                    hdLoaded[m.id] ? 'opacity-0' : 'opacity-80 blur-sm scale-105'
                  }`}
                />

                {/* Loading indicator — shown while HD is not yet ready */}
                {!hdLoaded[m.id] && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                      <span className="text-[11px] font-semibold text-white/60 tracking-wide">Loading…</span>
                    </div>
                  </div>
                )}

                {/* HD image — fades in when loaded */}
                <img
                  src={m.hdUrl}
                  alt=""
                  className={`relative z-[1] max-h-[calc(100dvh-10rem)] max-w-full object-contain transition-opacity duration-500 rounded-2xl ${
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
        <footer className="relative shrink-0 border-t border-white/10 bg-black/55 backdrop-blur-2xl safe-area-pb">
          <div className="flex items-center justify-center gap-3 px-4 py-4">
            {/* <a
              href={img.hdUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
            >
              <span className="p-3 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
                <FaDownload className="h-5 w-5" />
              </span>
              Save
            </a> */}

            {/* <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onLike(img.id)}
              className={`flex flex-col items-center gap-1 text-[10px] ${
                readOnly ? 'text-white/40 cursor-not-allowed' : 'text-white/80 hover:text-white'
              }`}
            >
              <span
                className={`p-3 rounded-2xl border border-white/10 ${
                  readOnly
                    ? 'bg-white/[0.04]'
                    : isLiked?.(img.id)
                      ? 'bg-rose-500/25 hover:bg-rose-500/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.1]'
                } transition-colors`}
              >
                <FaHeart className={`h-5 w-5 ${isLiked?.(img.id) ? 'text-rose-300' : 'text-white/70'}`} />
              </span>
              {img.likes}
            </button> */}

            {/* <button
              type="button"
              onClick={() => setCommentsOpen((v) => !v)}
              className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
            >
              <span className="p-3 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
                 <span className="text-xs font-semibold">{comments.length}</span>
              </span>
              {'Comments'}
            </button> */}

            {/* <button
              type="button"
              onClick={() => share()}
              className="flex flex-col items-center gap-1 text-[10px] text-white/80 hover:text-white"
            >
              <span className="p-3 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
                <FaShare className="h-5 w-5" />
              </span>
              Share
            </button> */}
          </div>
        </footer>
      )}
    </div>,
    document.body
  );
};
