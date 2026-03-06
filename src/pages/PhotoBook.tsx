import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEdit,
  FaImages,
  FaFolderOpen,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import api from '../services/api';
import { getStoredToken } from '../utils/authUtils';

const ThreeDotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <circle cx="8" cy="3" r="1.5" />
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="8" cy="13" r="1.5" />
  </svg>
);

const API_BASE = process.env.REACT_APP_API_URL || '';

function buildCoverPreviewUrl(imageId: number): string {
  const token = getStoredToken();
  return `${API_BASE}/api/images/${imageId}/preview${token ? `?token=${token}` : ''}`;
}

/** Category slugs matching API: /api/photobooks/by-category/{slug} */
const PHOTOBOOK_CATEGORIES: { slug: string; title: string; templateId?: number }[] = [
  { slug: 'baby-kids', title: 'Baby & Kids', templateId: 4 },
  { slug: 'wedding', title: 'Wedding', templateId: 3 },
  { slug: 'anniversary', title: 'Anniversary', templateId: 2 },
  { slug: 'birthday', title: 'Birthday', templateId: 1 },
];

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

const stepLabel = (step?: string) =>
  step === 'ALBUM' ? 'Album' : step === 'PREVIEW' ? 'Preview' : step === 'DONE' ? 'Done' : 'Cover';

type CoversResponse = {
  frontCover?: { imageId?: number | null; imageUrl?: string | null };
  backCover?: { imageId?: number | null; imageUrl?: string | null };
};

const PhotoBook: React.FC = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookWithTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverUrls, setCoverUrls] = useState<Record<number, string>>({});
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
  }, []);

  // Fetch cover image for each book that has covers (for display on folder front)
  useEffect(() => {
    const token = getStoredToken();
    if (!token || books.length === 0) return;
    const headers = { 'X-API-KEY': token };
    let isMounted = true;
    const withCovers = books.filter((b) => b.hasCovers && b.id);
    const loadCovers = async () => {
      const next: Record<number, string> = {};
      await Promise.all(
        withCovers.map(async (book) => {
          try {
            const res = await api.get<CoversResponse>(`/api/photobooks/${book.id}/covers`, { headers });
            const front = res.data?.frontCover;
            if (!front) return;
            let url = '';
            if (front.imageId) {
              url = buildCoverPreviewUrl(front.imageId);
            } else if (front.imageUrl) {
              url = front.imageUrl.startsWith('http') ? front.imageUrl : `${API_BASE}${front.imageUrl}`;
            }
            if (url && isMounted) next[book.id] = url;
          } catch {
            // no cover or failed
          }
        })
      );
      if (isMounted) setCoverUrls((prev) => ({ ...prev, ...next }));
    };
    loadCovers();
    return () => { isMounted = false; };
  }, [books]);

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
              <h1 className="text-2xl font-bold text-slate-900">My Photo Books</h1>
              <p className="text-sm text-slate-500">View, preview, and edit your created books</p>
            </div>
          </div>
          <Link
            to="/photo-themes"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <FaFolderOpen className="h-4 w-4" />
            New Book
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FaSpinner className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading your books...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FaImages className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">No photo books yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Create your first book from Photo Themes. Pick a theme, design the cover, then add album pages.
            </p>
            <Link
              to="/photo-themes"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <FaFolderOpen className="h-4 w-4" />
              Go to Photo Themes
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
                    aria-label="Options"
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
                      {coverUrls[book.id] ? (
                        <img
                          src={coverUrls[book.id]}
                          alt={book.title || 'Cover'}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-amber-200/95 font-semibold text-xs leading-tight line-clamp-3">
                            {book.title || `Book #${book.id}`}
                          </span>
                          <span className="text-amber-300/70 text-[10px] mt-1">{book.theme.title}</span>
                        </div>
                      )}
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
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { handlePreview(book, 'flip'); setOpenMenuBookId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaImages className="h-4 w-4 text-slate-500 shrink-0" />
                        Flip book
                      </button>
                      <button
                        type="button"
                        onClick={() => { handlePreview(book, 'page'); setOpenMenuBookId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaImages className="h-4 w-4 text-slate-500 shrink-0" />
                        Page view
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => setOpenMenuBookId(null)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <FaTimes className="h-4 w-4 shrink-0" />
                        Close
                      </button>
                    </div>
                  </>
                )}
                {/* Label below folder (title + theme only, no buttons) */}
                <div className="mt-3 text-center">
                  <p className="text-sm font-semibold text-slate-800 truncate px-1" title={book.title || `Book #${book.id}`}>
                    {book.title || `Book #${book.id}`}
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
