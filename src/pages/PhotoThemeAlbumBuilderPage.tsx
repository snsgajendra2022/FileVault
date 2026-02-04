import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import { photobookTemplates, getPhotoBookTemplate } from '../templates/photobookTemplates';
import type { EditablePageState } from './PhotoThemeCategoryPage';

type AlbumPage = {
  index: number;
  type: 'cover' | 'inner' | 'last';
  layoutName: string;
};

type PageImageState = {
  imageDataUrl?: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function pickTemplateIdForCategory(categorySlug: string): string {
  if (categorySlug === 'wedding') return 'wedding';
  if (categorySlug === 'birthday' || categorySlug === 'festival') return 'birthday';
  if (categorySlug === 'family' || categorySlug === 'baby-kids' || categorySlug === 'corporate')
    return 'grid';
  return 'classic';
}


const PhotoThemeAlbumBuilderPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const location = useLocation() as {
    state?: { coverPage?: EditablePageState; lastPage?: EditablePageState };
  };
  const coverFromState = location.state?.coverPage;
  const lastFromState = location.state?.lastPage;

  const templateId = pickTemplateIdForCategory(categorySlug);
  const template = getPhotoBookTemplate(templateId);

  // Base pages derived from template spreads (cover + inner + last)
  const basePages: AlbumPage[] = React.useMemo(() => {
    if (!template) return [];
    return template.defaultSpreads.map((spreadRef, idx, all) => {
      const layout = template.layouts.find((l) => l.id === spreadRef.layoutId);
      const layoutName = layout?.name ?? spreadRef.layoutId;
      const type: AlbumPage['type'] =
        idx === 0 ? 'cover' : idx === all.length - 1 ? 'last' : 'inner';
      return {
        index: idx,
        type,
        layoutName,
      };
    });
  }, [template]);

  // User-controlled page count (min 6, max 12)
  const [pageCount, setPageCount] = React.useState<number>(() =>
    Math.min(12, Math.max(6, basePages.length || 6)),
  );

  // Keep pageCount in sync if basePages length changes
  React.useEffect(() => {
    if (!basePages.length) return;
    setPageCount((prev) => {
      const min = 6;
      const max = 12;
      const baseDefault = Math.max(min, basePages.length);
      const next = prev || baseDefault;
      return Math.min(max, Math.max(min, next));
    });
  }, [basePages.length]);

  const albumPages: AlbumPage[] = React.useMemo(() => {
    if (!basePages.length) return [];

    const min = 6;
    const max = 12;
    const target = Math.min(max, Math.max(min, pageCount));

    const cover = basePages[0];
    const last = basePages[basePages.length - 1];
    const inner = basePages.slice(1, basePages.length - 1);

    // If no inner pages, fall back to using cover layout as inner
    const innerPool = inner.length ? [...inner] : [{ index: 1, type: 'inner', layoutName: cover.layoutName }];

    const pages: AlbumPage[] = [cover];

    // Fill inner pages to reach target-1 (last page reserved)
    let i = 0;
    while (pages.length < target - 1) {
      const sample = innerPool[i % innerPool.length];
      pages.push({ index: pages.length, type: 'inner', layoutName: sample.layoutName });
      i += 1;
    }

    // Add last page
    pages.push({ index: pages.length, type: 'last', layoutName: last.layoutName });

    // Re-index & normalize type
    return pages.map((p, idx, all) => ({
      index: idx,
      type: idx === 0 ? 'cover' : idx === all.length - 1 ? 'last' : 'inner',
      layoutName: p.layoutName,
    }));
  }, [basePages, pageCount]);

  const [pageImages, setPageImages] = React.useState<Record<number, PageImageState>>({});

  const handleImageChange = async (pageIndex: number, file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPageImages((prev) => ({
      ...prev,
      [pageIndex]: { imageDataUrl: dataUrl },
    }));
  };

  // Pre‑fill cover & last page images from previous step (if not already chosen here)
  React.useEffect(() => {
    if (!albumPages.length) return;
    setPageImages((prev) => {
      const next: Record<number, PageImageState> = { ...prev };

      const coverImg = coverFromState?.imageDataUrl;
      const lastImg = lastFromState?.imageDataUrl;

      const coverPage = albumPages.find((p) => p.type === 'cover');
      const lastPage = albumPages.find((p) => p.type === 'last');

      // Clear any old cover/back copies that are now inner pages
      albumPages.forEach((p) => {
        const idx = p.index;
        const current = next[idx]?.imageDataUrl;
        if (!current) return;
        if (coverImg && current === coverImg && p.type !== 'cover') {
          delete next[idx];
        }
        if (lastImg && current === lastImg && p.type !== 'last') {
          delete next[idx];
        }
      });

      // Ensure current cover page always has cover image (if provided) unless user already set one.
      if (coverPage && coverImg) {
        const idx = coverPage.index;
        if (!next[idx]?.imageDataUrl) {
          next[idx] = { imageDataUrl: coverImg };
        }
      }

      // Ensure current last page always has last image (if provided) unless user already set one.
      if (lastPage && lastImg) {
        const idx = lastPage.index;
        if (!next[idx]?.imageDataUrl) {
          next[idx] = { imageDataUrl: lastImg };
        }
      }

      return next;
    });
  }, [albumPages, coverFromState, lastFromState]);

  if (!template) {
    return (
      <div className="space-y-4 w-full">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Unknown theme configuration for <span className="font-semibold">{categorySlug}</span>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Print styles to hide nav/header and keep only album pages */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          header, nav, aside { display: none !important; }
          .no-print { display: none !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
          /* Ensure Anniversary romantic backgrounds print correctly */
          .anniversary-romantic-bg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header (hidden in print) */}
      <div className="no-print relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Build your album</h1>
            <p className="text-sm md:text-base text-blue-100">
              Theme: <span className="font-semibold capitalize">{categorySlug || 'custom'}</span> ·
              Template: <span className="font-semibold">{template.name}</span>
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-right text-xs text-blue-100">
            <span>Total pages: {albumPages.length}</span>
            <span>Cover + {Math.max(0, albumPages.length - 2)} inner + last page</span>
          </div>
        </div>
      </div>

      {/* Pages list with per-page image selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Album pages</h2>
            <span className="text-xs text-gray-500">
              Select photos for each page. Only these pages will appear in print/PDF.
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Total pages:</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
            >
              {[6, 7, 8, 9, 10, 11, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-1">
          {albumPages.map((page, idx, allPages) => {
            const state = pageImages[page.index] ?? {};
            const textState: EditablePageState | undefined =
              page.type === 'cover'
                ? coverFromState
                : page.type === 'last'
                ? lastFromState
                : undefined;
            return (
              <div
                key={page.index}
                className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-transform print:shadow-none print:border-gray-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {page.type === 'cover'
                        ? 'Cover Page'
                        : page.type === 'last'
                        ? 'Last Page'
                        : `Page ${page.index + 1}`}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{page.layoutName}</div>
                  </div>
                  <div className="text-xs text-gray-400 print:text-gray-500">#{page.index + 1}</div>
                </div>

                <div 
                  className="relative w-full aspect-[16/9] rounded-xl border border-dashed border-gray-300 flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: categorySlug === 'anniversary' && 
                                    (page.type === 'cover' || page.type === 'last')
                      ? '#fef2f2' // Soft pink/red tint as base
                      : '#ffffff',
                  }}
                >
                  {/* Romantic couple-themed background with hearts for Anniversary theme */}
                  {categorySlug === 'anniversary' && 
                   (page.type === 'cover' || page.type === 'last') && (
                    <>
                      {/* Gradient background */}
                      <div 
                        className="anniversary-romantic-bg absolute inset-0 z-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(220, 38, 38, 0.18) 0%, 
                            rgba(236, 72, 153, 0.15) 25%, 
                            rgba(219, 39, 119, 0.12) 50%, 
                            rgba(251, 113, 133, 0.15) 75%, 
                            rgba(239, 68, 68, 0.18) 100%
                          ),
                          radial-gradient(circle at 20% 30%, rgba(251, 146, 60, 0.1) 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, rgba(244, 114, 182, 0.1) 0%, transparent 50%)`,
                        }}
                      />
                      
                      {/* Decorative hearts pattern */}
                      <div className="absolute inset-0 z-0 rounded-xl overflow-hidden">
                        <div 
                          className="absolute text-red-400 opacity-20" 
                          style={{ top: '8%', left: '10%', transform: 'rotate(-15deg)' }}
                        >
                          <FaHeart size={24} />
                        </div>
                        <div 
                          className="absolute text-pink-400 opacity-25" 
                          style={{ top: '15%', right: '12%', transform: 'rotate(20deg)' }}
                        >
                          <FaHeart size={20} />
                        </div>
                        <div 
                          className="absolute text-red-500 opacity-20" 
                          style={{ top: '25%', left: '5%', transform: 'rotate(-10deg)' }}
                        >
                          <FaHeart size={18} />
                        </div>
                        <div 
                          className="absolute text-pink-500 opacity-22" 
                          style={{ bottom: '20%', right: '8%', transform: 'rotate(15deg)' }}
                        >
                          <FaHeart size={22} />
                        </div>
                        <div 
                          className="absolute text-red-400 opacity-18" 
                          style={{ bottom: '12%', left: '15%', transform: 'rotate(-25deg)' }}
                        >
                          <FaHeart size={19} />
                        </div>
                        <div 
                          className="absolute text-pink-400 opacity-20" 
                          style={{ bottom: '30%', right: '20%', transform: 'rotate(10deg)' }}
                        >
                          <FaHeart size={16} />
                        </div>
                        <div 
                          className="absolute text-red-500 opacity-15" 
                          style={{ top: '45%', left: '3%', transform: 'rotate(-18deg)' }}
                        >
                          <FaHeart size={21} />
                        </div>
                        <div 
                          className="absolute text-pink-500 opacity-20" 
                          style={{ top: '55%', right: '5%', transform: 'rotate(22deg)' }}
                        >
                          <FaHeart size={17} />
                        </div>
                        <div 
                          className="absolute text-red-400 opacity-18" 
                          style={{ top: '70%', left: '12%', transform: 'rotate(-12deg)' }}
                        >
                          <FaHeart size={19} />
                        </div>
                        <div 
                          className="absolute text-pink-400 opacity-22" 
                          style={{ bottom: '45%', right: '15%', transform: 'rotate(18deg)' }}
                        >
                          <FaHeart size={20} />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {state.imageDataUrl ? (
                    <img
                      src={state.imageDataUrl}
                      alt={`Page ${page.index + 1}`}
                      className="relative z-10 w-full h-full object-cover rounded-lg shadow-lg"
                      style={{
                        transform: `scale(${textState?.style?.imageScale ?? 1})`,
                        transformOrigin: 'center center',
                        maxWidth: categorySlug === 'anniversary' && (page.type === 'cover' || page.type === 'last') 
                          ? '85%' 
                          : '100%',
                        maxHeight: categorySlug === 'anniversary' && (page.type === 'cover' || page.type === 'last') 
                          ? '85%' 
                          : '100%',
                      }}
                    />
                  ) : categorySlug === 'anniversary' && (page.type === 'cover' || page.type === 'last') ? (
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      <span className="relative z-10 text-sm text-red-600 font-medium text-center px-4">
                        Select a romantic photo to see it beautifully framed with hearts
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 text-center px-4">
                      No image selected. Choose an image to place on this page.
                    </span>
                  )}

                  {/* Cover / last page text overlay - appears ABOVE image (z-20) */}
                  {textState && (textState.headline || textState.subheadline) && (
                    <div
                      className={`absolute inset-0 z-20 flex px-4 py-4 bg-gradient-to-t from-black/70 via-black/10 to-transparent ${
                        textState.style?.verticalAlign === 'top'
                          ? 'items-start justify-start'
                          : textState.style?.verticalAlign === 'center'
                          ? 'items-center justify-center'
                          : 'items-end justify-end'
                      }`}
                    >
                      <div
                        className={`w-full max-w-full ${
                          textState.style?.align === 'center'
                            ? 'text-center'
                            : textState.style?.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {textState.headline && (
                          <div
                            className="truncate"
                            style={{
                              fontSize: textState.style?.fontSize ?? 20,
                              fontWeight: textState.style?.fontWeight ?? 700,
                              color: textState.style?.headlineColor ?? '#ffffff',
                              fontFamily: textState.style?.fontFamily,
                            }}
                          >
                            {textState.headline}
                          </div>
                        )}
                        {textState.subheadline && (
                          <div
                            className="truncate mt-1"
                            style={{
                              fontSize: (textState.style?.fontSize ?? 20) - 4,
                              fontWeight: (textState.style?.fontWeight ?? 700) - 200 || 400,
                              color: textState.style?.subheadlineColor ?? '#e5e7eb',
                              fontFamily: textState.style?.fontFamily,
                            }}
                          >
                            {textState.subheadline}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls (hidden in print) */}
                <div className="mt-3 space-y-2 print:hidden">
                  <label className="block text-[11px] font-semibold text-gray-700">
                    Select image for this page
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block w-full text-[11px] text-gray-600"
                      onChange={(e) => handleImageChange(page.index, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <p className="text-[10px] text-gray-500">
                    Theme layouts (cover, grids, collage) are already chosen as per{' '}
                    <span className="font-semibold">{template.name}</span>. Here you only pick which
                    photo should appear on each page.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export / print from same page (hidden in print) */}
      <div className="no-print flex justify-between items-center print:hidden">
        <p className="text-xs text-gray-500">
          Jab aap sab pages ke images select kar lo, &quot;Print / Export&quot; dabayein aur browser
          se PDF / print le sakte hain.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          Print / Export PDF
        </button>
      </div>
    </div>
  );
};

export default PhotoThemeAlbumBuilderPage;

