import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  deletePhoto,
  fetchPeople,
  fetchPhotos,
  renamePhoto,
  type FaceSyncPhoto,
} from '../../api/services/faceSyncService';
import ConfirmModal from './ConfirmModal';
import RenameModal from './RenameModal';
import { getImageSource, photoKey, qualityPillClasses } from './utils';

const FaceSyncPhotos: React.FC = () => {
  const [photos, setPhotos] = React.useState<FaceSyncPhoto[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasNext, setHasNext] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [personFilter, setPersonFilter] = React.useState('all');
  const [sort, setSort] = React.useState('newest');
  const [peopleOptions, setPeopleOptions] = React.useState<string[]>([]);
  const [stats, setStats] = React.useState('Browsing all indexed images…');
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [lbIndex, setLbIndex] = React.useState(-1);
  const [confirm, setConfirm] = React.useState<{ title: string; message: string; action: () => void } | null>(null);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [rename, setRename] = React.useState<{ personId: string; filename: string; value: string } | null>(null);
  const [renameBusy, setRenameBusy] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchPeople({ per_page: 1000 })
      .then((d) => setPeopleOptions((d.people || []).map((p) => p.person_id).sort()))
      .catch(() => {});
  }, []);

  const loadPage = React.useCallback(
    async (reset: boolean) => {
      if (loading && !reset) return;
      if (!reset && !hasNext) return;
      setLoading(true);
      const nextPage = reset ? 1 : page;
      try {
        const data = await fetchPhotos({
          page: nextPage,
          per_page: 40,
          search: search.toLowerCase(),
          person: personFilter,
          sort,
        });
        const batch = data.photos || [];
        setPhotos((prev) => (reset ? batch : [...prev, ...batch]));
        setHasNext(data.has_next ?? false);
        setPage(reset ? 2 : nextPage + 1);
        setStats(`${data.count ?? (reset ? batch.length : photos.length + batch.length)} unique photos found`);
      } catch (e) {
        if (reset) toast.error('Failed to load gallery');
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [hasNext, loading, page, personFilter, photos.length, search, sort]
  );

  React.useEffect(() => {
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, personFilter, sort]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !loading) loadPage(false);
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNext, loadPage, loading]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const openLb = (idx: number) => setLbIndex(idx);
  const closeLb = () => setLbIndex(-1);
  const lbPhoto = lbIndex >= 0 ? photos[lbIndex] : null;

  const doDelete = async (personId: string, filename: string) => {
    try {
      await deletePhoto(personId, filename);
      const key = photoKey(personId, filename);
      setPhotos((prev) => prev.filter((p) => !(p.person_id === personId && p.filename === filename)));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      toast.success('Photo deleted');
      if (lbIndex >= 0) closeLb();
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : 'error'}`);
    }
  };

  const QualityPill = ({ p }: { p: FaceSyncPhoto }) => {
    if (p.quality_score == null) return null;
    const lvl = String(p.quality_level || '').toLowerCase();
    const pct = Math.round(Number(p.quality_score) * 100);
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[0.65rem] font-semibold ${qualityPillClasses(lvl)}`}>
        Quality {lvl || '—'} · {pct}%
      </span>
    );
  };

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 lg:px-8 bg-slate-50 min-h-full">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Media Assets</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Photo Library</h1>
          <p className="mt-2 text-sm text-slate-500">{stats}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search filename or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-4 text-xs shadow-sm"
          />
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => {
              setSelectionMode((m) => !m);
              if (selectionMode) setSelected(new Set());
            }}
          >
            {selectionMode ? 'Cancel selection' : 'Select'}
          </button>
          <Link to="/filter-images/upload" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
            Import
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          <option value="all">All People</option>
          {peopleOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
          <option value="quality">Quality</option>
        </select>
      </div>

      {!loading && !photos.length ? (
        <div className="py-20 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No photos found</h3>
          <button type="button" className="mt-6 text-sm font-semibold text-indigo-600" onClick={() => { setSearch(''); setPersonFilter('all'); }}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${selectionMode ? 'selection-mode' : ''}`}>
          {photos.map((p, idx) => {
            const id = photoKey(p.person_id, p.filename);
            const isSel = selected.has(id);
            const displayUrl = getImageSource(p, 'gallery');
            const liked = localStorage.getItem(`like_${p.person_id}_${p.filename}`) === 'true';
            return (
              <article
                key={id}
                className={`photo-card group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 shadow-sm ${isSel ? 'is-selected ring-2 ring-indigo-500' : ''}`}
                onClick={() => !selectionMode && openLb(idx)}
              >
                <img
                  src={displayUrl}
                  alt={p.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fb = p.original_url || p.url || '';
                    if (fb && img.src !== fb) img.src = fb;
                  }}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 z-20">
                  <QualityPill p={p} />
                </div>
                {selectionMode && (
                  <div
                    className="absolute top-3 left-3 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(id);
                    }}
                  >
                    <input type="checkbox" checked={isSel} readOnly className="h-4 w-4 rounded" />
                  </div>
                )}
                <button
                  type="button"
                  className={`absolute top-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 ${liked ? 'text-red-500' : 'text-slate-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const k = `like_${p.person_id}_${p.filename}`;
                    if (liked) localStorage.removeItem(k);
                    else localStorage.setItem(k, 'true');
                    setPhotos((prev) => [...prev]);
                  }}
                >
                  ♥
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-10">
        {loading && <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />}
        {!hasNext && photos.length > 0 && (
          <p className="text-xs font-medium italic text-slate-400">End of library — you&apos;ve indexed everything.</p>
        )}
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-200 bg-white/95 px-6 py-3 shadow-2xl backdrop-blur-xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {selected.size}
          </span>
          <button
            type="button"
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white"
            onClick={() =>
              setConfirm({
                title: 'Confirm bulk deletion',
                message: `Delete ${selected.size} photos? This cannot be undone.`,
                action: async () => {
                  setConfirmBusy(true);
                  let ok = 0;
                  for (const key of Array.from(selected)) {
                    const [personId, filename] = key.split('::');
                    try {
                      await deletePhoto(personId, filename);
                      ok++;
                    } catch {
                      /* skip */
                    }
                  }
                  setPhotos((prev) => prev.filter((p) => !selected.has(photoKey(p.person_id, p.filename))));
                  setSelected(new Set());
                  setSelectionMode(false);
                  toast.success(`Deleted ${ok} photos`);
                  setConfirm(null);
                  setConfirmBusy(false);
                },
              })
            }
          >
            Delete Selected
          </button>
        </div>
      )}

      {lbPhoto && (
        <div className="fixed inset-0 z-[100] flex bg-slate-950/95" role="dialog" aria-modal="true">
          <div className="split-lightbox flex h-full w-full">
            <div className="split-lightbox-media relative flex flex-1 items-center justify-center">
              <button type="button" className="absolute top-4 right-4 z-50 rounded-full bg-black/60 p-3 text-white" onClick={closeLb}>
                ✕
              </button>
              {lbIndex > 0 && (
                <button type="button" className="absolute left-4 z-50 rounded-full bg-black/60 p-4 text-white" onClick={() => setLbIndex((i) => i - 1)}>
                  ‹
                </button>
              )}
              <img
                src={getImageSource(lbPhoto, 'lightbox')}
                alt={lbPhoto.filename}
                className="max-h-[90vh] max-w-full object-contain"
              />
              {lbIndex < photos.length - 1 && (
                <button type="button" className="absolute right-4 z-50 rounded-full bg-black/60 p-4 text-white" onClick={() => setLbIndex((i) => i + 1)}>
                  ›
                </button>
              )}
            </div>
            <div className="split-lightbox-sidebar w-full max-w-md overflow-y-auto bg-white p-6 lg:p-8">
              <h3 className="text-lg font-bold text-slate-900">Photo Details</h3>
              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Filename</span>
                  <p className="font-semibold break-all">{lbPhoto.filename}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Assigned Identity</span>
                  <p>{lbPhoto.person_id}</p>
                </div>
                <QualityPill p={lbPhoto} />
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  onClick={() => setRename({ personId: lbPhoto.person_id, filename: lbPhoto.filename, value: lbPhoto.filename.split('.')[0] })}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-600"
                  onClick={() =>
                    setConfirm({
                      title: 'Confirm deletion',
                      message: `Delete ${lbPhoto.filename}?`,
                      action: async () => {
                        setConfirmBusy(true);
                        await doDelete(lbPhoto.person_id, lbPhoto.filename);
                        setConfirm(null);
                        setConfirmBusy(false);
                      },
                    })
                  }
                >
                  Delete
                </button>
              </div>
              {(lbPhoto.original_url || lbPhoto.url) && (
                <a
                  href={lbPhoto.original_url || lbPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold"
                >
                  Open Original File
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        busy={confirmBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action()}
      />
      <RenameModal
        open={!!rename}
        value={rename?.value || ''}
        busy={renameBusy}
        onChange={(v) => setRename((r) => (r ? { ...r, value: v } : r))}
        onCancel={() => setRename(null)}
        onSave={async () => {
          if (!rename) return;
          setRenameBusy(true);
          try {
            const res = await renamePhoto(rename.personId, rename.filename, rename.value.trim());
            setPhotos((prev) =>
              prev.map((p) =>
                p.person_id === rename.personId && p.filename === rename.filename
                  ? { ...p, filename: res.new_filename }
                  : p
              )
            );
            toast.success('Photo renamed');
            setRename(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Rename failed');
          } finally {
            setRenameBusy(false);
          }
        }}
      />
    </section>
  );
};

export default FaceSyncPhotos;
