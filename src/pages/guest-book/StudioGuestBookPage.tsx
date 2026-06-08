import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookHeart,
  ChevronRight,
  FolderOpen,
  Images,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createStudioGuestBookAlbum,
  fetchStudioAlbumImages,
  listStudioAlbumsForGuestBook,
  uploadPhotosToStudioAlbum,
} from '../../features/guest-book/albumGuestBookService';
import { mapAlbumImagesToGuestEntries } from '../../features/guest-book/albumUtils';
import { useGuestBookStore } from '../../features/guest-book/guestBookStore';
import GuestBookPage from '../memories/guest-book/GuestBookPage';
import './guest-book-studio.css';

const EMPTY_META: Record<string, never> = {};

function formatAlbumDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const StudioGuestBookPage: React.FC = () => {
  const { t: tNav } = useTranslation(undefined, { keyPrefix: 'nav.studio' });
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform.guestBookStudioPage' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { albumId: routeAlbumId, eventId: legacyEventId } = useParams<{
    albumId?: string;
    eventId?: string;
  }>();
  const resolvedRouteId = routeAlbumId ?? legacyEventId ?? null;

  const [search, setSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(resolvedRouteId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newAlbumName, setNewAlbumName] = React.useState('');
  const [newAlbumNote, setNewAlbumNote] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (resolvedRouteId) setSelectedId(resolvedRouteId);
  }, [resolvedRouteId]);

  const {
    data: albums = [],
    isLoading: loadingAlbums,
    isError: albumsError,
    refetch: refetchAlbums,
  } = useQuery({
    queryKey: ['studioAlbums', 'guestBookHub'],
    queryFn: listStudioAlbumsForGuestBook,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (resolvedRouteId || loadingAlbums || albums.length === 0) return;
    navigate(`/guest-book/${albums[0].id}`, { replace: true });
  }, [resolvedRouteId, loadingAlbums, albums, navigate]);

  const selectedAlbum = React.useMemo(
    () => albums.find((a) => String(a.id) === selectedId) ?? null,
    [albums, selectedId]
  );

  const scopeMeta = useGuestBookStore((s) =>
    selectedId ? s.metaByEvent[selectedId] ?? EMPTY_META : EMPTY_META
  );

  const {
    data: albumImages = [],
    isLoading: loadingImages,
    isError: imagesError,
    refetch: refetchImages,
  } = useQuery({
    queryKey: ['studioAlbumImages', 'guestBook', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      return fetchStudioAlbumImages(Number(selectedId));
    },
    enabled: Boolean(selectedId),
    staleTime: 10_000,
  });

  const apiEntries = React.useMemo(
    () =>
      selectedAlbum
        ? mapAlbumImagesToGuestEntries(selectedAlbum, albumImages, scopeMeta, { canManage: true })
        : [],
    [selectedAlbum, albumImages, scopeMeta]
  );

  const filteredAlbums = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false)
    );
  }, [albums, search]);

  const selectAlbum = (id: number) => {
    setSelectedId(String(id));
    navigate(`/guest-book/${id}`, { replace: true });
  };

  const clearSelection = () => {
    setSelectedId(null);
    navigate('/guest-book', { replace: true });
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) {
      toast.error(t('albumNameRequired'));
      return;
    }
    setCreating(true);
    try {
      const created = await createStudioGuestBookAlbum({
        name,
        description: newAlbumNote.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['studioAlbums', 'guestBookHub'] });
      setCreateOpen(false);
      setNewAlbumName('');
      setNewAlbumNote('');
      toast.success(t('albumCreated'));
      selectAlbum(created.id);
    } catch {
      toast.error(t('albumCreateError'));
    } finally {
      setCreating(false);
    }
  };

  const albumSubtitle = selectedAlbum
    ? [
        formatAlbumDate(selectedAlbum.createdAt),
        selectedAlbum.imageCount != null
          ? t('photoCount', { count: selectedAlbum.imageCount })
          : t('photoCount', { count: albumImages.length }),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const refreshGuestBook = () => {
    void refetchImages();
    void refetchAlbums();
    void queryClient.invalidateQueries({ queryKey: ['studioAlbumImages', 'guestBook', selectedId] });
  };

  return (
    <div className="guest-book-studio studio-albums-scope portal-page-surface min-h-[calc(100dvh-4rem)] transition-colors duration-200">
      <div className="mx-auto max-w-[1400px] px-1 sm:px-2 py-4 sm:py-6">
        <header className="guest-book-studio__header">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
                <BookHeart className="h-3.5 w-3.5" aria-hidden />
                {tNav('guestBook')}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--sa-text)]">
                {t('title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--sa-text-muted)] leading-relaxed">
                {t('subtitle')}
              </p>
            </div>
            {selectedAlbum ? (
              <Link
                to={`/studio/albums`}
                className="guest-book-studio__toolbar-btn inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold min-h-[44px] transition-colors"
              >
                <FolderOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {t('manageAlbums')}
              </Link>
            ) : null}
          </div>
        </header>

        <div className="guest-book-studio__grid">
          <aside className="guest-book-studio__sidebar">
            <div className="border-b border-[var(--sa-border)] px-4 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--sa-text-muted)]">
                  {t('albumsLabel')}
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-indigo-500 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {t('createAlbum')}
                </button>
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sa-text-faint)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  aria-label={t('searchPlaceholder')}
                  className="w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-muted)] py-2.5 pl-9 pr-3 text-sm text-[var(--sa-text)] placeholder:text-[var(--sa-text-faint)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[44px]"
                />
              </div>
            </div>

            <div className="max-h-[min(58vh,520px)] overflow-y-auto p-2 guest-book-scroll">
              {loadingAlbums ? (
                <div className="flex justify-center py-14 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
                  <span className="sr-only">{t('loadingAlbums')}</span>
                </div>
              ) : null}

              {albumsError ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">{t('loadError')}</p>
                  <button
                    type="button"
                    onClick={() => refetchAlbums()}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t('retry')}
                  </button>
                </div>
              ) : null}

              {!loadingAlbums && !albumsError && filteredAlbums.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm font-medium text-[var(--sa-text)]">
                    {search ? t('noMatch') : t('noAlbums')}
                  </p>
                  {!search ? (
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('createAlbum')}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <ul className="space-y-1">
                {filteredAlbums.map((album) => {
                  const active = selectedId === String(album.id);
                  const cover = album.thumbnailUrl || album.coverImageUrl;
                  const count = album.imageCount ?? 0;

                  return (
                    <li key={album.id}>
                      <button
                        type="button"
                        onClick={() => selectAlbum(album.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`guest-book-studio__album-btn w-full text-left rounded-xl px-2.5 py-2.5 transition-all min-h-[44px] flex gap-3 items-center ${
                          active ? 'guest-book-studio__album-btn--active' : ''
                        }`}
                      >
                        <div
                          className={`h-12 w-12 shrink-0 rounded-lg overflow-hidden border ${
                            active ? 'border-white/30' : 'border-[var(--sa-border)]'
                          } bg-[var(--sa-surface-muted)]`}
                        >
                          {cover ? (
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Images
                                className={`h-5 w-5 ${active ? 'text-white/70' : 'text-[var(--sa-text-faint)]'}`}
                                aria-hidden
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate leading-tight">{album.name}</p>
                          {album.description?.trim() ? (
                            <p
                              className={`mt-0.5 text-[11px] line-clamp-1 ${
                                active ? 'text-white/80' : 'text-[var(--sa-text-muted)]'
                              }`}
                            >
                              {album.description}
                            </p>
                          ) : null}
                          <p
                            className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${
                              active ? 'text-white/65' : 'text-[var(--sa-text-faint)]'
                            }`}
                          >
                            {t('photoCount', { count })}
                          </p>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 ${active ? 'text-white/80' : 'text-[var(--sa-text-faint)]'}`}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedId ? (
              <div className="guest-book-studio__panel flex flex-col items-center justify-center px-6 py-20 sm:py-28 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-300/40 dark:border-indigo-500/30">
                  <BookHeart className="h-8 w-8 text-indigo-600 dark:text-indigo-300" aria-hidden />
                </div>
                <h2 className="text-2xl font-bold text-[var(--sa-text)]">{t('pickAlbumTitle')}</h2>
                <p className="mt-2 text-sm text-[var(--sa-text-muted)] max-w-sm">{t('pickAlbumBody')}</p>
              </div>
            ) : loadingImages && !albumImages.length ? (
              <div className="guest-book-studio__panel flex justify-center items-center py-24">
                <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />
              </div>
            ) : imagesError ? (
              <div className="guest-book-studio__panel px-6 py-14 text-center">
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">{t('albumLoadError')}</p>
                <button
                  type="button"
                  onClick={() => refetchImages()}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  {t('retry')}
                </button>
              </div>
            ) : selectedAlbum ? (
              <div className="guest-book-studio__panel">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--sa-border)] bg-[var(--sa-surface-muted)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {t('digitalGuestBook')}
                    </p>
                    <p className="font-semibold text-sm text-[var(--sa-text)] truncate">
                      {selectedAlbum.name}
                    </p>
                    {albumSubtitle ? (
                      <p className="text-xs text-[var(--sa-text-muted)] truncate">{albumSubtitle}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="guest-book-studio__toolbar-btn shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold min-h-[40px]"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('changeAlbum')}</span>
                  </button>
                </div>
                <GuestBookPage
                  scopeId={String(selectedAlbum.id)}
                  scopeName={selectedAlbum.name}
                  apiEntries={apiEntries}
                  subtitle={albumSubtitle}
                  variant="embedded"
                  canUpload
                  canManage
                  onUploadFiles={(files, note) =>
                    uploadPhotosToStudioAlbum(selectedAlbum.id, files, note)
                  }
                  onUploadSuccess={refreshGuestBook}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-guest-album-title"
        >
          <form
            onSubmit={handleCreateAlbum}
            className="w-full max-w-md rounded-2xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-5 shadow-xl"
          >
            <h2 id="create-guest-album-title" className="text-lg font-bold text-[var(--sa-text)]">
              {t('createAlbumTitle')}
            </h2>
            <p className="mt-1 text-sm text-[var(--sa-text-muted)]">{t('createAlbumBody')}</p>
            <label className="mt-4 block text-xs font-semibold text-[var(--sa-text-muted)]">
              {t('albumNameLabel')}
              <input
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-muted)] px-3 py-2.5 text-sm text-[var(--sa-text)] min-h-[44px]"
                placeholder={t('albumNamePlaceholder')}
                autoFocus
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-[var(--sa-text-muted)]">
              {t('albumNoteLabel')}
              <textarea
                value={newAlbumNote}
                onChange={(e) => setNewAlbumNote(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-muted)] px-3 py-2.5 text-sm text-[var(--sa-text)] resize-none"
                placeholder={t('albumNotePlaceholder')}
              />
            </label>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-[var(--sa-border)] px-4 py-2.5 text-sm font-semibold text-[var(--sa-text)]"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {creating ? t('creating') : t('createAlbum')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default StudioGuestBookPage;
