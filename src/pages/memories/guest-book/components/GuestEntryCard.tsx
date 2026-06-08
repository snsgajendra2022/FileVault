import React from 'react';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  PartyPopper,
  Pin,
  Share2,
  Smile,
  Star,
} from 'lucide-react';
import type { GuestBookEntry, GuestBookReaction } from '../../../../features/guest-book/types';
import { formatGuestBookDate, truncateMessage } from '../../../../features/guest-book/utils';
import { ImageCollage } from './ImageCollage';

type Props = {
  entry: GuestBookEntry;
  onOpen: () => void;
  onImageClick: (index: number) => void;
  onLike: () => void;
  onReaction: (reaction: GuestBookReaction) => void;
  onShare: () => void;
  onPin?: () => void;
  onFeature?: () => void;
  showManageActions?: boolean;
  style?: React.CSSProperties;
};

const REACTIONS: { id: GuestBookReaction; icon: React.ReactNode; label: string }[] = [
  { id: 'heart', icon: <Heart className="h-3.5 w-3.5" />, label: 'Love' },
  { id: 'smile', icon: <Smile className="h-3.5 w-3.5" />, label: 'Smile' },
  { id: 'celebrate', icon: <PartyPopper className="h-3.5 w-3.5" />, label: 'Celebrate' },
];

export const GuestEntryCard: React.FC<Props> = ({
  entry,
  onOpen,
  onImageClick,
  onLike,
  onReaction,
  onShare,
  onPin,
  onFeature,
  showManageActions,
  style,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasImages = entry.images.length > 0;
  const hasMessage = Boolean(entry.message.trim());
  const { text: preview, truncated } = truncateMessage(entry.message);
  const displayMessage = expanded ? entry.message.trim() : preview;
  const dateLabel = formatGuestBookDate(entry.date ?? entry.createdAt);

  const cardType = !hasImages && hasMessage ? 'quote' : hasImages && !hasMessage ? 'photo' : 'mixed';

  return (
    <article
      className={`group relative gb-fade-in rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-violet-500/30 hover:shadow-[0_24px_70px_rgba(124,58,237,0.15)] hover:-translate-y-0.5 ${
        entry.pinned ? 'ring-1 ring-violet-400/40' : ''
      } ${entry.featured ? 'ring-1 ring-amber-400/30' : ''}`}
      style={style}
    >
      {(entry.pinned || entry.featured) && (
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          {entry.pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <Pin className="h-3 w-3" aria-hidden />
              Pinned
            </span>
          ) : null}
          {entry.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <Star className="h-3 w-3" aria-hidden />
              Featured
            </span>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a]"
        aria-label={`Open memory from ${entry.guestName}`}
      >
        {cardType === 'quote' ? (
          <div className="relative px-6 py-10 sm:py-12">
            <MessageCircle
              className="absolute top-5 right-5 h-10 w-10 text-violet-500/20"
              aria-hidden
            />
            {entry.title ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/80 mb-3">
                {entry.title}
              </p>
            ) : null}
            <blockquote className="font-memories-display text-xl sm:text-2xl font-medium leading-snug text-slate-50 italic">
              &ldquo;{displayMessage}&rdquo;
            </blockquote>
            {truncated && !expanded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                className="mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200"
              >
                Read more
              </button>
            ) : null}
          </div>
        ) : null}

        {hasImages ? (
          <div className="relative">
            <ImageCollage images={entry.images} onImageClick={onImageClick} />
            {hasMessage ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-12 pointer-events-none">
                <p className="text-sm text-white/95 line-clamp-2 leading-snug">{displayMessage}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {cardType === 'mixed' && hasMessage ? (
          <div className="px-5 py-4 border-t border-white/5">
            <p className="text-sm text-slate-200 leading-relaxed">{displayMessage}</p>
            {truncated && !expanded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                className="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200"
              >
                Read more
              </button>
            ) : null}
          </div>
        ) : null}
      </button>

      <footer className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-3 bg-black/20">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{entry.guestName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {dateLabel ? <span className="text-[11px] text-slate-500">{dateLabel}</span> : null}
            {entry.category ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {entry.category}
              </span>
            ) : null}
            {entry.tag ? (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                #{entry.tag}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={entry.userLiked ? 'Unlike memory' : 'Like memory'}
            aria-pressed={entry.userLiked}
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              entry.userLiked
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Heart className={`h-4 w-4 ${entry.userLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="Share memory"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {showManageActions ? (
            <div className="relative group/menu">
              <button
                type="button"
                aria-label="Manage memory"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block group-focus-within/menu:block z-20 min-w-[140px] rounded-xl border border-white/10 bg-[#12121a] py-1 shadow-xl">
                {onPin ? (
                  <button
                    type="button"
                    onClick={onPin}
                    className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
                  >
                    {entry.pinned ? 'Unpin' : 'Pin'}
                  </button>
                ) : null}
                {onFeature ? (
                  <button
                    type="button"
                    onClick={onFeature}
                    className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
                  >
                    {entry.featured ? 'Unfeature' : 'Feature'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </footer>

      <div className="flex items-center gap-1 px-4 pb-3 -mt-1">
        {REACTIONS.map((r) => {
          const count = entry.reactions[r.id] ?? 0;
          const active = entry.userReaction === r.id;
          if (count === 0 && !active) {
            return (
              <button
                key={r.id}
                type="button"
                aria-label={`React with ${r.label}`}
                onClick={() => onReaction(r.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/5 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {r.icon}
              </button>
            );
          }
          return (
            <button
              key={r.id}
              type="button"
              aria-label={`${r.label}${count ? ` (${count})` : ''}`}
              aria-pressed={active}
              onClick={() => onReaction(r.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-violet-500/20 text-violet-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {r.icon}
              {count > 0 ? <span>{count}</span> : null}
            </button>
          );
        })}
        {entry.likes > 0 ? (
          <span className="ml-auto text-[11px] text-slate-500">{entry.likes} loves</span>
        ) : null}
      </div>
    </article>
  );
};

export default GuestEntryCard;
