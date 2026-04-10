import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaHeart, FaImages } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import { fetchGuestMemoriesEventBySlug } from '../../services/memoriesShareService';
import { addMemoriesEventImageComment, getMemoriesEventById, likeMemoriesEventImage } from '../../services/memoriesService';
import { MemoriesSkeletonGrid } from './components/MemoriesSkeletonGrid';
import { MemoriesLightbox } from './components/MemoriesLightbox';
import type { MemoriesEvent } from '../../features/memories/types';
import api from 'src/services/api';

/** Public guest gallery — QR / share link. Token required when event is not public. */
const MemoriesPublicGalleryPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t')?.trim() || '';
  const shareId = searchParams.get('shareId')?.trim() || searchParams.get('sid')?.trim() || '';

  const getBySlug = useMemoriesStore((s) => s.getBySlug);
  const toggleLike = useMemoriesStore((s) => s.toggleLike);
  const addComment = useMemoriesStore((s) => s.addComment);
  const incrementViews = useMemoriesStore((s) => s.incrementViews);

  const slug = eventSlug || '';
  const local = slug ? getBySlug(slug) : undefined;
  const [remote, setRemote] = React.useState<MemoriesEvent | null>(null);
  const [fetchingRemote, setFetchingRemote] = React.useState(false);
  const viewedRef = React.useRef(false);

  const [introDelay, setIntroDelay] = React.useState(true);
  React.useEffect(() => {
    const tmr = window.setTimeout(() => setIntroDelay(false), 400);
    return () => window.clearTimeout(tmr);
  }, [slug]);

  React.useEffect(() => {
    // getLike()
    if (local || !slug) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setFetchingRemote(true);
    const isNumericSlug = /^\d+$/.test(slug);
    const run = async () => {
      try {
        // If slug is a numeric id (e.g. /memories/e/1), prefer the same host API used by manage page.
        // If that fails (e.g. unauthenticated), fall back to guest API.
        if (isNumericSlug) {
          const host = await getMemoriesEventById(slug);
          if (!cancelled) setRemote(host);
          if (host) return;
        }
        const guest = await fetchGuestMemoriesEventBySlug(slug, token || undefined);
        if (!cancelled) setRemote(guest);
      } finally {
        if (!cancelled) setFetchingRemote(false);
      }
    };
    
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, token, local]);
  // const getLike= async ()=>{
  //   const response = await api.get('/api/memories/events/1/images/214/likes', {
  //     params: { ...(token ? { t: token } : {}) },
  //   });
  //   console.log(response);
  // }
  const ev = local || remote;
  const isRemoteOnly = !!remote && !local;
  const [likedImageIds, setLikedImageIds] = React.useState<Set<string>>(new Set());

  const [lightbox, setLightbox] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const loading =
    (!!local && introDelay) || (!local && fetchingRemote);

  const isLiked = React.useCallback((imageId: string) => likedImageIds.has(imageId), [likedImageIds]);

  const handleLike = React.useCallback(
    (imageId: string) => {
      if (!ev) return;

      const has = likedImageIds.has(imageId);
      const delta = (has ? -1 : 1) as 1 | -1;

      // Track local UI state for "liked" styling.
      setLikedImageIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(imageId);
        else next.add(imageId);
        return next;
      });

      if (!isRemoteOnly) {
        // Demo/local events: keep existing behavior and also keep heart filled state.
        toggleLike(ev.id, imageId);
        return;
      }

      // Remote/guest events: optimistic update + backend persistence.
      setRemote((prev) => {
        if (!prev || String(prev.id) !== String(ev.id)) return prev;
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === imageId ? { ...img, likes: Math.max(0, (img.likes ?? 0) + delta) } : img
          ),
        };
      });

      likeMemoriesEventImage(String(ev.id), imageId, delta, shareId || undefined).catch(() => {
        // rollback on failure
        setLikedImageIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(imageId);
          else next.delete(imageId);
          return next;
        });
        setRemote((prev) => {
          if (!prev || String(prev.id) !== String(ev.id)) return prev;
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.id === imageId ? { ...img, likes: Math.max(0, (img.likes ?? 0) - delta) } : img
            ),
          };
        });
      });
    },
    [ev, isRemoteOnly, likedImageIds, toggleLike, shareId]
  );

  React.useEffect(() => {
    if (!ev || isRemoteOnly || viewedRef.current) return;
    viewedRef.current = true;
    incrementViews(ev.id);
  }, [ev, incrementViews, isRemoteOnly]);

  const accessOk = React.useMemo(() => {
    if (!ev) return false;
    const privacy = (ev as any)?.privacy as string | undefined;
    if (privacy === 'public') return true;
    const accessToken = String((ev as any)?.accessToken ?? '').trim();
    if (!accessToken) return true;
    return Boolean(token) && token === accessToken;
  }, [ev, token]);

  const prettyDate = React.useMemo(() => {
    if (!ev?.dateTime) return '';
    try {
      return new Date(ev.dateTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [ev?.dateTime]);

  const heroSubtitle = React.useMemo(() => {
    const parts = [prettyDate, ev?.location].filter((x) => typeof x === 'string' && x.trim());
    return parts.join(' · ');
  }, [prettyDate, ev?.location]);

  if (!loading && !ev) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <FaImages className="h-7 w-7 text-slate-200/80" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('galleryNotFoundTitle')}</h1>
            <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">{t('galleryNotFoundBody')}</p>
            <Link
              to="/memories"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && ev && !accessOk) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] px-6 py-10 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">{t('galleryLockedTitle')}</h1>
            <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">{t('galleryLockedBody')}</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-300">
              <span className="text-slate-400">Hint:</span> open the exact link from the message (it includes a token).
            </div>
            <Link
              to="/memories"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !ev) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 pb-24 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/35">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 animate-pulse" />
              <div>
                <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-56 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </header>
        <main className="relative mx-auto max-w-4xl px-3 sm:px-4 pt-5">
          <MemoriesSkeletonGrid count={12} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 pb-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/35">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] flex items-center justify-center">
              <span className="text-xs font-extrabold tracking-wider bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                OM
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight truncate">{ev.name}</h1>
              <p className="text-[11px] sm:text-xs text-slate-400/80 truncate">{heroSubtitle}</p>
            </div>
          </div>

          <Link
            to="/memories"
            className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1] transition-colors"
          >
            {t('backToMemoriesHome')}
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
      </header>

      <main className="relative mx-auto max-w-4xl px-3 sm:px-4 pt-5">
        {ev.images.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-6 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
              <FaImages className="h-6 w-6 text-slate-200/70" />
            </div>
            <p className="text-slate-200/80 font-semibold">{t('galleryEmpty')}</p>
            <p className="mt-1 text-xs text-slate-400/80">Ask the photographer to upload images to this event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ev.images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox({ open: true, index: idx })}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-violet-500 ring-offset-2 ring-offset-[#07070a]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <img
                  src={img.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                    Our Memories
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(img.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors"
                    aria-label="Like"
                  >
                    <FaHeart
                      className={`h-3 w-3 ${isLiked(img.id) ? 'text-rose-300' : 'text-white/50'}`}
                    />
                    {img.likes}
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <MemoriesLightbox
        open={lightbox.open}
        initialIndex={lightbox.index}
        images={ev.images}
        title={ev.name}
        readOnly={false}
        isLiked={isLiked}
        eventId={String(ev.id)}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        onLike={(imageId) => {
          handleLike(imageId);
        }}
        onComment={(imageId, text) => {
          if (!ev) return;
          if (!isRemoteOnly) {
            addComment(ev.id, imageId, text);
            return;
          }

          const tmpId = `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          const optimistic = { id: tmpId, text, createdAt: new Date().toISOString() };
          setRemote((prev) => {
            if (!prev || String(prev.id) !== String(ev.id)) return prev;
            return {
              ...prev,
              images: prev.images.map((img) =>
                img.id === imageId
                  ? { ...img, comments: [...(img.comments ?? []), optimistic] }
                  : img
              ),
            };
          });
          addMemoriesEventImageComment(String(ev.id), imageId, text)
            .then((saved) => {
              setRemote((prev) => {
                if (!prev || String(prev.id) !== String(ev.id)) return prev;
                return {
                  ...prev,
                  images: prev.images.map((img) =>
                    img.id === imageId
                      ? {
                          ...img,
                          comments: (img.comments ?? []).map((c) => (c.id === tmpId ? saved : c)),
                        }
                      : img
                  ),
                };
              });
            })
            .catch(() => {
              setRemote((prev) => {
                if (!prev || String(prev.id) !== String(ev.id)) return prev;
                return {
                  ...prev,
                  images: prev.images.map((img) =>
                    img.id === imageId
                      ? { ...img, comments: (img.comments ?? []).filter((c) => c.id !== tmpId) }
                      : img
                  ),
                };
              });
            });
        }}
      />
    </div>
  );
};

export default MemoriesPublicGalleryPage;
