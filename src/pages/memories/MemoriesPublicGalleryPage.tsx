import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaHeart, FaImages } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import { fetchGuestMemoriesEventBySlug } from '../../services/memoriesShareService';
import { MemoriesSkeletonGrid } from './components/MemoriesSkeletonGrid';
import { MemoriesLightbox } from './components/MemoriesLightbox';
import type { MemoriesEvent } from '../../features/memories/types';

/** Public guest gallery — QR / share link. Token required when event is not public. */
const MemoriesPublicGalleryPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t')?.trim() || '';

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
    if (local || !slug) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setFetchingRemote(true);
    fetchGuestMemoriesEventBySlug(slug, token || undefined)
      .then((r) => {
        if (!cancelled) setRemote(r);
      })
      .finally(() => {
        if (!cancelled) setFetchingRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, token, local]);

  const ev = local || remote;
  const isRemoteOnly = !!remote && !local;

  const [lightbox, setLightbox] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const loading =
    (!!local && introDelay) || (!local && fetchingRemote);

  React.useEffect(() => {
    if (!ev || isRemoteOnly || viewedRef.current) return;
    viewedRef.current = true;
    incrementViews(ev.id);
  }, [ev, incrementViews, isRemoteOnly]);

  const accessOk =
    ev &&
    ((token && token === ev.accessToken));

  if (!loading && !ev) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
        <FaImages className="h-12 w-12 text-slate-600 mb-4" />
        <h1 className="text-xl font-bold text-center">{t('galleryNotFoundTitle')}</h1>
        <p className="text-slate-400 text-sm text-center mt-2 max-w-md">{t('galleryNotFoundBody')}</p>
        {/* <Link to="/memories" className="mt-8 text-violet-400 font-semibold hover:underline">
          {t('backToMemoriesHome')}
        </Link> */}
      </div>
    );
  }

  if (!loading && ev && !accessOk) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-xl font-bold">{t('galleryLockedTitle')}</h1>
        <p className="text-slate-400 text-sm text-center mt-2 max-w-md">{t('galleryLockedBody')}</p>
      </div>
    );
  }

  if (loading || !ev) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] text-slate-100 pb-24">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
            {/* <Link to="/memories" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <FaArrowLeft className="h-5 w-5 text-slate-300" />
            </Link> */}
            <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-3 sm:px-4 pt-4">
          <MemoriesSkeletonGrid count={9} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-slate-100 pb-24">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          {/* <Link
            to="/memories"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <FaArrowLeft className="h-5 w-5 text-slate-300" />
          </Link> */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{ev.name}</h1>
            <p className="text-xs text-slate-500 truncate">
              {new Date(ev.dateTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · {ev.location}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 sm:px-4 pt-4">
        {ev.images.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center text-slate-400 text-sm">
            {t('galleryEmpty')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3">
            {ev.images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox({ open: true, index: idx })}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500 ring-offset-2 ring-offset-[#0c0c0f]"
              >
                <img
                  src={img.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-active:scale-[0.98]"
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  <FaHeart className="h-3 w-3 text-rose-400" />
                  {img.likes}
                </span>
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
        readOnly={isRemoteOnly}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        onLike={(imageId) => {
          if (!isRemoteOnly) toggleLike(ev.id, imageId);
        }}
        onComment={(imageId, text) => {
          if (!isRemoteOnly) addComment(ev.id, imageId, text);
        }}
      />
    </div>
  );
};

export default MemoriesPublicGalleryPage;
