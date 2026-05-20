import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchPeople, type FaceSyncPerson } from '../../api/services/faceSyncService';
import { getImageSource, maturityBadgeClass } from './utils';

const FaceSyncPeople: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get('q') || '');
  const [searchMobile, setSearchMobile] = React.useState(search);
  const [filter, setFilter] = React.useState('all');
  const [sort, setSort] = React.useState('count');
  const [people, setPeople] = React.useState<FaceSyncPerson[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasNext, setHasNext] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState('');
  const [error, setError] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (searchParams.get('from') === 'upload' && sessionStorage.getItem('upload_success') === 'true') {
      sessionStorage.removeItem('upload_success');
      setSearchParams({}, { replace: true });
      toast.success('Photos imported successfully');
    }
  }, [searchParams, setSearchParams]);

  const load = React.useCallback(
    async (reset: boolean) => {
      if (loading && !reset) return;
      if (!reset && !hasNext) return;
      setLoading(true);
      setError(false);
      const nextPage = reset ? 1 : page;
      try {
        const data = await fetchPeople({
          page: nextPage,
          per_page: 40,
          search: (search || searchMobile).toLowerCase(),
          filter,
          sort,
        });
        const batch = data.people || [];
        setPeople((prev) => (reset ? batch : [...prev, ...batch]));
        setHasNext(data.has_next ?? false);
        setPage(reset ? 2 : nextPage + 1);
        const n = data.count ?? (reset ? batch.length : people.length + batch.length);
        const unk = Number(data.unknown_count ?? 0);
        setStats(`${n} identities · ${unk} files in Unknown (on disk)`);
      } catch {
        setError(true);
        if (reset) setStats('');
      } finally {
        setLoading(false);
      }
    },
    [filter, hasNext, loading, page, people.length, search, searchMobile, sort]
  );

  React.useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchMobile, filter, sort]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !loading && !error) load(false);
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [error, hasNext, load, loading]);

  const PersonCard = ({ p }: { p: FaceSyncPerson }) => {
    const src = getImageSource(p, 'person');
    const m = String(p.maturity_level || p.stability || 'growing').toLowerCase();
    return (
      <article className="surface-card lift overflow-hidden rounded-2xl">
        <Link to={`/filter-images/people/${encodeURIComponent(p.person_id)}`} className="block img-zoom">
          <div className="aspect-[4/5] overflow-hidden rounded-t-2xl bg-gradient-to-b from-slate-100 to-slate-50 sm:aspect-square">
            {src ? (
              <img
                src={src}
                alt={p.name || p.person_id}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  const fb = p.original_url || p.url || '';
                  if (fb && img.src !== fb) img.src = fb;
                }}
              />
            ) : (
              <div className="flex h-full min-h-[8rem] items-center justify-center px-3 text-center text-xs font-medium text-slate-400">
                {p.person_id}
              </div>
            )}
          </div>
        </Link>
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{p.name || p.person_id}</h3>
            {p.identity_locked || p.locked ? (
              <span className="badge badge-lock">Locked</span>
            ) : (
              <span className={`badge ${maturityBadgeClass(m)}`}>{m}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {p.image_count || p.count || 0} photos · maturity: {p.maturity_level || p.stability || '—'}
          </p>
          {(p.suggested_name || p.pending_suggested_name) && (
            <span className="mt-2 inline-block rounded-lg border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
              Pending Suggestion
            </span>
          )}
          <Link
            to={`/filter-images/people/${encodeURIComponent(p.person_id)}`}
            className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Quick View
          </Link>
        </div>
      </article>
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 pb-16 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">People</h1>
          <p className="mt-2 text-sm text-slate-500">{stats || (loading ? 'Loading…' : '')}</p>
        </div>
        <Link
          to="/filter-images/upload"
          className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          Add photos
        </Link>
      </header>

      <article className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="search"
            value={searchMobile}
            onChange={(e) => setSearchMobile(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm md:hidden"
            placeholder="Filter by name…"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm md:block"
            placeholder="Filter by name or ID…"
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">
            <option value="all">All Identities</option>
            <option value="new">New</option>
            <option value="growing">Growing</option>
            <option value="stable">Stable</option>
            <option value="locked">Locked</option>
            <option value="risk">Duplicate Risk</option>
            <option value="pending-suggested">Suggested Name Pending</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">
            <option value="count">Sort by image count</option>
            <option value="name">Sort by name</option>
          </select>
        </div>
      </article>

      {error && !people.length ? (
        <div className="surface-card empty-state p-10 text-center">
          <p className="text-sm font-semibold text-slate-800">Could not load people</p>
          <button type="button" className="mt-4 text-sm font-semibold text-indigo-600" onClick={() => load(true)}>
            Retry
          </button>
        </div>
      ) : !loading && !people.length ? (
        <div className="surface-card empty-state p-10 text-center">
          <p className="text-sm font-semibold text-slate-800">No people match</p>
          <p className="mt-2 text-sm text-slate-500">Try another search or clear filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((p) => (
            <PersonCard key={p.person_id} p={p} />
          ))}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="skeleton h-80 animate-pulse rounded-2xl bg-slate-200/80" />
            ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-4" />
      {!hasNext && people.length > 0 && (
        <p className="py-6 text-center text-xs font-medium text-slate-400">You&apos;ve reached the end of the list</p>
      )}
    </section>
  );
};

export default FaceSyncPeople;
