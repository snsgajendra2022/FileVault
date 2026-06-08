import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { GuestBookFiltersState } from '../../../../features/guest-book/types';

type Props = {
  filters: GuestBookFiltersState;
  categories: string[];
  tags: string[];
  onChange: (patch: Partial<GuestBookFiltersState>) => void;
  onClear: () => void;
};

export const GuestBookFilters: React.FC<Props> = ({
  filters,
  categories,
  tags,
  onChange,
  onClear,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasActive =
    filters.search ||
    filters.category ||
    filters.tag ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by name or message…"
            aria-label="Search guest book"
            className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 min-h-[44px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="guest-book-advanced-filters"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
        </button>
        {hasActive ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div
          id="guest-book-advanced-filters"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/10"
        >
          <div>
            <label htmlFor="gb-filter-category" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Category
            </label>
            <select
              id="gb-filter-category"
              value={filters.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gb-filter-tag" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tag
            </label>
            <select
              id="gb-filter-tag"
              value={filters.tag}
              onChange={(e) => onChange({ tag: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gb-filter-from" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              From date
            </label>
            <input
              id="gb-filter-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ dateFrom: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <div>
            <label htmlFor="gb-filter-to" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              To date
            </label>
            <input
              id="gb-filter-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ dateTo: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GuestBookFilters;
