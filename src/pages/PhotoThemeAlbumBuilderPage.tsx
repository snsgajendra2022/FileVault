import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { FaHeart } from 'react-icons/fa';
import { photobookTemplates, getPhotoBookTemplate } from '../templates/photobookTemplates';
import { FileVaultImagePicker } from '../components/PhotoBook/FileVaultImagePicker';
import type { EditablePageState } from './PhotoThemeCategoryPage';

type AlbumPage = {
  index: number;
  type: 'cover' | 'inner' | 'last';
  layoutName: string;
};

type PageImageState = {
  imageDataUrl?: string;
  /** For multi-slot layouts (Two Up, Three Grid, Four Grid, Hero + Two, Collage) */
  imageDataUrls?: string[];
  layout?: string;
  /** Floral frame style for images on this page */
  frameStyle?: FloralFrameStyle;
};

type FloralFrameStyle =
  | 'none'
  | 'rose-floral-side'
  | 'maroon-gold-wedding'
  | 'pink-soft-romantic'
  | 'green-leaf-border'
  | 'royal-heavy-floral'
  | 'minimal-corner-flower'
  | 'full-floral-border'
  | 'heart-flower-combo';

function PhotoWithFloralFrame({
  src,
  alt,
  frameStyle = 'none',
  className = '',
  imgClassName = '',
  imgStyle,
}: {
  src: string;
  alt?: string;
  frameStyle?: FloralFrameStyle;
  className?: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
}) {
  const wrapperClass = ['relative w-full h-full overflow-hidden', className].filter(Boolean).join(' ');
  const baseImgClass = ['w-full h-full object-cover object-center', imgClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      <img src={src} alt={alt ?? ''} className={baseImgClass} style={imgStyle} />
    </div>
  );
}

function ImageFrameWrapper({
  frameStyle, // kept for backward compatibility, no-op now
  children,
  className = '',
}: {
  frameStyle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

const MULTI_IMAGE_LAYOUTS = ['Two Up', 'Three Grid', 'Four Grid', 'Hero + Two', 'Collage'];
const MULTI_IMAGE_SLOT_COUNT: Record<string, number> = {
  'Two Up': 2,
  'Three Grid': 3,
  'Four Grid': 4,
  'Hero + Two': 3,
  'Collage': 3,
};

const PAGE_LAYOUT_OPTIONS = [
  'Single Photo',
  'Hero + Two',
  'Two Up',
  'Three Grid',
  'Four Grid',
  'Cinematic Spread',
];

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


const COVER_LAST_STORAGE_KEY = 'photoTheme_cover_last';

function getStoredCoverLast(categorySlug: string): { coverPage?: EditablePageState; lastPage?: EditablePageState } | null {
  try {
    const raw = sessionStorage.getItem(`${COVER_LAST_STORAGE_KEY}_${categorySlug}`);
    if (!raw) return null;
    return JSON.parse(raw) as { coverPage?: EditablePageState; lastPage?: EditablePageState };
  } catch {
    return null;
  }
}

function setStoredCoverLast(categorySlug: string, coverPage: EditablePageState, lastPage: EditablePageState) {
  try {
    const toStore = {
      coverPage: {
        headline: coverPage.headline,
        subheadline: coverPage.subheadline,
        description: coverPage.description,
        style: coverPage.style,
      },
      lastPage: {
        headline: lastPage.headline,
        subheadline: lastPage.subheadline,
        description: lastPage.description,
        style: lastPage.style,
      },
    };
    sessionStorage.setItem(`${COVER_LAST_STORAGE_KEY}_${categorySlug}`, JSON.stringify(toStore));
  } catch (_) {}
}

const PhotoThemeAlbumBuilderPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const location = useLocation() as {
    state?: { coverPage?: EditablePageState; lastPage?: EditablePageState };
  };

  const [effectiveCover, setEffectiveCover] = React.useState<EditablePageState | undefined>(() => {
    const fromLoc = location.state?.coverPage;
    if (fromLoc) return fromLoc;
    const stored = categorySlug ? getStoredCoverLast(categorySlug) : null;
    return stored?.coverPage ?? undefined;
  });
  const [effectiveLast, setEffectiveLast] = React.useState<EditablePageState | undefined>(() => {
    const fromLoc = location.state?.lastPage;
    if (fromLoc) return fromLoc;
    const stored = categorySlug ? getStoredCoverLast(categorySlug) : null;
    return stored?.lastPage ?? undefined;
  });

  React.useEffect(() => {
    const coverFromNav = location.state?.coverPage;
    const lastFromNav = location.state?.lastPage;
    if (coverFromNav && lastFromNav) {
      setEffectiveCover(coverFromNav);
      setEffectiveLast(lastFromNav);
      if (categorySlug) setStoredCoverLast(categorySlug, coverFromNav, lastFromNav);
    }
  }, [categorySlug, location.state]);

  const coverFromState = effectiveCover;
  const lastFromState = effectiveLast;

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

  // User-controlled page count (min 6, max 18)
  const [pageCount, setPageCount] = React.useState<number>(() =>
    Math.min(18, Math.max(6, basePages.length || 6)),
  );

  // Keep pageCount in sync if basePages length changes
  React.useEffect(() => {
    if (!basePages.length) return;
    setPageCount((prev) => {
      const min = 6;
      const max = 18;
      const baseDefault = Math.max(min, basePages.length);
      const next = prev || baseDefault;
      return Math.min(max, Math.max(min, next));
    });
  }, [basePages.length]);

  const albumPages: AlbumPage[] = React.useMemo(() => {
    if (!basePages.length) return [];

    const min = 6;
    const max = 18;
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
  const [pageLayouts, setPageLayouts] = React.useState<Record<number, string>>({});
  const [showFlipBook, setShowFlipBook] = React.useState(false);
  const [pageImagePickerFor, setPageImagePickerFor] = React.useState<{
    pageIndex: number;
    layout: string;
  } | null>(null);
  
  // Color theme options for Anniversary theme
  const anniversaryColorThemes = [
    { id: 'red-pink', name: 'Red & Pink', colors: ['rgba(220, 38, 38, 0.18)', 'rgba(236, 72, 153, 0.15)', 'rgba(219, 39, 119, 0.12)', 'rgba(251, 113, 133, 0.15)', 'rgba(239, 68, 68, 0.18)'], accent: ['rgba(251, 146, 60, 0.1)', 'rgba(244, 114, 182, 0.1)'], base: '#fef2f2', heartColors: ['text-red-400', 'text-pink-400', 'text-red-500', 'text-pink-500'] },
    { id: 'purple-violet', name: 'Purple & Violet', colors: ['rgba(139, 92, 246, 0.18)', 'rgba(168, 85, 247, 0.15)', 'rgba(147, 51, 234, 0.12)', 'rgba(192, 132, 252, 0.15)', 'rgba(124, 58, 237, 0.18)'], accent: ['rgba(196, 181, 253, 0.1)', 'rgba(221, 214, 254, 0.1)'], base: '#faf5ff', heartColors: ['text-purple-400', 'text-violet-400', 'text-purple-500', 'text-violet-500'] },
    { id: 'rose-gold', name: 'Rose Gold', colors: ['rgba(225, 29, 72, 0.18)', 'rgba(251, 146, 60, 0.15)', 'rgba(244, 63, 94, 0.12)', 'rgba(252, 165, 165, 0.15)', 'rgba(217, 119, 6, 0.18)'], accent: ['rgba(253, 186, 116, 0.1)', 'rgba(254, 215, 170, 0.1)'], base: '#fff1f2', heartColors: ['text-rose-400', 'text-amber-400', 'text-rose-500', 'text-orange-400'] },
    { id: 'coral-peach', name: 'Coral & Peach', colors: ['rgba(249, 115, 22, 0.18)', 'rgba(251, 146, 60, 0.15)', 'rgba(234, 88, 12, 0.12)', 'rgba(253, 186, 116, 0.15)', 'rgba(239, 68, 68, 0.18)'], accent: ['rgba(254, 215, 170, 0.1)', 'rgba(255, 237, 213, 0.1)'], base: '#fff7ed', heartColors: ['text-orange-400', 'text-amber-400', 'text-orange-500', 'text-red-400'] },
    { id: 'lavender', name: 'Lavender', colors: ['rgba(167, 139, 250, 0.18)', 'rgba(196, 181, 253, 0.15)', 'rgba(139, 92, 246, 0.12)', 'rgba(221, 214, 254, 0.15)', 'rgba(124, 58, 237, 0.18)'], accent: ['rgba(237, 233, 254, 0.1)', 'rgba(243, 240, 253, 0.1)'], base: '#f5f3ff', heartColors: ['text-purple-300', 'text-violet-300', 'text-purple-400', 'text-indigo-400'] },
    { id: 'deep-pink', name: 'Deep Pink', colors: ['rgba(219, 39, 119, 0.18)', 'rgba(236, 72, 153, 0.15)', 'rgba(190, 24, 93, 0.12)', 'rgba(244, 114, 182, 0.15)', 'rgba(157, 23, 77, 0.18)'], accent: ['rgba(249, 168, 212, 0.1)', 'rgba(252, 211, 243, 0.1)'], base: '#fdf2f8', heartColors: ['text-pink-500', 'text-rose-500', 'text-pink-600', 'text-rose-600'] },
    { id: 'burgundy', name: 'Burgundy', colors: ['rgba(185, 28, 28, 0.18)', 'rgba(220, 38, 38, 0.15)', 'rgba(153, 27, 27, 0.12)', 'rgba(239, 68, 68, 0.15)', 'rgba(127, 29, 29, 0.18)'], accent: ['rgba(254, 202, 202, 0.1)', 'rgba(252, 165, 165, 0.1)'], base: '#fef2f2', heartColors: ['text-red-600', 'text-red-500', 'text-red-700', 'text-red-400'] },
    { id: 'blush', name: 'Blush', colors: ['rgba(251, 113, 133, 0.18)', 'rgba(244, 114, 182, 0.15)', 'rgba(236, 72, 153, 0.12)', 'rgba(249, 168, 212, 0.15)', 'rgba(219, 39, 119, 0.18)'], accent: ['rgba(252, 211, 243, 0.1)', 'rgba(253, 224, 71, 0.08)'], base: '#fdf2f8', heartColors: ['text-pink-300', 'text-rose-300', 'text-pink-400', 'text-rose-400'] },
  ];

  // Wedding theme – image background options for album pages
  const weddingBackgroundThemes = [
    { id: 'ivory-classic', name: 'Classic Ivory', base: '#fffff5', gradient: 'linear-gradient(160deg, #fffff5 0%, #faf8f0 50%, #f5f0e6 100%)' },
    { id: 'blush-rose', name: 'Blush Rose', base: '#fdf2f4', gradient: 'linear-gradient(160deg, #fdf2f4 0%, #fce7eb 50%, #fadde2 100%)' },
    { id: 'gold-cream', name: 'Gold & Cream', base: '#fefce8', gradient: 'linear-gradient(160deg, #fefce8 0%, #fef9c3 40%, #fde68a 100%)' },
    { id: 'lavender-dream', name: 'Lavender Dream', base: '#f5f3ff', gradient: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' },
    { id: 'sage-cream', name: 'Sage & Cream', base: '#f0fdf4', gradient: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 60%)' },
    { id: 'champagne', name: 'Champagne', base: '#fffbeb', gradient: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' },
    { id: 'pearl-white', name: 'Pearl White', base: '#fafafa', gradient: 'linear-gradient(160deg, #fafafa 0%, #f4f4f5 50%, #e4e4e7 100%)' },
    { id: 'dusty-pink', name: 'Dusty Pink', base: '#fdf4f3', gradient: 'linear-gradient(160deg, #fdf4f3 0%, #fce7e5 50%, #f9d5d2 100%)' },
    { id: 'mint-ivory', name: 'Mint & Ivory', base: '#f0fdf9', gradient: 'linear-gradient(160deg, #f0fdf9 0%, #ccfbf1 40%, #99f6e4 70%)' },
  ];

  const [selectedColorTheme, setSelectedColorTheme] = React.useState<string>('red-pink');
  const [selectedWeddingBackground, setSelectedWeddingBackground] = React.useState<string>('ivory-classic');

  const handleImageChange = async (pageIndex: number, file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPageImages((prev) => ({
      ...prev,
      [pageIndex]: { ...prev[pageIndex], imageDataUrl: dataUrl, imageDataUrls: [dataUrl] },
    }));
  };

  const handleMultipleImagesChange = async (pageIndex: number, files: FileList | null) => {
    if (!files?.length) return;
    const dataUrls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
    setPageImages((prev) => ({
      ...prev,
      [pageIndex]: {
        ...prev[pageIndex],
        imageDataUrl: dataUrls[0],
        imageDataUrls: dataUrls,
      },
    }));
  };
  
  const selectedTheme = anniversaryColorThemes.find(t => t.id === selectedColorTheme) || anniversaryColorThemes[0];
  const selectedWeddingTheme = weddingBackgroundThemes.find(t => t.id === selectedWeddingBackground) || weddingBackgroundThemes[0];

  const getPageLayoutLabel = (pageIndex: number, _fallbackLayoutName?: string) => {
    if (pageImages[pageIndex]?.layout) return pageImages[pageIndex]!.layout as string;
    if (pageLayouts[pageIndex]) return pageLayouts[pageIndex];
    // Default: simple single-image layout on every page
    return 'Single Photo';
  };

  const handleOpenFlipBook = React.useCallback(() => {
    // Always open flip-book view so user can see book layout,
    // even if some pages don't have images yet.
    setShowFlipBook(true);
  }, []);

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
          /* Only images: 1 section = 1 page, no overflow to next page */
          .album-page-card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; background: transparent !important; width: 100% !important; height: 100vh !important; max-height: 100vh !important; overflow: hidden !important; page-break-after: always !important; page-break-inside: avoid !important; display: flex !important; flex-direction: column !important; }
          .album-page-card:last-child { page-break-after: auto !important; }
          .album-page-card .album-card-no-print { display: none !important; }
          .album-page-card:has(.album-placeholder) { display: none !important; }
          .album-decor-no-print { display: none !important; }
          .album-page-preview { border: none !important; background: transparent !important; aspect-ratio: unset !important; height: 100% !important; min-height: 0 !important; max-height: 100% !important; width: 100% !important; padding: 0 !important; flex: 1 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden !important; }
          .album-page-preview img { max-width: 100% !important; max-height: 100% !important; width: auto !important; height: auto !important; object-fit: contain !important; display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .album-page-preview [class*="grid"] { height: 100% !important; max-height: 100% !important; overflow: hidden !important; }
          .album-page-preview [class*="grid"] img { max-width: 100% !important; max-height: 100% !important; width: auto !important; height: auto !important; object-fit: contain !important; }
          .album-pages-section { padding: 0 !important; }
          .album-pages-grid { padding: 0 !important; gap: 0 !important; }
          .anniversary-romantic-bg { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Header (hidden in print) */}
      <div className="no-print relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_0_0_1px_rgba(148,163,184,0.06),0_20px_50px_-12px_rgba(15,23,42,0.08)]">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 rounded-t-2xl" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Build your album</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="capitalize font-medium text-slate-600">{categorySlug || 'custom'}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>{template.name}</span>
              <span className="ml-2 text-slate-400">({albumPages.length} pages)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Album pages – in print only images; toolbar hidden in print */}
      <div className="album-pages-section rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden backdrop-blur-sm print:shadow-none print:border-0 print:bg-transparent print:rounded-none">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Pages</h2>
          <div className="flex flex-wrap items-center gap-2">
            {categorySlug === 'anniversary' && (
              <select
                className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                value={selectedColorTheme}
                onChange={(e) => setSelectedColorTheme(e.target.value)}
              >
                {anniversaryColorThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            )}
            {categorySlug === 'wedding' && (
              <select
                className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 min-w-[8rem]"
                value={selectedWeddingBackground}
                onChange={(e) => setSelectedWeddingBackground(e.target.value)}
              >
                {weddingBackgroundThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            )}
            <select
              className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
            >
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                <option key={n} value={n}>{n} pages</option>
              ))}
            </select>
          </div>
        </div>

        <div className="album-pages-grid p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-1 print:p-0 print:gap-0">
          {albumPages.map((page, idx, allPages) => {
            const state = pageImages[page.index] ?? {};
            const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
            const textState: EditablePageState | undefined =
              page.type === 'cover'
                ? (coverFromState ?? { headline: 'Cover', subheadline: '', description: '' })
                : page.type === 'last'
                ? (lastFromState ?? { headline: 'The End', subheadline: '', description: '' })
                : undefined;
            const isCover = page.type === 'cover';
            const isLast = page.type === 'last';
            return (
              <div
                key={page.index}
                className="album-page-card group rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200 print:shadow-none print:border-0"
              >
                <div className="album-card-no-print flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${
                      isCover
                        ? 'bg-cyan-100 text-cyan-800'
                        : isLast
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCover ? 'Cover' : isLast ? 'Last' : `P${page.index + 1}`}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">#{page.index + 1}</span>
                </div>
                <select
                  className="album-card-no-print mb-2 w-full rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-1.5 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={layoutLabel}
                  onChange={(e) =>
                    setPageLayouts((prev) => {
                      const value = e.target.value;
                      setPageImages((prevImages) => ({
                        ...prevImages,
                        [page.index]: {
                          ...(prevImages[page.index] ?? {}),
                          layout: value,
                        },
                      }));
                      return { ...prev, [page.index]: value };
                    })
                  }
                >
                  {PAGE_LAYOUT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>


                <div 
                  className={`album-page-preview relative w-full aspect-[16/9] rounded-lg flex items-center justify-center overflow-hidden ${
                    layoutLabel === 'Full Bleed'
                      ? 'border border-slate-200/60'
                      : layoutLabel === 'Polaroid'
                      ? 'border border-slate-200/80 bg-slate-50'
                      : 'border border-dashed border-slate-200'
                  }`}
                  style={{
                    backgroundColor:
                      categorySlug === 'anniversary'
                        ? selectedTheme.base
                        : categorySlug === 'wedding'
                        ? selectedWeddingTheme.base
                        : '#fafafa',
                  }}
                >
                  {/* Wedding theme – gradient + attractive decorative graphics */}
                  {categorySlug === 'wedding' && (
                    <>
                      <div
                        className="album-decor-no-print absolute inset-0 z-0 rounded-xl"
                        style={{ background: selectedWeddingTheme.gradient }}
                      />
                      <div className="album-decor-no-print absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none">
                        {/* Soft rose gold / gold accents */}
                        <svg className="absolute w-16 h-16" style={{ top: '6%', left: '8%', transform: 'rotate(-18deg)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }} viewBox="0 0 48 48" fill="none" stroke="rgba(180,130,120,0.35)" strokeWidth="1.4">
                          <path d="M24 38C24 38 8 28 8 18c0-6 6-10 16-10s16 4 16 10c0 10-16 20-16 20z" />
                        </svg>
                        <svg className="absolute w-14 h-14" style={{ bottom: '12%', right: '7%', transform: 'rotate(22deg)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }} viewBox="0 0 40 24" fill="none" stroke="rgba(180,130,120,0.32)" strokeWidth="1.3">
                          <ellipse cx="14" cy="12" rx="10" ry="10" />
                          <ellipse cx="26" cy="12" rx="10" ry="10" />
                        </svg>
                        <svg className="absolute w-20 h-20" style={{ top: '14%', right: '6%', transform: 'rotate(15deg)' }} viewBox="0 0 40 40" fill="none" stroke="rgba(200,165,110,0.28)" strokeWidth="1.1">
                          <circle cx="20" cy="20" r="6" />
                          <path d="M20 8v6m0 12v-6M8 20h6m12 0h-6m-4.2-9.8l2.8 2.8m9.8 9.8l-2.8-2.8m0-9.8l2.8-2.8m-9.8 9.8l-2.8 2.8" />
                          <path d="M14 14l4 4m0-8l4 4m-8 0l4-4m8 8l-4-4" />
                        </svg>
                        <svg className="absolute w-24 h-10" style={{ top: '38%', left: '4%', transform: 'rotate(-6deg)' }} viewBox="0 0 96 32" fill="none" stroke="rgba(180,130,120,0.25)" strokeWidth="1.2">
                          <path d="M4 16 Q24 4 48 16 T92 16" />
                        </svg>
                        <svg className="absolute w-20 h-8" style={{ bottom: '32%', right: '5%', transform: 'rotate(8deg)' }} viewBox="0 0 80 24" fill="none" stroke="rgba(200,165,110,0.28)" strokeWidth="1.2">
                          <path d="M4 12 Q20 4 40 12 Q60 20 76 12" />
                        </svg>
                        <svg className="absolute w-12 h-12" style={{ bottom: '28%', left: '12%', transform: 'rotate(-20deg)' }} viewBox="0 0 24 24" fill="none" stroke="rgba(180,130,120,0.3)" strokeWidth="1.2">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <svg className="absolute w-10 h-10" style={{ top: '32%', right: '22%', transform: 'rotate(12deg)' }} viewBox="0 0 24 24" fill="none" stroke="rgba(200,165,110,0.35)" strokeWidth="1">
                          <path d="M12 2L14.5 8.5L21 9l-5 4.5 1.5 7L12 17l-5.5 3.5L8 13.5 3 9l6.5-.5L12 2z" />
                        </svg>
                        <svg className="absolute w-14 h-14" style={{ bottom: '8%', left: '22%', transform: 'rotate(-10deg)' }} viewBox="0 0 40 24" fill="none" stroke="rgba(180,130,120,0.28)" strokeWidth="1.2">
                          <ellipse cx="14" cy="12" rx="10" ry="10" />
                          <ellipse cx="26" cy="12" rx="10" ry="10" />
                        </svg>
                      </div>
                    </>
                  )}
                  {/* Romantic couple-themed background with hearts for Anniversary theme - ALL pages */}
                  {categorySlug === 'anniversary' && (
                    <>
                      {/* Gradient background - uses selected color theme */}
                      <div 
                        className="album-decor-no-print anniversary-romantic-bg absolute inset-0 z-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, 
                            ${selectedTheme.colors[0]} 0%, 
                            ${selectedTheme.colors[1]} 25%, 
                            ${selectedTheme.colors[2]} 50%, 
                            ${selectedTheme.colors[3]} 75%, 
                            ${selectedTheme.colors[4]} 100%
                          ),
                          radial-gradient(circle at 20% 30%, ${selectedTheme.accent[0]} 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, ${selectedTheme.accent[1]} 0%, transparent 50%)`,
                        }}
                      />
                      
                      {/* Decorative hearts pattern - uses selected theme colors */}
                      <div className="album-decor-no-print absolute inset-0 z-0 rounded-xl overflow-hidden">
                        <div 
                          className={`absolute ${selectedTheme.heartColors[0]} opacity-20`}
                          style={{ top: '8%', left: '10%', transform: 'rotate(-15deg)' }}
                        >
                          <FaHeart size={24} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[1]} opacity-25`}
                          style={{ top: '15%', right: '12%', transform: 'rotate(20deg)' }}
                        >
                          <FaHeart size={20} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[2]} opacity-20`}
                          style={{ top: '25%', left: '5%', transform: 'rotate(-10deg)' }}
                        >
                          <FaHeart size={18} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[3]} opacity-22`}
                          style={{ bottom: '20%', right: '8%', transform: 'rotate(15deg)' }}
                        >
                          <FaHeart size={22} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[0]} opacity-18`}
                          style={{ bottom: '12%', left: '15%', transform: 'rotate(-25deg)' }}
                        >
                          <FaHeart size={19} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[1]} opacity-20`}
                          style={{ bottom: '30%', right: '20%', transform: 'rotate(10deg)' }}
                        >
                          <FaHeart size={16} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[2]} opacity-15`}
                          style={{ top: '45%', left: '3%', transform: 'rotate(-18deg)' }}
                        >
                          <FaHeart size={21} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[3]} opacity-20`}
                          style={{ top: '55%', right: '5%', transform: 'rotate(22deg)' }}
                        >
                          <FaHeart size={17} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[0]} opacity-18`}
                          style={{ top: '70%', left: '12%', transform: 'rotate(-12deg)' }}
                        >
                          <FaHeart size={19} />
                        </div>
                        <div 
                          className={`absolute ${selectedTheme.heartColors[1]} opacity-22`}
                          style={{ bottom: '45%', right: '15%', transform: 'rotate(18deg)' }}
                        >
                          <FaHeart size={20} />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {(() => {
                    const isMultiLayout = MULTI_IMAGE_LAYOUTS.includes(layoutLabel);
                    const hasImage = isMultiLayout
                      ? (state.imageDataUrls?.length ?? 0) > 0 || !!state.imageDataUrl
                      : !!state.imageDataUrl;

                    if (!hasImage) {
                      return (
                        <span className="album-placeholder relative z-10 text-[10px] text-slate-400 text-center px-3">
                          {isMultiLayout ? 'Add multiple photos' : 'Add photo'}
                        </span>
                      );
                    }

                    const urls = state.imageDataUrls ?? (state.imageDataUrl ? [state.imageDataUrl] : []);
                    const getSrc = (i: number) => urls[i] ?? urls[0] ?? state.imageDataUrl ?? '';
                    const commonImgProps = (index: number) => ({
                      src: getSrc(index),
                      alt: `Page ${page.index + 1} image ${index + 1}`,
                      style: {
                        transform: `scale(${textState?.style?.imageScale ?? 1})`,
                        transformOrigin: 'center center',
                      },
                    });

                    let inner: React.ReactNode;
                    switch (layoutLabel) {
                      case 'Two Up':
                        inner = (
                          <div className="relative z-10 w-full h-full grid grid-cols-2 gap-1 p-1">
                            <PhotoWithFloralFrame
                              src={commonImgProps(0).src}
                              alt={commonImgProps(0).alt}
                              frameStyle={state.frameStyle ?? 'none'}
                              imgClassName="w-full h-full object-cover rounded-md shadow-md"
                              imgStyle={commonImgProps(0).style}
                            />
                            <PhotoWithFloralFrame
                              src={commonImgProps(1).src}
                              alt={commonImgProps(1).alt}
                              frameStyle={state.frameStyle ?? 'none'}
                              imgClassName="w-full h-full object-cover rounded-md shadow-md"
                              imgStyle={commonImgProps(1).style}
                            />
                          </div>
                        );
                        break;
                      case 'Three Grid':
                        inner = (
                          <div className="relative z-10 w-full h-full grid grid-cols-3 gap-1 p-1">
                            {[0, 1, 2].map((i) => {
                              const props = commonImgProps(i);
                              return (
                                <PhotoWithFloralFrame
                                  key={i}
                                  src={props.src}
                                  alt={props.alt}
                                  frameStyle={state.frameStyle ?? 'none'}
                                  imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                  imgStyle={props.style}
                                />
                              );
                            })}
                          </div>
                        );
                        break;
                      case 'Four Grid':
                        inner = (
                          <div className="relative z-10 w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-1">
                            {[0, 1, 2, 3].map((i) => {
                              const props = commonImgProps(i);
                              return (
                                <PhotoWithFloralFrame
                                  key={i}
                                  src={props.src}
                                  alt={props.alt}
                                  frameStyle={state.frameStyle ?? 'none'}
                                  imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                  imgStyle={props.style}
                                />
                              );
                            })}
                          </div>
                        );
                        break;
                      case 'Hero + Two':
                        inner = (
                          <div className="relative z-10 w-full h-full grid grid-rows-[2fr,1fr] gap-1 p-1">
                            <PhotoWithFloralFrame
                              src={commonImgProps(0).src}
                              alt={commonImgProps(0).alt}
                              frameStyle={state.frameStyle ?? 'none'}
                              imgClassName="w-full h-full object-cover rounded-md shadow-md row-span-1"
                              imgStyle={commonImgProps(0).style}
                            />
                            <div className="grid grid-cols-2 gap-1">
                              <PhotoWithFloralFrame
                                src={commonImgProps(1).src}
                                alt={commonImgProps(1).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                imgStyle={commonImgProps(1).style}
                              />
                              <PhotoWithFloralFrame
                                src={commonImgProps(2).src}
                                alt={commonImgProps(2).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                imgStyle={commonImgProps(2).style}
                              />
                            </div>
                          </div>
                        );
                        break;
                      case 'Image + Text':
                        inner = (
                          <div className="relative z-10 w-full h-full grid grid-cols-[3fr,2fr] gap-1 p-2">
                            <PhotoWithFloralFrame
                              src={commonImgProps(0).src}
                              alt={commonImgProps(0).alt}
                              frameStyle={state.frameStyle ?? 'none'}
                              imgClassName="w-full h-full object-cover rounded-md shadow-md"
                              imgStyle={commonImgProps(0).style}
                            />
                            <div className="h-full rounded-md bg-white/70 border border-dashed border-gray-300 flex items-center justify-center px-2 text-[10px] text-gray-500">
                              Add a short story, captions or dates for this page.
                            </div>
                          </div>
                        );
                        break;
                      case 'Collage':
                        inner = (
                          <div className="relative z-10 w-full h-full bg-slate-100/60">
                            <div className="absolute inset-1">
                              <PhotoWithFloralFrame
                                src={commonImgProps(0).src}
                                alt={commonImgProps(0).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                className="absolute top-1 left-2 w-1/2 h-2/3"
                                imgClassName="w-full h-full object-cover rounded-md shadow-md rotate-[-3deg]"
                                imgStyle={commonImgProps(0).style}
                              />
                              <PhotoWithFloralFrame
                                src={commonImgProps(1).src}
                                alt={commonImgProps(1).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                className="absolute bottom-1 right-2 w-1/2 h-2/3"
                                imgClassName="w-full h-full object-cover rounded-md shadow-md rotate-[4deg]"
                                imgStyle={commonImgProps(1).style}
                              />
                              <PhotoWithFloralFrame
                                src={commonImgProps(2).src}
                                alt={commonImgProps(2).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                className="absolute inset-0 m-auto w-2/3 h-2/3"
                                imgClassName="w-full h-full object-cover rounded-md shadow-lg"
                                imgStyle={commonImgProps(2).style}
                              />
                            </div>
                          </div>
                        );
                        break;
                      case 'Cinematic Spread':
                        inner = (
                          <div className="relative z-10 w-full h-full bg-black flex items-center justify-center">
                            <div className="w-[92%] h-[70%] bg-black rounded-md overflow-hidden shadow-2xl border border-slate-700">
                              <PhotoWithFloralFrame
                                src={commonImgProps(0).src}
                                alt={commonImgProps(0).alt}
                                frameStyle={state.frameStyle ?? 'none'}
                                imgClassName="w-full h-full object-cover"
                                imgStyle={{
                                  ...commonImgProps(0).style,
                                  objectPosition: 'center',
                                }}
                              />
                            </div>
                          </div>
                        );
                        break;
                      case 'Polaroid':
                        inner = (
                          <div className="relative z-10 w-full h-full flex items-center justify-center">
                            <div className="w-[82%] h-[80%] bg-white rounded-lg shadow-lg flex flex-col pt-3 pb-4 px-3">
                              <div className="flex-1 rounded-md overflow-hidden mb-2">
                                <PhotoWithFloralFrame
                                  src={commonImgProps(0).src}
                                  alt={commonImgProps(0).alt}
                                  frameStyle={state.frameStyle ?? 'none'}
                                  imgClassName="w-full h-full object-cover"
                                  imgStyle={commonImgProps(0).style}
                                />
                              </div>
                              <div className="h-5 text-[9px] text-gray-500 text-center italic">
                                Your note here
                              </div>
                            </div>
                          </div>
                        );
                        break;
                      default:
                        inner = (
                          <PhotoWithFloralFrame
                            src={commonImgProps(0).src}
                            alt={commonImgProps(0).alt}
                            frameStyle={state.frameStyle ?? 'none'}
                            className="relative z-10 w-full h-full"
                            imgClassName="w-full h-full object-cover rounded-lg shadow-lg"
                            imgStyle={commonImgProps(0).style}
                          />
                        );
                    }
                    return (
                      <ImageFrameWrapper frameStyle={state.frameStyle} className="relative z-10 w-full h-full">
                        {inner}
                      </ImageFrameWrapper>
                    );
                  })()}

                  {/* Cover / last page text overlay - hidden in print (only images) */}
                  {textState && (textState.headline || textState.subheadline) && (
                    <div
                      className={`album-card-no-print absolute inset-0 z-20 flex px-4 py-4 bg-gradient-to-t from-black/70 via-black/10 to-transparent ${
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
                <div className="mt-2 print:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setPageImagePickerFor({
                        pageIndex: page.index,
                        layout: layoutLabel,
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {MULTI_IMAGE_LAYOUTS.includes(layoutLabel) ? `Add ${MULTI_IMAGE_SLOT_COUNT[layoutLabel] ?? 2} photos` : 'Add photo'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export / print (hidden in print) */}
      <div className="no-print flex flex-wrap justify-between items-center gap-3 print:hidden">
        <p className="text-xs text-slate-500">Select photos per page, then preview or export to PDF.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenFlipBook}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            Preview book
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Inline 3D flip-book preview */}
      {showFlipBook && (
        <div className="no-print mt-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-50 shadow-[0_4px_24px_rgba(15,23,42,0.08)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Preview</h3>
            <button
              type="button"
              onClick={() => setShowFlipBook(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-1">
            {/* @ts-ignore - react-pageflip types mark many props as required but we rely on their defaults */}
            <HTMLFlipBook
              width={260}
              height={340}
              size="stretch"
              minWidth={220}
              maxWidth={600}
              minHeight={300}
              maxHeight={700}
              maxShadowOpacity={0.5}
              showCover={true}
              mobileScrollSupport={true}
              className="shadow-2xl rounded-2xl overflow-hidden bg-transparent max-w-sm mx-auto"
            >
              {albumPages.map((page) => {
                const state = pageImages[page.index];
                const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
                const isPolaroid = layoutLabel === 'Polaroid';
                const isFullBleed = layoutLabel === 'Full Bleed';

                const title =
                  page.type === 'cover'
                    ? 'Cover'
                    : page.type === 'last'
                    ? 'Last Page'
                    : `Page ${page.index + 1}`;

                const urls = state?.imageDataUrls ?? (state?.imageDataUrl ? [state.imageDataUrl] : []);
                const getSrc = (i: number) => urls[i] ?? urls[0] ?? state?.imageDataUrl ?? '';
                const hasAnyImage = !!getSrc(0);
                const commonImgProps = (index: number) => ({
                  src: getSrc(index),
                  alt: `${title} image ${index + 1}`,
                });

                return (
                  <div
                    key={page.index}
                    className="w-full h-full bg-transparent flex flex-col"
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-xl">
                      {/* Page gradient background */}
                      <div
                        className={`absolute inset-0 ${
                          isFullBleed
                            ? 'bg-black'
                            : categorySlug === 'wedding'
                            ? ''
                            : 'bg-gradient-to-br from-slate-100 via-white to-slate-200'
                        }`}
                        style={
                          categorySlug === 'wedding' && !isFullBleed
                            ? { background: selectedWeddingTheme.gradient }
                            : undefined
                        }
                      />

                      {/* Wedding theme – attractive decorative graphics in flipbook */}
                      {categorySlug === 'wedding' && !isFullBleed && (
                        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                          <svg className="absolute w-10 h-10" style={{ top: '7%', left: '8%', transform: 'rotate(-15deg)' }} viewBox="0 0 48 48" fill="none" stroke="rgba(180,130,120,0.35)" strokeWidth="1.2">
                            <path d="M24 38C24 38 8 28 8 18c0-6 6-10 16-10s16 4 16 10c0 10-16 20-16 20z" />
                          </svg>
                          <svg className="absolute w-9 h-9" style={{ bottom: '14%', right: '6%', transform: 'rotate(20deg)' }} viewBox="0 0 40 24" fill="none" stroke="rgba(180,130,120,0.32)" strokeWidth="1.2">
                            <ellipse cx="14" cy="12" rx="10" ry="10" />
                            <ellipse cx="26" cy="12" rx="10" ry="10" />
                          </svg>
                          <svg className="absolute w-12 h-12" style={{ top: '12%', right: '6%', transform: 'rotate(14deg)' }} viewBox="0 0 40 40" fill="none" stroke="rgba(200,165,110,0.3)" strokeWidth="1">
                            <circle cx="20" cy="20" r="6" />
                            <path d="M20 8v6m0 12v-6M8 20h6m12 0h-6m-4.2-9.8l2.8 2.8m9.8 9.8l-2.8-2.8m0-9.8l2.8-2.8m-9.8 9.8l-2.8 2.8" />
                          </svg>
                          <svg className="absolute w-14 h-5" style={{ bottom: '28%', left: '5%', transform: 'rotate(-8deg)' }} viewBox="0 0 56 20" fill="none" stroke="rgba(180,130,120,0.28)" strokeWidth="1">
                            <path d="M4 10 Q16 4 28 10 T52 10" />
                          </svg>
                          <svg className="absolute w-7 h-7" style={{ bottom: '22%', left: '14%', transform: 'rotate(-18deg)' }} viewBox="0 0 24 24" fill="none" stroke="rgba(180,130,120,0.32)" strokeWidth="1.1">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>
                      )}

                      {/* Page image(s) based on selected layout */}
                      {hasAnyImage ? (
                        (() => {
                          const frameStyle = state?.frameStyle ?? 'none';
                          let flipInner: React.ReactNode;
                          switch (layoutLabel) {
                            case 'Two Up':
                              flipInner = (
                                <div className="absolute inset-0 z-10 grid grid-cols-2 gap-1">
                                  <PhotoWithFloralFrame
                                    src={commonImgProps(0).src}
                                    alt={commonImgProps(0).alt}
                                    frameStyle={frameStyle as FloralFrameStyle}
                                    imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                  />
                                  <PhotoWithFloralFrame
                                    src={commonImgProps(1).src}
                                    alt={commonImgProps(1).alt}
                                    frameStyle={frameStyle as FloralFrameStyle}
                                    imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                  />
                                </div>
                              );
                              break;
                            case 'Three Grid':
                              flipInner = (
                                <div className="absolute inset-0 z-10 grid grid-cols-3 gap-1">
                                  {[0, 1, 2].map((i) => {
                                    const props = commonImgProps(i);
                                    return (
                                      <PhotoWithFloralFrame
                                        key={i}
                                        src={props.src}
                                        alt={props.alt}
                                        frameStyle={frameStyle as FloralFrameStyle}
                                        imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                      />
                                    );
                                  })}
                                </div>
                              );
                              break;
                            case 'Four Grid':
                              flipInner = (
                                <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-2 gap-1">
                                  {[0, 1, 2, 3].map((i) => {
                                    const props = commonImgProps(i);
                                    return (
                                      <PhotoWithFloralFrame
                                        key={i}
                                        src={props.src}
                                        alt={props.alt}
                                        frameStyle={frameStyle as FloralFrameStyle}
                                        imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                      />
                                    );
                                  })}
                                </div>
                              );
                              break;
                            case 'Hero + Two':
                              flipInner = (
                                <div className="absolute inset-0 z-10 grid grid-rows-[2fr,1fr] gap-1">
                                  <PhotoWithFloralFrame
                                    src={commonImgProps(0).src}
                                    alt={commonImgProps(0).alt}
                                    frameStyle={frameStyle as FloralFrameStyle}
                                    imgClassName="w-full h-full object-cover rounded-md shadow-md row-span-1"
                                  />
                                  <div className="grid grid-cols-2 gap-1">
                                    <PhotoWithFloralFrame
                                      src={commonImgProps(1).src}
                                      alt={commonImgProps(1).alt}
                                      frameStyle={frameStyle as FloralFrameStyle}
                                      imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                    />
                                    <PhotoWithFloralFrame
                                      src={commonImgProps(2).src}
                                      alt={commonImgProps(2).alt}
                                      frameStyle={frameStyle as FloralFrameStyle}
                                      imgClassName="w-full h-full object-cover rounded-md shadow-md"
                                    />
                                  </div>
                                </div>
                              );
                              break;
                            case 'Collage':
                              flipInner = (
                                <div className="absolute inset-0 z-10 bg-transparent">
                                  <div className="absolute inset-0 p-2 box-border">
                                    <PhotoWithFloralFrame
                                      src={commonImgProps(0).src}
                                      alt={commonImgProps(0).alt}
                                      frameStyle={frameStyle as FloralFrameStyle}
                                      className="absolute top-2 left-2 w-1/2 h-2/3"
                                      imgClassName="w-full h-full object-cover rounded-md shadow-md rotate-[-3deg]"
                                    />
                                    <PhotoWithFloralFrame
                                      src={commonImgProps(1).src}
                                      alt={commonImgProps(1).alt}
                                      frameStyle={frameStyle as FloralFrameStyle}
                                      className="absolute bottom-2 right-2 w-1/2 h-2/3"
                                      imgClassName="w-full h-full object-cover rounded-md shadow-md rotate-[4deg]"
                                    />
                                    <PhotoWithFloralFrame
                                      src={commonImgProps(2).src}
                                      alt={commonImgProps(2).alt}
                                      frameStyle={frameStyle as FloralFrameStyle}
                                      className="absolute inset-0 m-auto w-2/3 h-2/3"
                                      imgClassName="w-full h-full object-cover rounded-md shadow-lg"
                                    />
                                  </div>
                                </div>
                              );
                              break;
                            default:
                              flipInner = (
                                <PhotoWithFloralFrame
                                  src={commonImgProps(0).src}
                                  alt={commonImgProps(0).alt}
                                  frameStyle={frameStyle as FloralFrameStyle}
                                  className="absolute inset-0"
                                  imgClassName={`${
                                    isPolaroid
                                      ? 'w-[88%] h-[78%] object-cover rounded-md shadow-md top-5 left-1/2 -translate-x-1/2'
                                      : 'w-full h-full object-cover'
                                  }`}
                                />
                              );
                          }
                          return (
                            <ImageFrameWrapper frameStyle={frameStyle} className="absolute inset-0 z-10 p-2 box-border">
                              {flipInner}
                            </ImageFrameWrapper>
                          );
                        })()
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-slate-500">
                          No image selected for this page.
                        </div>
                      )}

                      {/* Overlay for title and page number */}
                      <div className="absolute inset-x-0 top-0 px-3 py-2 flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-50 bg-black/40 rounded-full px-2 py-0.5">
                          {title}
                        </span>
                        <span className="text-slate-200 bg-black/30 rounded-full px-2 py-0.5">
                          #{page.index + 1}
                        </span>
                      </div>

                      {/* Corner drag hint / animation */}
                      <div className="pointer-events-none absolute bottom-0 right-0 w-10 h-10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/25 to-transparent rounded-tl-xl animate-pulse" />
                        <div className="absolute bottom-1 right-1 text-[9px] text-slate-100 opacity-80">
                          drag
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </HTMLFlipBook>
          </div>
        </div>
      )}

      {pageImagePickerFor &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setPageImagePickerFor(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h3 className="text-sm font-bold text-slate-800">
                  Page {pageImagePickerFor.pageIndex + 1} — Add photo(s)
                </h3>
                <button
                  type="button"
                  onClick={() => setPageImagePickerFor(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <FileVaultImagePicker
                  onPick={async (picked) => {
                    const targetIndex = pageImagePickerFor.pageIndex;
                    const isMulti = MULTI_IMAGE_LAYOUTS.includes(pageImagePickerFor.layout);
                    setPageImages((prev) => {
                      const current = prev[targetIndex] ?? {};
                      if (isMulti) {
                        const existing =
                          current.imageDataUrls ??
                          (current.imageDataUrl ? [current.imageDataUrl] : []);
                        const nextArr = [...existing, picked.dataUrl];
                        return {
                          ...prev,
                          [targetIndex]: {
                            ...current,
                            imageDataUrl: nextArr[0],
                            imageDataUrls: nextArr,
                          },
                        };
                      }
                      return {
                        ...prev,
                        [targetIndex]: {
                          ...current,
                          imageDataUrl: picked.dataUrl,
                          imageDataUrls: undefined,
                        },
                      };
                    });
                    setPageImagePickerFor(null);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PhotoThemeAlbumBuilderPage;

