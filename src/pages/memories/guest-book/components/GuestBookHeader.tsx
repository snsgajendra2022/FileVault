import React from 'react';
import { BookHeart, Grid3X3, LayoutGrid, ListOrdered, Sparkles } from 'lucide-react';
import type { GuestBookLayoutMode, GuestBookSortMode } from '../../../../features/guest-book/types';

type Props = {
  eventName: string;
  subtitle?: string;
  entryCount: number;
  layout: GuestBookLayoutMode;
  onLayoutChange: (layout: GuestBookLayoutMode) => void;
  sort: GuestBookSortMode;
  onSortChange: (sort: GuestBookSortMode) => void;
  onAddClick?: () => void;
  showAddButton?: boolean;
  /** Hide large event title when parent already shows it (studio embed) */
  compact?: boolean;
};

const LAYOUTS: { id: GuestBookLayoutMode; icon: React.ReactNode; label: string }[] = [
  { id: 'masonry', icon: <LayoutGrid className="h-4 w-4" />, label: 'Masonry' },
  { id: 'grid', icon: <Grid3X3 className="h-4 w-4" />, label: 'Grid' },
  { id: 'timeline', icon: <ListOrdered className="h-4 w-4" />, label: 'Timeline' },
];

const SORTS: { id: GuestBookSortMode; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'mostLiked', label: 'Most loved' },
];

export const GuestBookHeader: React.FC<Props> = ({
  eventName,
  subtitle,
  entryCount,
  layout,
  onLayoutChange,
  sort,
  onSortChange,
  onAddClick,
  showAddButton,
  compact = false,
}) => {
  return (
    <header
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
        compact ? 'mb-5 p-4 sm:p-5' : 'mb-8 p-6 sm:p-8'
      }`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {!compact ? (
            <>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
                <BookHeart className="h-3.5 w-3.5" aria-hidden />
                Guest Book
              </div>
              <h1 className="font-memories-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-white leading-tight">
                {eventName}
              </h1>
              {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
            </>
          ) : null}
          <p className={`flex items-center gap-2 text-xs text-slate-400 ${compact ? '' : 'mt-3'}`}>
            <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden />
            {entryCount === 0
              ? 'Be the first to leave a memory'
              : `${entryCount} ${entryCount === 1 ? 'memory' : 'memories'} shared`}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div
            className="inline-flex rounded-2xl border border-white/10 bg-black/30 p-1"
            role="group"
            aria-label="Layout mode"
          >
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={layout === l.id}
                aria-label={`${l.label} layout`}
                onClick={() => onLayoutChange(l.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  layout === l.id
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.icon}
                <span className="hidden sm:inline">{l.label}</span>
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="guest-book-sort">
            Sort memories
          </label>
          <select
            id="guest-book-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as GuestBookSortMode)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-h-[44px]"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {showAddButton && onAddClick ? (
            <button
              type="button"
              onClick={onAddClick}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Share a memory
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default GuestBookHeader;
