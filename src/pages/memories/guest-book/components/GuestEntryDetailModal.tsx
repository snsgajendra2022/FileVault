import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type { GuestBookEntry, GuestBookReaction } from '../../../../features/guest-book/types';
import { formatGuestBookDate } from '../../../../features/guest-book/utils';
import { ImageCollage } from './ImageCollage';

type Props = {
  open: boolean;
  entry: GuestBookEntry | null;
  entries: GuestBookEntry[];
  onClose: () => void;
  onNavigate: (entry: GuestBookEntry) => void;
  onImageClick: (index: number) => void;
  onLike: () => void;
  onReaction: (reaction: GuestBookReaction) => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

const REACTIONS: { id: GuestBookReaction; emoji: string; label: string }[] = [
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'smile', emoji: '😊', label: 'Smile' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];

export const GuestEntryDetailModal: React.FC<Props> = ({
  open,
  entry,
  entries,
  onClose,
  onNavigate,
  onImageClick,
  onLike,
  onReaction,
  onShare,
  onEdit,
  onDelete,
}) => {
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

  const currentIndex = entry ? entries.findIndex((e) => e.id === entry.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < entries.length - 1;

  if (!open || !entry) return null;

  const dateLabel = formatGuestBookDate(entry.date ?? entry.createdAt);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-entry-detail-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative flex flex-col w-full max-h-[95vh] sm:max-h-[90vh] sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0b0b12]/98 shadow-[0_32px_100px_rgba(0,0,0,0.65)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                {hasPrev ? (
                  <button
                    type="button"
                    aria-label="Previous memory"
                    onClick={() => onNavigate(entries[currentIndex - 1])}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}
                {hasNext ? (
                  <button
                    type="button"
                    aria-label="Next memory"
                    onClick={() => onNavigate(entries[currentIndex + 1])}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close detail view"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto guest-book-scroll px-5 py-6 sm:px-8">
              {entry.title ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/80 mb-2">
                  {entry.title}
                </p>
              ) : null}
              <h2 id="guest-entry-detail-title" className="font-memories-display text-2xl sm:text-3xl font-semibold text-white">
                {entry.guestName}
              </h2>
              {dateLabel ? <p className="mt-1 text-sm text-slate-500">{dateLabel}</p> : null}

              {(entry.category || entry.tag) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.category ? (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {entry.category}
                    </span>
                  ) : null}
                  {entry.tag ? (
                    <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200">
                      #{entry.tag}
                    </span>
                  ) : null}
                </div>
              )}

              {entry.images.length > 0 ? (
                <div className="mt-6">
                  <ImageCollage images={entry.images} onImageClick={onImageClick} />
                </div>
              ) : null}

              {entry.message.trim() ? (
                <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Message
                  </p>
                  <p className="text-base text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {entry.message}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {REACTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-label={r.label}
                    aria-pressed={entry.userReaction === r.id}
                    onClick={() => onReaction(r.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-colors min-h-[44px] ${
                      entry.userReaction === r.id
                        ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span aria-hidden>{r.emoji}</span>
                    {(entry.reactions[r.id] ?? 0) > 0 ? (
                      <span className="text-xs font-semibold">{entry.reactions[r.id]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 border-t border-white/10 px-4 py-4 bg-black/30">
              <button
                type="button"
                aria-label={entry.userLiked ? 'Unlike' : 'Like'}
                aria-pressed={entry.userLiked}
                onClick={onLike}
                className={`flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                  entry.userLiked
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Heart className={`h-4 w-4 ${entry.userLiked ? 'fill-current' : ''}`} />
                {entry.likes > 0 ? entry.likes : 'Love'}
              </button>
              <button
                type="button"
                aria-label="Share"
                onClick={onShare}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {entry.canEdit && onEdit ? (
                <button
                  type="button"
                  aria-label="Edit memory"
                  onClick={onEdit}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {entry.canDelete && onDelete ? (
                <button
                  type="button"
                  aria-label="Delete memory"
                  onClick={onDelete}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default GuestEntryDetailModal;
