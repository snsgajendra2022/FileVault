import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEdit,
  FaImages,
  FaFolderOpen,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';
import { PhotoBookSkeleton } from '../../components/common/skeletons';
import { getStoredToken } from '../../utils/authUtils';

const ThreeDotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <circle cx="8" cy="3" r="1.5" />
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="8" cy="13" r="1.5" />
  </svg>
);

/** Same host as `api` — `<img src>` must be absolute when the SPA is not served from the API origin. */
function getApiBaseForAssets(): string {
  const env = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const ax = api.defaults.baseURL;
  if (typeof ax === 'string' && ax.trim()) return ax.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** `<img src>` cannot send Authorization headers; backend preview accepts `token` query (and often Bearer via separate requests). */
function appendPreviewToken(url: string): string {
  const token = getStoredToken();
  if (!token || url.startsWith('data:')) return url;
  if (/[?&]token=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/**
 * Turn a cover side (front or back) into a browser-loadable preview URL.
 * Prefer `/api/images/{id}/preview` — raw `imageUrl` may point at `.enc` objects that the browser cannot decode.
 */
function resolveCoverSideDisplayUrl(side: {
  imageId?: number | null;
  imageUrl?: string | null;
} | undefined | null): string {
  if (!side) return '';

  const base = getApiBaseForAssets();
  const id = side.imageId != null ? Number(side.imageId) : 0;

  if (id > 0) {
    return appendPreviewToken(`${base}/api/images/${id}/preview`);
  }

  const raw = side.imageUrl;
  if (!raw || typeof raw !== 'string') return '';

  if (raw.startsWith('data:')) return raw;

  const idMatch = raw.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/i);
  if (idMatch) {
    return appendPreviewToken(`${base}/api/images/${idMatch[1]}/preview`);
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    if (/\.enc(\?|$)/i.test(raw)) return '';
    return appendPreviewToken(raw);
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return appendPreviewToken(`${base}${path}`);
}

/** Category slugs matching API: /api/photobooks/by-category/{slug} */

type PhotobookProgress = {
  id: number;
  categorySlug: string;
  status: string;
  currentStep: string;
  hasCovers: boolean;
  savedPagesCount: number;
  title?: string;
  templateId?: number;
};

type ThemeInfo = {
  id: string;
  title: string;
  templateId?: number;
};

type BookWithTheme = PhotobookProgress & { theme: ThemeInfo };

type CoverSide = { imageId?: number | null; imageUrl?: string | null };

type CoversResponse = {
  frontCover?: CoverSide;
  backCover?: CoverSide;
};

function normalizeCoversPayload(data: unknown): CoversResponse | null {
  if (!data || typeof data !== 'object') return null;
  const row = Array.isArray(data) ? (data as unknown[])[0] : data;
  if (!row || typeof row !== 'object') return null;
  const o = row as CoversResponse;
  if (!o.frontCover && !o.backCover) return null;
  return o;
}

/**
 * Prefer per-photobook `/api/photobooks/:id/covers`; fill gaps from `GET /api/covers?userId=&templateId=`
 * (same payload as studio — front/back with imageId pointing at previewable images).
 */
async function loadMergedCovers(
  book: BookWithTheme,
  userId: number | undefined,
  headers: Record<string, string>
): Promise<CoversResponse | null> {
  let fromPhotobook: CoversResponse | null = null;
  try {
    const res = await api.get<CoversResponse>(`/api/photobooks/${book.id}/covers`, { headers });
    fromPhotobook = normalizeCoversPayload(res.data) ?? (res.data as CoversResponse);
  } catch {
    /* use template only */
  }

  let fromTemplate: CoversResponse | null = null;
  const templateId = book.theme.templateId;
  if (userId && templateId) {
    try {
      const res = await api.get<CoversResponse | CoversResponse[]>('/api/covers', {
        headers,
        params: { userId, templateId },
      });
      fromTemplate = normalizeCoversPayload(res.data);
    } catch {
      /* ignore */
    }
  }

  const front = coverSideHasRenderableImage(fromPhotobook?.frontCover)
    ? fromPhotobook!.frontCover
    : fromTemplate?.frontCover;
  const back = coverSideHasRenderableImage(fromPhotobook?.backCover)
    ? fromPhotobook!.backCover
    : fromTemplate?.backCover;

  if (!coverSideHasRenderableImage(front) && !coverSideHasRenderableImage(back)) return null;
  return { frontCover: front, backCover: back };
}

/** True when we can resolve a preview (imageId, or non-.enc http URL). */
function coverSideHasRenderableImage(side: CoverSide | undefined): boolean {
  if (!side) return false;
  const id = side.imageId != null ? Number(side.imageId) : 0;
  if (id > 0) return true;
  const raw = side.imageUrl;
  if (!raw || typeof raw !== 'string') return false;
  if (raw.startsWith('data:')) return true;
  if (/\.enc(\?|$)/i.test(raw)) return false;
  return true;
}

/** Folder card cover: try `<img src>` with token query; if that fails, fetch preview as blob with axios (Bearer + X-API-KEY). */
const PhotobookCoverImage: React.FC<{
  previewUrl: string;
  imageId?: number;
  alt: string;
  fallbackTitle: string;
  fallbackTheme: string;
}> = ({ previewUrl, imageId, alt, fallbackTitle, fallbackTheme }) => {
  const [phase, setPhase] = React.useState<'direct' | 'blob' | 'dead'>('direct');
  const [blobSrc, setBlobSrc] = React.useState<string | null>(null);
  const blobRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setPhase('direct');
    setBlobSrc(null);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  }, [previewUrl, imageId]);

  React.useEffect(
    () => () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    },
    []
  );

  const loadBlobFallback = React.useCallback(async () => {
    if (!imageId || imageId <= 0) {
      setPhase('dead');
      return;
    }
    try {
      const token = getStoredToken();
      const res = await api.get(`/api/images/${imageId}/preview`, {
        responseType: 'blob',
        headers: token ? { 'X-API-KEY': token } : {},
      });
      const u = URL.createObjectURL(res.data);
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = u;
      setBlobSrc(u);
      setPhase('blob');
    } catch {
      setPhase('dead');
    }
  }, [imageId]);

  if (phase === 'dead' || !previewUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
        <span className="text-amber-200/95 font-semibold text-xs leading-tight line-clamp-3">{fallbackTitle}</span>
        <span className="text-amber-300/70 text-[10px] mt-1">{fallbackTheme}</span>
      </div>
    );
  }

  const src = phase === 'blob' ? blobSrc : previewUrl;
  if (!src) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
        <span className="text-amber-200/95 font-semibold text-xs leading-tight line-clamp-3">{fallbackTitle}</span>
        <span className="text-amber-300/70 text-[10px] mt-1">{fallbackTheme}</span>
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => {
        if (phase === 'direct') void loadBlobFallback();
        else setPhase('dead');
      }}
    />
  );
};

const PhotoBook: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const PHOTOBOOK_CATEGORIES = useMemo(
    () =>
      [
        { slug: 'baby-kids', titleKey: 'catBabyKids' as const, templateId: 4 },
        { slug: 'wedding', titleKey: 'catWedding' as const, templateId: 3 },
        { slug: 'anniversary', titleKey: 'catAnniversary' as const, templateId: 2 },
        { slug: 'birthday', titleKey: 'catBirthday' as const, templateId: 1 },
      ].map((c) => ({ slug: c.slug, title: t(`photoBookHub.${c.titleKey}`), templateId: c.templateId })),
    [t]
  );
  const stepLabel = (step?: string) =>
    step === 'ALBUM'
      ? t('photoBookHub.stepAlbum')
      : step === 'PREVIEW'
        ? t('photoBookHub.stepPreview')
        : step === 'DONE'
          ? t('photoBookHub.stepDone')
          : t('photoBookHub.stepCover');
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookWithTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({});
  /** For blob fallback when `<img src={previewUrl}>` fails (wrong host, auth, etc.) */
  const [coverImageIds, setCoverImageIds] = useState<Record<number, number>>({});
  const [backCoverUrls, setBackCoverUrls] = useState<Record<number, string>>({});
  const [backCoverImageIds, setBackCoverImageIds] = useState<Record<number, number>>({});
  const [openMenuBookId, setOpenMenuBookId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { 'X-API-KEY': token };

    const load = async () => {
      try {
        setLoading(true);
        const allBooks: BookWithTheme[] = [];
        await Promise.all(
          PHOTOBOOK_CATEGORIES.map(async ({ slug, title, templateId }) => {
            const theme: ThemeInfo = { id: slug, title, templateId };
            try {
              const res = await api.get<PhotobookProgress[]>(`/api/photobooks/by-category/${slug}`, { headers });
              const list = Array.isArray(res.data) ? res.data : [];
              list.forEach((pb) => {
                allBooks.push({ ...pb, theme });
              });
            } catch {
              // skip this category
            }
          })
        );
        allBooks.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        if (isMounted) setBooks(allBooks);
      } catch (e) {
        console.error('Failed to load photo books:', e);
        if (isMounted) setBooks([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [PHOTOBOOK_CATEGORIES]);

  // Fetch front + back cover previews per book: photobook covers first, then `/api/covers?userId=&templateId=`.
  useEffect(() => {
    const token = getStoredToken();
    if (!token || books.length === 0) return;
    const headers = { 'X-API-KEY': token };
    let isMounted = true;
    const toFetch = books.filter((b) => b.id);
    const uid = user?.id;
    const loadCovers = async () => {
      const nextFront: Record<number, string> = {};
      const nextFrontIds: Record<number, number> = {};
      const nextBack: Record<number, string> = {};
      const nextBackIds: Record<number, number> = {};
      await Promise.all(
        toFetch.map(async (book) => {
          try {
            const merged = await loadMergedCovers(book, uid, headers);
            if (!merged || !isMounted) return;
            const front = merged.frontCover;
            const back = merged.backCover;
            if (front && coverSideHasRenderableImage(front)) {
              const url = resolveCoverSideDisplayUrl(front);
              const iid = front.imageId != null ? Number(front.imageId) : 0;
              if (iid > 0) nextFrontIds[book.id] = iid;
              if (url) nextFront[book.id] = url;
            }
            if (back && coverSideHasRenderableImage(back)) {
              const url = resolveCoverSideDisplayUrl(back);
              const iid = back.imageId != null ? Number(back.imageId) : 0;
              if (iid > 0) nextBackIds[book.id] = iid;
              if (url) nextBack[book.id] = url;
            }
          } catch {
            /* no cover */
          }
        })
      );
      if (isMounted) {
        setCoverUrls((prev) => ({ ...prev, ...nextFront }));
        setCoverImageIds((prev) => ({ ...prev, ...nextFrontIds }));
        setBackCoverUrls((prev) => ({ ...prev, ...nextBack }));
        setBackCoverImageIds((prev) => ({ ...prev, ...nextBackIds }));
      }
    };
    loadCovers();
    return () => { isMounted = false; };
  }, [books, user?.id]);

  const handleEdit = (book: BookWithTheme) => {
    navigate(`/photo-themes/${book.theme.id}/album`, {
      state: { photobookId: book.id, dbTemplateId: book.theme.templateId },
    });
  };

  const handlePreview = (book: BookWithTheme, mode: 'flip' | 'page') => {
    navigate(`/photo-themes/${book.theme.id}/album`, {
      state: {
        photobookId: book.id,
        dbTemplateId: book.theme.templateId,
        openPreview: mode,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
              <FaImages className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('photoBookHub.title')}</h1>
              <p className="text-sm text-slate-500">{t('photoBookHub.subtitle')}</p>
            </div>
          </div>
          <Link
            to="/photo-themes"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <FaFolderOpen className="h-4 w-4" />
            {t('photoBookHub.newBook')}
          </Link>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-10 w-36 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <PhotoBookSkeleton count={8} />
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FaImages className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">{t('photoBookHub.emptyTitle')}</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              {t('photoBookHub.emptyBody')}
            </p>
            <Link
              to="/photo-themes"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <FaFolderOpen className="h-4 w-4" />
              {t('photoBookHub.goThemes')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="folder-card group relative"
              >
                {/* Folder shape - only 3-dots opens the menu */}
                <div className="folder-shape relative pt-6 px-3 pb-4 bg-gradient-to-b from-amber-50 to-amber-100/80 border border-amber-200/90 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 min-h-[200px] flex flex-col items-center">
                  {/* 3-dots: click to open/close menu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuBookId((id) => (id === book.id ? null : book.id));
                    }}
                    className="absolute top-2 right-2 z-10 w-8 h-4 rounded-lg flex items-center justify-center text-slate-500 hover:bg-amber-200/60 hover:text-slate-700 transition-colors"
                    aria-label={t('photoBookHub.optionsAria')}
                    aria-expanded={openMenuBookId === book.id}
                  >
                    <ThreeDotsIcon />
                  </button>
                  {/* Folder tab */}
                  <div className="absolute -top-2 left-4 w-12 h-4 bg-amber-200/90 border border-amber-300 rounded-t-md shadow-sm" />
                  {/* Book on front of folder */}
                  <div  onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuBookId((id) => (id === book.id ? null : book.id));
                    }} className="book-on-front flex-1 w-full flex items-center justify-center mt-1">
                    <div style={{ borderRadius: '2px 10px 10px 1px' }} className="relative w-full max-w-[100%] aspect-[3/4] rounded-sm shadow-lg border-2 border-amber-800/30 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20 z-[1]" />
                      {(() => {
                        const frontUrl = coverUrls[book.id];
                        const backUrl = backCoverUrls[book.id];
                        const split = !!(frontUrl && backUrl);
                        if (!frontUrl && !backUrl) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
                              <span className="text-amber-200/95 font-semibold text-xs leading-tight line-clamp-3">
                                {book.title || t('photoBookHub.bookNum', { id: book.id })}
                              </span>
                              <span className="text-amber-300/70 text-[10px] mt-1">{book.theme.title}</span>
                            </div>
                          );
                        }
                        return (
                          <div className={`absolute inset-0 flex ${split ? 'flex-row' : ''}`}>
                            {frontUrl ? (
                              <div className={split ? 'relative w-1/2 h-full min-w-0' : 'absolute inset-0'}>
                                <PhotobookCoverImage
                                  previewUrl={frontUrl}
                                  imageId={coverImageIds[book.id]}
                                  alt={book.title || t('photoBookHub.coverAlt')}
                                  fallbackTitle={book.title || t('photoBookHub.bookNum', { id: book.id })}
                                  fallbackTheme={book.theme.title}
                                />
                              </div>
                            ) : null}
                            {backUrl ? (
                              <div
                                className={
                                  split
                                    ? 'relative w-1/2 h-full min-w-0 border-l border-black/25'
                                    : 'absolute inset-0'
                                }
                              >
                                <PhotobookCoverImage
                                  previewUrl={backUrl}
                                  imageId={backCoverImageIds[book.id]}
                                  alt={t('photoBookHub.backCoverAlt')}
                                  fallbackTitle={book.title || t('photoBookHub.bookNum', { id: book.id })}
                                  fallbackTheme={book.theme.title}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {/* Dropdown: only shown when 3-dots was clicked; includes Close */}
                {openMenuBookId === book.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setOpenMenuBookId(null)}
                    />
                    <div className="absolute right-0 top-10 z-20 py-1.5 bg-white rounded-xl border border-slate-200 shadow-lg min-w-[160px]">
                      <button
                        type="button"
                        onClick={() => { handleEdit(book); setOpenMenuBookId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaEdit className="h-4 w-4 text-indigo-600 shrink-0" />
                        {t('photoBookHub.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { handlePreview(book, 'flip'); setOpenMenuBookId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaImages className="h-4 w-4 text-slate-500 shrink-0" />
                        {t('photoBookHub.flipBook')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { handlePreview(book, 'page'); setOpenMenuBookId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaImages className="h-4 w-4 text-slate-500 shrink-0" />
                        {t('photoBookHub.pageView')}
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => setOpenMenuBookId(null)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaTimes className="h-4 w-4 shrink-0" />
                        {t('photoBookHub.close')}
                      </button>
                    </div>
                  </>
                )}
                {/* Label below folder (title + theme only, no buttons) */}
                <div className="mt-3 text-center">
                  <p className="text-sm font-semibold text-slate-800 truncate px-1" title={book.title || t('photoBookHub.bookNum', { id: book.id })}>
                    {book.title || t('photoBookHub.bookNum', { id: book.id })}
                  </p>
                  <p className="text-xs text-slate-500">{book.theme.title} · {stepLabel(book.currentStep)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoBook;
