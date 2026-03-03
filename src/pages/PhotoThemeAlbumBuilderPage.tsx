import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { jsPDF } from 'jspdf';
import { FaSave, FaCheck, FaSpinner, FaArrowLeft, FaEdit, FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import { getPhotoBookTemplate } from '../templates/photobookTemplates';
import { FileVaultImagePicker } from '../components/PhotoBook/FileVaultImagePicker';
import type { EditablePageState } from './PhotoThemeCategoryPage';
import api from '../services/api';
import imageService from '../services/imageService';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../utils/authUtils';

const API_BASE = process.env.REACT_APP_API_URL || '';

/** Build a reliable preview URL from an image ID */
function buildPreviewUrl(imageId: number): string {
  const token = getStoredToken();
  return `${API_BASE}/api/images/${imageId}/preview${token ? `?token=${token}` : ''}`;
}

/** Turn relative backend URLs into absolute ones the browser can render */
function resolveImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  // Extract image ID from URL and build a fresh preview URL with current token
  const idMatch = url.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/);
  if (idMatch) return buildPreviewUrl(Number(idMatch[1]));
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const token = getStoredToken();
  const sep = url.includes('?') ? '&' : '?';
  return `${API_BASE}${url}${token ? `${sep}token=${token}` : ''}`;
}

type AlbumPage = {
  index: number;
  type: 'cover' | 'inner' | 'last';
  layoutName: string;
};

type CropPos = { x: number; y: number };

type PageImageState = {
  imageDataUrl?: string;
  imageDataUrls?: string[];
  /** Existing image IDs from FileVault (no re-upload needed) */
  imageIds?: number[];
  layout?: string;
  frameStyle?: FloralFrameStyle;
  cropPositions?: Record<number, CropPos>;
  slotCaptions?: Record<number, string>;
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

/* PhotoWithFloralFrame and ImageFrameWrapper removed — replaced by DraggableCropImage */

/** Flip-book page wrapper — react-pageflip requires forwardRef on every child. */
const FlipBookPage = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  (props, ref) => (
    <div ref={ref} className="w-full h-full">
      {props.children}
    </div>
  )
);
FlipBookPage.displayName = 'FlipBookPage';

/** Draggable image with object-fit:cover that lets the user reposition the crop focal point. */
function DraggableCropImage({
  src,
  alt,
  cropPos,
  onCropChange,
  className = '',
}: {
  src: string;
  alt?: string;
  cropPos?: CropPos;
  onCropChange?: (pos: CropPos) => void;
  className?: string;
}) {
  const pos = cropPos ?? { x: 50, y: 50 };
  const imgRef = React.useRef<HTMLImageElement>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; startPos: CropPos } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [livePos, setLivePos] = React.useState(pos);
  React.useEffect(() => { setLivePos(cropPos ?? { x: 50, y: 50 }); }, [cropPos]);

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (!onCropChange) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...livePos } };
    setDragging(true);
  }, [onCropChange, livePos]);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !imgRef.current) return;
    const rect = imgRef.current.parentElement!.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * -100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * -100;
    const nx = Math.max(0, Math.min(100, dragRef.current.startPos.x + dx));
    const ny = Math.max(0, Math.min(100, dragRef.current.startPos.y + dy));
    setLivePos({ x: nx, y: ny });
  }, []);

  const onPointerUp = React.useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    onCropChange?.(livePos);
  }, [onCropChange, livePos]);

  return (
    <div className={`relative overflow-hidden group/crop ${className}`} style={{ minWidth: 0, minHeight: 0 }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ''}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover select-none"
        style={{
          objectPosition: `${livePos.x}% ${livePos.y}%`,
          cursor: onCropChange ? (dragging ? 'grabbing' : 'grab') : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {onCropChange && !dragging && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1 opacity-0 group-hover/crop:opacity-100 transition-opacity pointer-events-none z-10">
          <span className="text-[9px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">
            Drag to reposition
          </span>
        </div>
      )}
    </div>
  );
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
    const pick = (p: EditablePageState) => ({
      headline: p.headline,
      subheadline: p.subheadline,
      description: p.description,
      imageDataUrl: p.imageDataUrl,
      imageId: p.imageId,
      style: p.style,
    });
    sessionStorage.setItem(
      `${COVER_LAST_STORAGE_KEY}_${categorySlug}`,
      JSON.stringify({ coverPage: pick(coverPage), lastPage: pick(lastPage) }),
    );
  } catch (_) {}
}

type ApiSlotImage = { imageId: number; imageUrl: string; slotIndex: number };
type ApiAlbumPageResponse = {
  id?: number;
  userId?: number;
  templateId?: number;
  pageNumber: number;
  pageType?: string;
  imageId?: number | null;
  imageUrl?: string | null;
  slotImages?: ApiSlotImage[];
  layout?: string;
  background?: string;
  frameStyle?: string;
  colorTheme?: string;
  caption?: string;
  cropPositions?: string | null;
  slotCaptions?: string | null;
};

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

const PhotoThemeAlbumBuilderPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      coverPage?: EditablePageState; lastPage?: EditablePageState;
      dbTemplateId?: number; photobookId?: number;
      fromStudioAlbum?: boolean; albumImageIds?: number[]; albumName?: string;
    };
  };

  const STUDIO_ALBUM_KEY = `studioAlbum_${categorySlug}`;

  // Persist studio album image IDs so they survive navigation to cover page and back
  const studioAlbumImageIds: number[] | null = React.useMemo(() => {
    if (location.state?.albumImageIds) {
      sessionStorage.setItem(STUDIO_ALBUM_KEY, JSON.stringify({
        imageIds: location.state.albumImageIds,
        albumName: location.state.albumName,
      }));
      return location.state.albumImageIds;
    }
    try {
      const raw = sessionStorage.getItem(STUDIO_ALBUM_KEY);
      if (raw) return JSON.parse(raw)?.imageIds ?? null;
    } catch { /* ignore */ }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.albumImageIds, STUDIO_ALBUM_KEY]);

  const studioAlbumName: string | undefined = React.useMemo(() => {
    if (location.state?.albumName) return location.state.albumName;
    try {
      const raw = sessionStorage.getItem(STUDIO_ALBUM_KEY);
      if (raw) return JSON.parse(raw)?.albumName;
    } catch { /* ignore */ }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.albumName, STUDIO_ALBUM_KEY]);

  const PHOTOBOOK_KEY = `photobook_${categorySlug}`;

  const getStoredPhotobook = (): { templateId?: number; photobookId?: number } | null => {
    try {
      const raw = localStorage.getItem(PHOTOBOOK_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  };

  const getInitialTemplateId = (): number | null => {
    if (location.state?.dbTemplateId) return location.state.dbTemplateId;
    return getStoredPhotobook()?.templateId ?? null;
  };

  const getInitialPhotobookId = (): number | null => {
    if (location.state?.photobookId) return location.state.photobookId;
    return getStoredPhotobook()?.photobookId ?? null;
  };

  const [dbTemplateId, setDbTemplateId] = React.useState<number | null>(getInitialTemplateId);
  const [photobookId, setPhotobookId] = React.useState<number | null>(getInitialPhotobookId);

  // Persist to localStorage whenever photobookId or dbTemplateId change
  React.useEffect(() => {
    if (photobookId && dbTemplateId) {
      try {
        localStorage.setItem(PHOTOBOOK_KEY, JSON.stringify({
          templateId: dbTemplateId,
          photobookId: photobookId,
        }));
      } catch { /* ignore */ }
    }
  }, [photobookId, dbTemplateId, PHOTOBOOK_KEY]);

  // Recover photobookId + templateId from API if missing
  React.useEffect(() => {
    if ((dbTemplateId && photobookId) || !user?.id || !categorySlug) return;
    const recover = async () => {
      try {
        const token = getStoredToken();
        const res = await api.get(`/api/photobooks/by-category/${categorySlug}`, {
          headers: { ...(token ? { 'X-API-KEY': token } : {}) },
        });
        const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        const latest = list[0];
        if (latest?.templateId) {
          if (!dbTemplateId) setDbTemplateId(latest.templateId);
          if (!photobookId) setPhotobookId(latest.id);
        }
      } catch {
        console.warn('No saved photobook found for category:', categorySlug);
      }
    };
    recover();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, categorySlug]);

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
  const [currentStep, setCurrentStep] = React.useState(0);
  const prevPhotobookIdRef = React.useRef(photobookId);
  React.useEffect(() => {
    if (prevPhotobookIdRef.current !== photobookId) {
      prevPhotobookIdRef.current = photobookId;
      setPageImages({});
      setPageLayouts({});
      setCurrentStep(0);
    }
  }, [photobookId]);
  const [showFlipBook, setShowFlipBook] = React.useState(false);
  const [showSinglePageView, setShowSinglePageView] = React.useState(false);
  const [singlePageIndex, setSinglePageIndex] = React.useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [pdfProgress, setPdfProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [slideshowActive, setSlideshowActive] = React.useState(false);
  const [slideshowSpeed, setSlideshowSpeed] = React.useState(4000);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [flipBookPage, setFlipBookPage] = React.useState(0);
  const flipBookRef = React.useRef<any>(null);
  type BookOrientation = 'landscape' | 'portrait';
  const [bookOrientation, setBookOrientation] = React.useState<BookOrientation>(
    () => (typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
  );
  const [pageImagePickerFor, setPageImagePickerFor] = React.useState<{
    pageIndex: number;
    layout: string;
    slotIndex?: number; // if set, replace this specific slot; otherwise fill next empty
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

  /* ── Save / Load album state ──────────────────────────────── */
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const uploadImageFromDataUrl = async (dataUrl: string, name: string): Promise<number | null> => {
    try {
      const file = dataUrlToFile(dataUrl, name);
      const res = await imageService.uploadImage(file);
      if (res.cloudUploads?.s3?.id) return res.cloudUploads.s3.id;
      if (res.image?.id) return Number(res.image.id);
    } catch (err) {
      console.warn('Image upload failed:', name, err);
    }
    return null;
  };

  const handleSaveAlbum = async () => {
    if (!user?.id) {
      setSaveError('Please log in first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = getStoredToken();
      const headers = { ...(token ? { 'X-API-KEY': token } : {}) };

      // Resolve dbTemplateId if missing — look up from photobook or from templates API
      let resolvedTemplateId = dbTemplateId;
      if (!resolvedTemplateId && photobookId) {
        try {
          const pbRes = await api.get(`/api/photobooks/${photobookId}`, { headers });
          resolvedTemplateId = pbRes.data?.templateId ?? null;
          if (resolvedTemplateId) setDbTemplateId(resolvedTemplateId);
        } catch { /* ignore */ }
      }
      if (!resolvedTemplateId && categorySlug) {
        try {
          const tplRes = await api.get('/api/photobook-templates', { headers });
          const tpls: any[] = tplRes.data?.templates ?? [];
          const codePrefix = categorySlug.toUpperCase().replace(/-/g, '_');
          const match = tpls.find((t: any) =>
            t.code?.toUpperCase().startsWith(codePrefix) ||
            t.name?.toLowerCase().includes(categorySlug.toLowerCase())
          );
          if (match?.id) {
            resolvedTemplateId = match.id;
            setDbTemplateId(resolvedTemplateId);
          }
        } catch { /* ignore */ }
      }

      // Ensure we have a photobookId — auto-create one if missing
      let pbId = photobookId;
      if (!pbId) {
        if (!resolvedTemplateId) {
          setSaveError('Could not determine template. Please go back to cover page and try again.');
          setIsSaving(false);
          return;
        }
        const pbRes = await api.post('/api/photobooks', {
          templateId: Number(resolvedTemplateId),
          categorySlug: categorySlug,
          title: categorySlug,
        }, { headers });
        pbId = pbRes.data?.id;
        if (pbId) {
          setPhotobookId(pbId);
          if (pbRes.data?.templateId) setDbTemplateId(pbRes.data.templateId);
        }
      }
      if (!pbId) {
        setSaveError('Could not create photobook. Please try again.');
        setIsSaving(false);
        return;
      }

      const pagesPayload: Array<Record<string, unknown>> = [];

      for (const page of albumPages) {
        const state = pageImages[page.index];
        const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
        const urls = state?.imageDataUrls ?? (state?.imageDataUrl ? [state.imageDataUrl] : []);
        const knownIds = state?.imageIds ?? [];

        // Build imageIds preserving slot positions (0 = empty slot)
        const finalIds: number[] = [];
        for (let si = 0; si < urls.length; si++) {
          if (knownIds[si] && knownIds[si] > 0) {
            finalIds[si] = knownIds[si];
          } else {
            const url = urls[si];
            if (url?.startsWith('data:')) {
              const id = await uploadImageFromDataUrl(url, `page-${page.index + 1}-slot-${si}.jpg`);
              finalIds[si] = id || 0;
            } else if (url) {
              const match = url.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/);
              finalIds[si] = match ? Number(match[1]) : 0;
            } else {
              finalIds[si] = 0;
            }
          }
        }

        const validIds = finalIds.filter((id) => id > 0);

        const cropObj = state?.cropPositions;
        const cropJson = cropObj && Object.keys(cropObj).length > 0
          ? JSON.stringify(cropObj)
          : null;

        const captionsObj = state?.slotCaptions;
        const captionsJson = captionsObj && Object.keys(captionsObj).length > 0
          ? JSON.stringify(captionsObj)
          : null;

        pagesPayload.push({
          pageNumber: page.index + 1,
          pageType: page.type.toUpperCase(),
          imageId: validIds[0] ?? null,
          imageIds: finalIds.length > 0 ? finalIds : null,
          layout: layoutLabel,
          background: categorySlug === 'wedding' ? selectedWeddingBackground
                    : categorySlug === 'anniversary' ? selectedColorTheme
                    : null,
          frameStyle: state?.frameStyle ?? null,
          colorTheme: categorySlug === 'anniversary' ? selectedColorTheme
                    : categorySlug === 'wedding' ? selectedWeddingBackground
                    : null,
          caption: null,
          cropPositions: cropJson,
          slotCaptions: captionsJson,
        });
      }

      const saveBody = {
        pages: pagesPayload,
        pageCount,
        colorTheme: selectedColorTheme,
        weddingBackground: selectedWeddingBackground,
      };

      // Try new photobook-scoped endpoint, fall back to old one
      try {
        await api.post(`/api/photobooks/${pbId}/pages`, saveBody, { headers });
      } catch {
        if (resolvedTemplateId) {
          await api.post(
            `/api/album-pages/bulk?userId=${user.id}&templateId=${resolvedTemplateId}`,
            saveBody, { headers },
          );
        } else {
          throw new Error('Failed to save album pages');
        }
      }

      try {
        await api.put(`/api/photobooks/${pbId}`, {
          currentStep: 'ALBUM',
          status: 'IN_PROGRESS',
          pageCount,
          colorTheme: selectedColorTheme,
          weddingBackground: selectedWeddingBackground,
        }, { headers });
      } catch { /* best-effort */ }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save album:', err);
      setSaveError(err.response?.data?.error || err.message || 'Failed to save album.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: apply loaded pages into state
  const applyLoadedPages = React.useCallback((saved: ApiAlbumPageResponse[], skipCoverLast = false) => {
    if (!saved?.length) return;
    const newPageImages: Record<number, PageImageState> = {};
    const newPageLayouts: Record<number, string> = {};

    for (const sp of saved) {
      const idx = sp.pageNumber - 1;
      if (idx < 0) continue;

      const pType = sp.pageType?.toUpperCase();
      if (sp.layout) newPageLayouts[idx] = sp.layout;

      // Skip cover/last page IMAGE data when covers come from route state (just saved)
      if (skipCoverLast && (pType === 'COVER' || pType === 'LAST')) continue;

      let urls: string[] = [];
      let ids: number[] = [];
      if (sp.slotImages?.length) {
        const sorted = [...sp.slotImages].sort((a, b) => a.slotIndex - b.slotIndex);
        ids = sorted.filter(s => s.imageId).map(s => s.imageId);
        urls = ids.length > 0
          ? ids.map(id => buildPreviewUrl(id))
          : sorted.filter(s => s.imageUrl).map(s => resolveImageUrl(s.imageUrl)).filter(Boolean) as string[];
      } else if (sp.imageId) {
        ids.push(sp.imageId);
        urls.push(buildPreviewUrl(sp.imageId));
      } else if (sp.imageUrl) {
        const resolved = resolveImageUrl(sp.imageUrl);
        if (resolved) urls.push(resolved);
      }

      let parsedCrops: Record<number, CropPos> | undefined;
      try {
        const raw = (sp as any).cropPositions;
        if (raw) {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (obj && typeof obj === 'object') parsedCrops = obj;
        }
      } catch { /* ignore bad JSON */ }

      let parsedCaptions: Record<number, string> | undefined;
      try {
        const raw = sp.slotCaptions;
        if (raw) {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (obj && typeof obj === 'object') parsedCaptions = obj;
        }
      } catch { /* ignore bad JSON */ }

      if (urls.length > 0 || ids.length > 0) {
        newPageImages[idx] = {
          imageDataUrl: urls[0],
          imageDataUrls: urls,
          imageIds: ids.length > 0 ? ids : undefined,
          layout: sp.layout || undefined,
          frameStyle: (sp.frameStyle as FloralFrameStyle) || undefined,
          cropPositions: parsedCrops,
          slotCaptions: parsedCaptions,
        };
      }

      if (sp.colorTheme) setSelectedColorTheme(sp.colorTheme);
      if (sp.background) setSelectedWeddingBackground(sp.background);
    }

    setPageImages((prev) => ({ ...prev, ...newPageImages }));
    setPageLayouts((prev) => ({ ...prev, ...newPageLayouts }));
    if (saved.length > 2) setPageCount(Math.min(18, Math.max(6, saved.length)));
  }, []);

  // Helper: apply loaded covers into state — maps ALL style fields from API
  const applyLoadedCovers = React.useCallback((coverData: any) => {
    const resolveImg = (side: any) =>
      side?.imageId ? buildPreviewUrl(side.imageId) : resolveImageUrl(side?.imageUrl);

    const mapSide = (side: any): EditablePageState => ({
      headline: side.headline || '',
      subheadline: side.subheadline || '',
      description: side.description || '',
      imageDataUrl: resolveImg(side),
      imageId: side.imageId ?? undefined,
      style: {
        fontSize: side.fontSize ?? 20,
        fontWeight: side.fontWeight ? Number(side.fontWeight) : 700,
        align: side.align || undefined,
        verticalAlign: side.position || undefined,
        fontFamily: side.fontFamily || undefined,
        headlineColor: side.headlineColor || '#ffffff',
        subheadlineColor: side.subheadlineColor || '#e5e7eb',
        imageScale: side.imageZoom ? Number(side.imageZoom) : undefined,
        overlayOpacity: side.overlayOpacity != null ? Number(side.overlayOpacity) : undefined,
        overlayColor: side.overlayColor || undefined,
        blurBackground: side.backgroundBlur ?? undefined,
        vignette: side.backgroundVignette ?? undefined,
        darkModeCover: side.backgroundDarkMode ?? undefined,
        subtleAnimation: side.backgroundAnimation ?? undefined,
        logoImageId: side.logoImageId ?? undefined,
        logoDataUrl: side.logoImageId ? buildPreviewUrl(side.logoImageId) : resolveImageUrl(side.logoImageUrl),
        logoPosition: side.logoPosition || undefined,
        logoSize: side.logoSize ? Number(side.logoSize) : undefined,
      },
    });

    if (coverData?.frontCover) setEffectiveCover(mapSide(coverData.frontCover));
    if (coverData?.backCover) setEffectiveLast(mapSide(coverData.backCover));
  }, []);

  // Load saved pages + covers on mount (survives refresh)
  React.useEffect(() => {
    if (!user?.id || (!photobookId && !dbTemplateId)) return;
    const load = async () => {
      setIsLoading(true);
      const token = getStoredToken();
      const headers = { ...(token ? { 'X-API-KEY': token } : {}) };

      try {
        let pages: ApiAlbumPageResponse[] = [];
        const coversFromRoute = !!location.state?.coverPage;

        // Try photobook-scoped endpoint first, fall back to old (userId, templateId) endpoint
        if (photobookId) {
          try {
            const res = await api.get<{ pages: ApiAlbumPageResponse[]; total: number }>(
              `/api/photobooks/${photobookId}/pages`, { headers });
            pages = res.data?.pages ?? [];
          } catch { /* new endpoint might not be deployed yet */ }
        }
        if (pages.length === 0 && dbTemplateId) {
          try {
            const res = await api.get<{ pages: ApiAlbumPageResponse[]; total: number }>(
              `/api/album-pages?userId=${user.id}&templateId=${dbTemplateId}`, { headers });
            pages = res.data?.pages ?? [];
          } catch { /* fallback also failed */ }
        }
        // When covers come from route state (just saved), skip loading cover/last images
        // from the pages table — they'll come from coverFromState / lastFromState instead
        applyLoadedPages(pages, coversFromRoute);

        // Load covers from API only when NOT coming from the cover editing page
        if (!coversFromRoute) {
          let coverData: any = null;
          if (photobookId) {
            try {
              const r = await api.get(`/api/photobooks/${photobookId}/covers`, { headers });
              coverData = r.data;
            } catch { /* new endpoint might not exist */ }
          }
          if (!coverData?.frontCover && !coverData?.backCover && dbTemplateId) {
            try {
              const r = await api.get(`/api/covers?userId=${user.id}&templateId=${dbTemplateId}`, { headers });
              coverData = Array.isArray(r.data) ? r.data[0] : r.data;
            } catch { /* fallback also failed */ }
          }
          if (coverData) applyLoadedCovers(coverData);
        }
      } catch (err: any) {
        console.error('Failed to load album data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photobookId, dbTemplateId, user?.id]);

  const getPageLayoutLabel = (pageIndex: number, _fallbackLayoutName?: string) => {
    if (pageImages[pageIndex]?.layout) return pageImages[pageIndex]!.layout as string;
    if (pageLayouts[pageIndex]) return pageLayouts[pageIndex];
    // Default: simple single-image layout on every page
    return 'Single Photo';
  };

  const handleOpenFlipBook = React.useCallback(() => {
    setFlipBookPage(0);
    setShowFlipBook(true);
  }, []);

  const handleOpenSinglePageView = React.useCallback(() => {
    setSinglePageIndex(0);
    setSlideshowActive(false);
    setIsZoomed(false);
    setShowSinglePageView(true);
  }, []);

  // Shared page renderer used by editor, preview modals, and the hidden PDF canvas.
  // When editOpts.editable is true, images become interactive (drag-to-reposition).
  const renderPageInner = React.useCallback((
    page: AlbumPage,
    size: 'preview' | 'pdf',
    editOpts?: { editable?: boolean; onCropChange?: (slot: number, pos: CropPos) => void },
  ) => {
    const st = pageImages[page.index] ?? {};
    const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
    const isCover = page.type === 'cover';
    const isLast = page.type === 'last';
    const textState: EditablePageState | undefined = isCover
      ? (coverFromState ?? { headline: 'Cover', subheadline: '', description: '' } as EditablePageState)
      : isLast
      ? (lastFromState ?? { headline: 'The End', subheadline: '', description: '' } as EditablePageState)
      : undefined;

    const urls = st.imageDataUrls ?? (st.imageDataUrl ? [st.imageDataUrl] : []);
    const getSrc = (i: number) => urls[i] ?? urls[0] ?? st.imageDataUrl ?? '';
    const hasImg = !!getSrc(0);

    const pageBg =
      categorySlug === 'wedding'
        ? selectedWeddingTheme.gradient
        : categorySlug === 'anniversary'
        ? `linear-gradient(135deg, ${selectedTheme.colors[0]}, ${selectedTheme.colors[2]}, ${selectedTheme.colors[4]})`
        : 'linear-gradient(135deg, #fafafa, #f1f5f9)';

    const crops = st.cropPositions ?? {};

    // Unified image builder — uses DraggableCropImage when editable, plain <img> otherwise
    const mkImg = (i: number, extraClass = '') => {
      const cp = crops[i] ?? { x: 50, y: 50 };
      if (editOpts?.editable) {
        return (
          <DraggableCropImage
            key={i}
            src={getSrc(i)}
            alt={`Page ${page.index + 1} img ${i + 1}`}
            cropPos={cp}
            onCropChange={(p) => editOpts.onCropChange?.(i, p)}
            className={extraClass}
          />
        );
      }
      return (
        <div key={i} className={`relative overflow-hidden ${extraClass}`} style={{ minWidth: 0, minHeight: 0 }}>
          <img
            src={getSrc(i)}
            alt={`Page ${page.index + 1} img ${i + 1}`}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `${cp.x}% ${cp.y}%` }}
          />
        </div>
      );
    };

    let imageContent: React.ReactNode = null;
    if (hasImg) {
      switch (layoutLabel) {
        case 'Two Up':
          imageContent = (
            <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2" style={{ gridTemplateRows: '1fr' }}>
              {mkImg(0, 'rounded-md')}{mkImg(1, 'rounded-md')}
            </div>
          );
          break;
        case 'Three Grid':
          imageContent = (
            <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              <div className="relative overflow-hidden rounded-md" style={{ gridRow: '1 / 3', minWidth: 0, minHeight: 0 }}>
                {editOpts?.editable ? (
                  <DraggableCropImage
                    src={getSrc(0)}
                    alt={`Page ${page.index + 1} img 1`}
                    cropPos={crops[0] ?? { x: 50, y: 50 }}
                    onCropChange={(p) => editOpts.onCropChange?.(0, p)}
                    className="w-full h-full"
                  />
                ) : (
                  <img src={getSrc(0)} alt={`Page ${page.index + 1} img 1`} draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%` }} />
                )}
              </div>
              {mkImg(1, 'rounded-md')}{mkImg(2, 'rounded-md')}
            </div>
          );
          break;
        case 'Four Grid':
          imageContent = (
            <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
              {[0,1,2,3].map(i => mkImg(i, 'rounded-md'))}
            </div>
          );
          break;
        case 'Hero + Two':
          imageContent = (
            <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateRows: '1.5fr 1fr' }}>
              {mkImg(0, 'rounded-md')}
              <div className="grid grid-cols-2 gap-2" style={{ minHeight: 0 }}>{mkImg(1, 'rounded-md')}{mkImg(2, 'rounded-md')}</div>
            </div>
          );
          break;
        case 'Cinematic Spread':
          imageContent = (
            <div className="absolute inset-0 bg-black flex items-center justify-center p-3">
              <div className="relative w-full rounded-md overflow-hidden" style={{ aspectRatio: '2.35/1', maxHeight: '70%' }}>
                {editOpts?.editable ? (
                  <DraggableCropImage
                    src={getSrc(0)}
                    alt={`Page ${page.index + 1} img 1`}
                    cropPos={crops[0] ?? { x: 50, y: 50 }}
                    onCropChange={(p) => editOpts.onCropChange?.(0, p)}
                    className="w-full h-full"
                  />
                ) : (
                  <img src={getSrc(0)} alt={`Page ${page.index + 1} img 1`} draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%` }} />
                )}
              </div>
            </div>
          );
          break;
        case 'Collage':
          imageContent = (
            <div className="absolute inset-0">
              {[
                { idx: 0, cls: 'absolute top-[4%] left-[4%] w-[52%] h-[58%] rotate-[-3deg] overflow-hidden rounded-md shadow-lg' },
                { idx: 1, cls: 'absolute bottom-[4%] right-[4%] w-[52%] h-[58%] rotate-[3deg] overflow-hidden rounded-md shadow-lg' },
                { idx: 2, cls: 'absolute inset-0 m-auto w-[54%] h-[54%] z-10 overflow-hidden rounded-md shadow-xl' },
              ].map(({ idx, cls }) => (
                <div key={idx} className={cls}>
                  {editOpts?.editable ? (
                    <DraggableCropImage
                      src={getSrc(idx)}
                      alt=""
                      cropPos={crops[idx] ?? { x: 50, y: 50 }}
                      onCropChange={(p) => editOpts.onCropChange?.(idx, p)}
                      className="w-full h-full"
                    />
                  ) : (
                    <img src={getSrc(idx)} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: `${(crops[idx]?.x ?? 50)}% ${(crops[idx]?.y ?? 50)}%` }} />
                  )}
                </div>
              ))}
            </div>
          );
          break;
        default:
          imageContent = (
            <div className="absolute inset-0">
              {editOpts?.editable ? (
                <DraggableCropImage
                  src={getSrc(0)}
                  alt={`Page ${page.index + 1}`}
                  cropPos={crops[0] ?? { x: 50, y: 50 }}
                  onCropChange={(p) => editOpts.onCropChange?.(0, p)}
                  className="w-full h-full"
                />
              ) : (
                <img src={getSrc(0)} alt={`Page ${page.index + 1}`} draggable={false}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%` }} />
              )}
            </div>
          );
      }
    }

    return (
      <div className="relative w-full h-full overflow-hidden" style={{ background: pageBg }}>
        {imageContent ?? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-xs text-white/25 font-medium tracking-wide">Add a photo</span>
          </div>
        )}

        {textState && (isCover || isLast) && hasImg && (
          <div
            className={`absolute inset-0 z-20 flex px-6 py-8 ${
              textState.style?.overlayOpacity != null ? '' : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
            } ${
              textState.style?.verticalAlign === 'top' ? 'items-start' :
              textState.style?.verticalAlign === 'center' ? 'items-center' : 'items-end'
            }`}
            style={
              textState.style?.overlayOpacity != null
                ? { backgroundColor: `${textState.style.overlayColor || '#000000'}${Math.round((textState.style.overlayOpacity ?? 0.4) * 255).toString(16).padStart(2, '0')}` }
                : undefined
            }
          >
            <div className={`w-full ${
              textState.style?.align === 'center' ? 'text-center' :
              textState.style?.align === 'right' ? 'text-right' : 'text-left'
            }`}>
              {textState.headline && (
                <div className="leading-tight" style={{
                  fontSize: size === 'pdf' ? Math.min(42, (textState.style?.fontSize ?? 22) * 1.4) : Math.min(36, (textState.style?.fontSize ?? 22) * 1.2),
                  fontWeight: textState.style?.fontWeight ?? 700,
                  color: textState.style?.headlineColor ?? '#ffffff',
                  fontFamily: textState.style?.fontFamily,
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  letterSpacing: textState.style?.letterSpacing ? `${textState.style.letterSpacing}px` : undefined,
                }}>{textState.headline}</div>
              )}
              {textState.subheadline && (
                <div className="mt-2 leading-tight" style={{
                  fontSize: size === 'pdf' ? Math.min(26, ((textState.style?.fontSize ?? 22) - 4) * 1.3) : Math.min(22, ((textState.style?.fontSize ?? 22) - 4) * 1.1),
                  fontWeight: Math.max(300, (textState.style?.fontWeight ?? 700) - 200),
                  color: textState.style?.subheadlineColor ?? '#e5e7eb',
                  fontFamily: textState.style?.fontFamily,
                  textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                }}>{textState.subheadline}</div>
              )}
              {textState.description && (
                <div className="mt-3 text-xs text-white/70 leading-relaxed max-w-[80%]" style={{
                  textAlign: textState.style?.align || 'left',
                  marginLeft: textState.style?.align === 'center' ? 'auto' : undefined,
                  marginRight: textState.style?.align === 'center' ? 'auto' : undefined,
                }}>{textState.description}</div>
              )}
            </div>
          </div>
        )}

        {textState && (isCover || isLast) && !hasImg && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-white/60">{textState.headline || (isCover ? 'Cover' : 'Back')}</div>
              {textState.subheadline && <div className="text-sm text-white/40 mt-1">{textState.subheadline}</div>}
            </div>
          </div>
        )}

        {/* Captions + page number overlay for inner pages */}
        {!isCover && !isLast && (() => {
          const pageCaptions = st.slotCaptions ?? {};
          const captionEntries = Object.entries(pageCaptions).filter(([, v]) => v && v.trim());
          const hasCaptions = captionEntries.length > 0;
          return (
            <div className="absolute bottom-0 inset-x-0 z-20">
              {hasCaptions && (
                <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pb-6 pt-10">
                  <div className="flex flex-col items-center gap-1">
                    {captionEntries.map(([k, v]) => (
                      <p key={k} className="text-[13px] text-white font-medium leading-relaxed text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{v}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className={`flex justify-center ${hasCaptions ? 'pb-1.5 -mt-3' : 'pb-2'}`}>
                <span className="text-[9px] font-semibold text-white/50 bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-sm">{page.index + 1}</span>
              </div>
            </div>
          );
        })()}

        {textState?.style?.logoDataUrl && (isCover || isLast) && (
          <div className="absolute z-30" style={{
            top: textState.style.logoPosition?.includes('top') ? '12px' : undefined,
            bottom: textState.style.logoPosition?.includes('bottom') ? '12px' : undefined,
            left: textState.style.logoPosition?.includes('left') ? '12px' : textState.style.logoPosition?.includes('center') ? '50%' : undefined,
            right: textState.style.logoPosition?.includes('right') ? '12px' : undefined,
            transform: textState.style.logoPosition?.includes('center') ? 'translateX(-50%)' : undefined,
          }}>
            <img src={textState.style.logoDataUrl} alt="Logo" className="rounded-lg shadow-lg" style={{
              width: `${textState.style.logoSize ?? 60}px`, height: `${textState.style.logoSize ?? 60}px`, objectFit: 'contain',
            }} />
          </div>
        )}
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageImages, pageLayouts, coverFromState, lastFromState, categorySlug, selectedWeddingTheme, selectedTheme]);

  // Load an image as HTMLImageElement with CORS support
  const loadImage = React.useCallback((src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }, []);

  /** Draw image onto canvas simulating object-fit:cover with crop position (0-100%). */
  const drawCover = (
    ctx: CanvasRenderingContext2D, img: HTMLImageElement,
    dx: number, dy: number, dw: number, dh: number,
    crop?: CropPos, radius?: number,
  ) => {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = dw / dh;
    let sw: number, sh: number;
    if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; }
    else { sw = img.naturalWidth; sh = sw / cr; }
    const cx = crop?.x ?? 50;
    const cy = crop?.y ?? 50;
    const sx = (cx / 100) * (img.naturalWidth - sw);
    const sy = (cy / 100) * (img.naturalHeight - sh);

    if (radius && radius > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(dx, dy, dw, dh, radius);
      ctx.clip();
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    if (radius && radius > 0) ctx.restore();
  };

  // Parse CSS gradient string to create a canvas gradient
  const fillGradient = (ctx: CanvasRenderingContext2D, w: number, h: number, gradientStr: string) => {
    const colorMatch = gradientStr.match(/#[0-9a-fA-F]{6}/g);
    if (!colorMatch?.length) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const grad = ctx.createLinearGradient(0, 0, w * 0.6, h);
    colorMatch.forEach((c, i) => grad.addColorStop(i / (colorMatch.length - 1 || 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  // PDF download — draws each page on Canvas then compiles to PDF (respects orientation)
  const handleDownloadPdf = React.useCallback(async () => {
    if (isGeneratingPdf || !albumPages.length) return;
    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: albumPages.length });

    try {
      const isLandscape = bookOrientation === 'landscape';
      const W = isLandscape ? 1040 : 800;
      const H = isLandscape ? 800 : 1040;
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: [W, H] });

      for (let i = 0; i < albumPages.length; i++) {
        setPdfProgress({ current: i + 1, total: albumPages.length });
        const page = albumPages[i];
        const st = pageImages[page.index] ?? {};
        const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
        const isCover = page.type === 'cover';
        const isLast = page.type === 'last';

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        // Background
        const bgStr = categorySlug === 'wedding'
          ? selectedWeddingTheme.gradient
          : categorySlug === 'anniversary'
          ? `linear-gradient(135deg, ${selectedTheme.colors[0]}, ${selectedTheme.colors[2]}, ${selectedTheme.colors[4]})`
          : 'linear-gradient(135deg, #fafafa, #f1f5f9)';
        fillGradient(ctx, W, H, bgStr);

        // Collect image sources
        const urls = st.imageDataUrls ?? (st.imageDataUrl ? [st.imageDataUrl] : []);
        const getUrl = (idx: number) => urls[idx] ?? urls[0] ?? st.imageDataUrl ?? '';

        // Load images
        const images: (HTMLImageElement | null)[] = [];
        const urlSet = new Set<string>();
        for (let s = 0; s < 4; s++) {
          const u = getUrl(s);
          if (u && !urlSet.has(u)) { urlSet.add(u); }
          images[s] = u ? await loadImage(u) : null;
        }

        const pad = 24, gap = 18, rad = 12;
        const crops = st.cropPositions ?? {};
        const getImg = (idx: number) => images[idx] ?? images[0];

        if (images[0]) {
          switch (layoutLabel) {
            case 'Two Up': {
              const colW = (W - pad * 2 - gap) / 2;
              const h = H - pad * 2;
              drawCover(ctx, getImg(0)!, pad, pad, colW, h, crops[0], rad);
              drawCover(ctx, getImg(1)!, pad + colW + gap, pad, colW, h, crops[1], rad);
              break;
            }
            case 'Three Grid': {
              const colW = (W - pad * 2 - gap) / 2;
              const rowH = (H - pad * 2 - gap) / 2;
              const fullH = H - pad * 2;
              drawCover(ctx, getImg(0)!, pad, pad, colW, fullH, crops[0], rad);
              drawCover(ctx, getImg(1)!, pad + colW + gap, pad, colW, rowH, crops[1], rad);
              drawCover(ctx, getImg(2)!, pad + colW + gap, pad + rowH + gap, colW, rowH, crops[2], rad);
              break;
            }
            case 'Four Grid': {
              const colW = (W - pad * 2 - gap) / 2;
              const rowH = (H - pad * 2 - gap) / 2;
              for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 2; c++) {
                  const idx = r * 2 + c;
                  drawCover(ctx, getImg(idx)!, pad + c * (colW + gap), pad + r * (rowH + gap), colW, rowH, crops[idx], rad);
                }
              }
              break;
            }
            case 'Hero + Two': {
              const heroH = Math.round((H - pad * 2 - gap) * 0.6);
              const btmH = H - pad * 2 - gap - heroH;
              const colW = (W - pad * 2 - gap) / 2;
              drawCover(ctx, getImg(0)!, pad, pad, W - pad * 2, heroH, crops[0], rad);
              drawCover(ctx, getImg(1)!, pad, pad + heroH + gap, colW, btmH, crops[1], rad);
              drawCover(ctx, getImg(2)!, pad + colW + gap, pad + heroH + gap, colW, btmH, crops[2], rad);
              break;
            }
            case 'Cinematic Spread': {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, W, H);
              const cinePad = 32;
              const imgW = W - cinePad * 2;
              const imgH = Math.round(imgW / 2.35);
              const imgY = Math.round((H - imgH) / 2);
              drawCover(ctx, getImg(0)!, cinePad, imgY, imgW, imgH, crops[0], rad);
              break;
            }
            case 'Collage': {
              const cw = Math.round(W * 0.52), ch = Math.round(H * 0.56);
              ctx.save(); ctx.translate(pad, pad + 10); ctx.rotate(-3 * Math.PI / 180);
              drawCover(ctx, getImg(0)!, 0, 0, cw, ch, crops[0], rad); ctx.restore();
              ctx.save(); ctx.translate(W - pad - cw, H - pad - ch - 10); ctx.rotate(3 * Math.PI / 180);
              drawCover(ctx, getImg(1)!, 0, 0, cw, ch, crops[1], rad); ctx.restore();
              const mw = Math.round(W * 0.56), mh = Math.round(H * 0.52);
              drawCover(ctx, getImg(2)!, (W - mw) / 2, (H - mh) / 2, mw, mh, crops[2], rad);
              break;
            }
            default:
              drawCover(ctx, images[0]!, pad, pad, W - pad * 2, H - pad * 2, crops[0], rad);
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No photo', W / 2, H / 2);
        }

        // Cover / last page text overlay
        if (isCover || isLast) {
          const ts = isCover
            ? (coverFromState ?? { headline: 'Cover', subheadline: '' } as EditablePageState)
            : (lastFromState ?? { headline: 'The End', subheadline: '' } as EditablePageState);

          // Gradient overlay
          if (images[0]) {
            const overlayOp = ts.style?.overlayOpacity;
            if (overlayOp != null) {
              ctx.fillStyle = `${ts.style?.overlayColor || '#000000'}${Math.round(overlayOp * 255).toString(16).padStart(2, '0')}`;
              ctx.fillRect(0, 0, W, H);
            } else {
              const grad = ctx.createLinearGradient(0, H, 0, 0);
              grad.addColorStop(0, 'rgba(0,0,0,0.6)');
              grad.addColorStop(0.5, 'rgba(0,0,0,0)');
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, W, H);
            }
          }

          const align = ts.style?.align || 'center';
          const vAlign = ts.style?.verticalAlign || 'bottom';
          ctx.textAlign = align as CanvasTextAlign;
          const tx = align === 'center' ? W / 2 : align === 'right' ? W - 40 : 40;
          let ty = vAlign === 'top' ? 80 : vAlign === 'center' ? H / 2 - 20 : H - 100;

          if (ts.headline) {
            const fSize = Math.min(48, (ts.style?.fontSize ?? 22) * 1.6);
            const fWeight = (ts.style?.fontWeight ?? 700) >= 600 ? 'bold' : 'normal';
            const fFamily = ts.style?.fontFamily || 'sans-serif';
            ctx.font = `${fWeight} ${fSize}px ${fFamily}`;
            ctx.fillStyle = ts.style?.headlineColor ?? '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
            ctx.fillText(ts.headline, tx, ty);
            ctx.shadowColor = 'transparent';
            ty += fSize + 8;
          }
          if (ts.subheadline) {
            const fSize = Math.min(28, ((ts.style?.fontSize ?? 22) - 2) * 1.2);
            const fFamily = ts.style?.fontFamily || 'sans-serif';
            ctx.font = `${fSize}px ${fFamily}`;
            ctx.fillStyle = ts.style?.subheadlineColor ?? '#e5e7eb';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 6;
            ctx.fillText(ts.subheadline, tx, ty);
            ctx.shadowColor = 'transparent';
            ty += fSize + 6;
          }
          if (ts.description) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(ts.description, tx, ty);
          }

          // Logo
          if (ts.style?.logoDataUrl) {
            const logoImg = await loadImage(ts.style.logoDataUrl);
            if (logoImg) {
              const ls = ts.style.logoSize ?? 60;
              const lp = ts.style.logoPosition || 'top-center';
              const lx = lp.includes('left') ? 16 : lp.includes('right') ? W - ls - 16 : (W - ls) / 2;
              const ly = lp.includes('top') ? 16 : lp.includes('bottom') ? H - ls - 16 : (H - ls) / 2;
              ctx.drawImage(logoImg, lx, ly, ls, ls);
            }
          }
        }

        // Captions + page number for inner pages
        if (!isCover && !isLast) {
          const pageCaptions = st.slotCaptions ?? {};
          const captionLines = Object.values(pageCaptions).filter((v): v is string => !!v && v.trim().length > 0);

          if (captionLines.length > 0) {
            const lineH = 20;
            const captionBlockH = captionLines.length * lineH + 60;
            const grad = ctx.createLinearGradient(0, H - captionBlockH, 0, H);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.4, 'rgba(0,0,0,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0.7)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, H - captionBlockH, W, captionBlockH);

            ctx.font = '500 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 1;
            let cy = H - 30 - (captionLines.length - 1) * lineH;
            for (const line of captionLines) {
              ctx.fillText(line, W / 2, cy, W - 60);
              cy += lineH;
            }
            ctx.shadowColor = 'transparent';
          }

          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(`${page.index + 1}`, W / 2, H - 10);
        }

        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
      }

      pdf.save(`${categorySlug}-album.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumPages, pageImages, coverFromState, lastFromState, categorySlug, selectedWeddingTheme, selectedTheme, isGeneratingPdf, loadImage, bookOrientation]);

  // Sync cover & last page images from coverFromState / lastFromState (source of truth for these pages).
  // Always overwrite — the cover editing page is the authority for first/last page images.
  React.useEffect(() => {
    if (!albumPages.length) return;
    setPageImages((prev) => {
      const next: Record<number, PageImageState> = { ...prev };

      const coverPage = albumPages.find((p) => p.type === 'cover');
      const lastPage = albumPages.find((p) => p.type === 'last');

      if (coverPage && coverFromState?.imageDataUrl) {
        next[coverPage.index] = {
          ...(next[coverPage.index] ?? {}),
          imageDataUrl: coverFromState.imageDataUrl,
        };
      }

      if (lastPage && lastFromState?.imageDataUrl) {
        next[lastPage.index] = {
          ...(next[lastPage.index] ?? {}),
          imageDataUrl: lastFromState.imageDataUrl,
        };
      }

      return next;
    });
  }, [albumPages, coverFromState, lastFromState]);

  // Slideshow auto-play
  React.useEffect(() => {
    if (!slideshowActive || !showSinglePageView) return;
    const timer = setInterval(() => {
      setSinglePageIndex((prev) => {
        if (prev >= albumPages.length - 1) {
          setSlideshowActive(false);
          return prev;
        }
        return prev + 1;
      });
    }, slideshowSpeed);
    return () => clearInterval(timer);
  }, [slideshowActive, showSinglePageView, albumPages.length, slideshowSpeed]);

  // Keyboard navigation: arrows for editor stepper + single-page view, Escape to close modals
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (showSinglePageView) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSlideshowActive(false);
          setSinglePageIndex(p => Math.max(0, p - 1));
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSlideshowActive(false);
          setSinglePageIndex(p => Math.min(albumPages.length - 1, p + 1));
        } else if (e.key === ' ') {
          e.preventDefault();
          setSlideshowActive(p => !p);
        } else if (e.key === 'Escape') {
          if (isZoomed) { setIsZoomed(false); }
          else { setShowSinglePageView(false); setSlideshowActive(false); }
        } else if (e.key === 'z' || e.key === 'Z') {
          setIsZoomed(p => !p);
        } else if (e.key === 'Home') {
          e.preventDefault();
          setSinglePageIndex(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          setSinglePageIndex(albumPages.length - 1);
        }
      } else if (showFlipBook) {
        if (e.key === 'Escape') { setShowFlipBook(false); }
        else if (e.key === 'ArrowLeft') { flipBookRef.current?.pageFlip()?.flipPrev(); }
        else if (e.key === 'ArrowRight') { flipBookRef.current?.pageFlip()?.flipNext(); }
      } else if (!isInput && !showFlipBook && !showSinglePageView) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentStep(s => Math.max(0, s - 1));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setCurrentStep(s => Math.min(albumPages.length - 1, s + 1));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSinglePageView, showFlipBook, albumPages.length, isZoomed]);

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

      {/* Loading overlay */}
      {isLoading && (
        <div className="no-print rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-4 text-sm text-indigo-700 flex items-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-200" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="font-semibold">Loading your album...</p>
            <p className="text-xs text-indigo-500 mt-0.5">Restoring pages, images, and captions</p>
          </div>
        </div>
      )}

      {/* Studio album info banner */}
      {studioAlbumImageIds && (
        <div className="no-print rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div className="text-xs text-indigo-700">
            <span className="font-bold">{studioAlbumName || 'Studio Album'}</span>
            <span className="text-indigo-500"> — {studioAlbumImageIds.length} images from your album are available for selection</span>
          </div>
        </div>
      )}

      {/* Header (hidden in print) */}
      <div className="no-print relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-5 shadow-[0_0_0_1px_rgba(148,163,184,0.06),0_12px_40px_-10px_rgba(15,23,42,0.06)]">
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 rounded-t-2xl" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Album Builder</h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="capitalize font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{categorySlug || 'custom'}</span>
                <span className="text-slate-300">·</span>
                <span>{template.name}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">{albumPages.length} pages</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/photo-themes/${categorySlug}`, {
              state: { templateId: dbTemplateId, photobookId },
            })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <FaEdit className="w-3.5 h-3.5 text-indigo-500" />
            Edit Covers
          </button>
        </div>
      </div>

      {/* Album pages – in print only images; toolbar hidden in print */}
      <div className="album-pages-section rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden backdrop-blur-sm print:shadow-none print:border-0 print:bg-transparent print:rounded-none">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Page Editor</h2>
          </div>
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

        {/* ── Step-by-step page editor ─────────────────────── */}
        {(() => {
          const safeStep = Math.min(currentStep, albumPages.length - 1);
          const page = albumPages[safeStep];
          if (!page) return null;
          const state = pageImages[page.index] ?? {};
          const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
          const isCover = page.type === 'cover';
          const isLast = page.type === 'last';
          const isMultiLayout = MULTI_IMAGE_LAYOUTS.includes(layoutLabel);
          const slotCount = isMultiLayout ? (MULTI_IMAGE_SLOT_COUNT[layoutLabel] ?? 2) : 1;
          const urls = state.imageDataUrls ?? (state.imageDataUrl ? [state.imageDataUrl] : []);
          const captions = state.slotCaptions ?? {};

          const setCaption = (slotIdx: number, text: string) => {
            setPageImages(prev => ({
              ...prev,
              [page.index]: {
                ...prev[page.index],
                slotCaptions: { ...(prev[page.index]?.slotCaptions ?? {}), [slotIdx]: text },
              },
            }));
          };

          const onCrop = (si: number, pos: CropPos) => {
            setPageImages(prev => ({
              ...prev,
              [page.index]: {
                ...prev[page.index],
                cropPositions: { ...(prev[page.index]?.cropPositions ?? {}), [si]: pos },
              },
            }));
          };

          const filledPages = albumPages.filter(p => {
            const s = pageImages[p.index];
            return s && (s.imageDataUrl || (s.imageDataUrls?.length ?? 0) > 0);
          }).length;
          const progressPct = Math.round((filledPages / albumPages.length) * 100);

          return (
            <div className="p-4 flex flex-col" style={{ minHeight: 'calc(100vh - 220px)' }}>
              {/* ── Progress bar ── */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progressPct}%`,
                      background: progressPct === 100
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #6366f1, #818cf8)',
                    }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${progressPct === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {filledPages}/{albumPages.length}
                </span>
              </div>

              {/* ── Horizontal stepper — thumbnail strip ── */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-thin">
                {albumPages.map((p, i) => {
                  const pState = pageImages[p.index] ?? {};
                  const hasImg = !!(pState.imageDataUrl || (pState.imageDataUrls?.length ?? 0) > 0);
                  const active = i === safeStep;
                  const pIsCover = p.type === 'cover';
                  const pIsLast = p.type === 'last';
                  return (
                    <button
                      key={p.index}
                      type="button"
                      onClick={() => setCurrentStep(i)}
                      className={`flex-shrink-0 rounded-lg overflow-hidden transition-all border-2 ${
                        active
                          ? 'border-indigo-500 shadow-md shadow-indigo-200/50 scale-105'
                          : hasImg
                          ? 'border-emerald-300 hover:border-emerald-400'
                          : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                      }`}
                      style={{ width: 44, height: 34 }}
                      title={pIsCover ? 'Cover' : pIsLast ? 'Last Page' : `Page ${p.index + 1}`}
                    >
                      {hasImg && pState.imageDataUrl ? (
                        <img src={pState.imageDataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold ${
                          active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {pIsCover ? 'C' : pIsLast ? 'L' : p.index + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Page header + visual layout picker ── */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 ${
                    isCover ? 'bg-cyan-100 text-cyan-800' : isLast ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isCover ? 'Cover' : isLast ? 'Back' : `Page ${page.index + 1}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{safeStep + 1} / {albumPages.length}</span>
              </div>
              {/* Visual layout thumbnails */}
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                {PAGE_LAYOUT_OPTIONS.map((opt) => {
                  const active = layoutLabel === opt;
                  const miniLayout: Record<string, React.ReactNode> = {
                    'Single Photo': <div className="w-full h-full bg-indigo-300 rounded-[2px]" />,
                    'Two Up': <div className="w-full h-full flex gap-[1px]"><div className="flex-1 bg-indigo-300 rounded-l-[2px]" /><div className="flex-1 bg-indigo-400 rounded-r-[2px]" /></div>,
                    'Three Grid': <div className="w-full h-full grid gap-[1px]" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}><div className="bg-indigo-300 rounded-tl-[2px]" style={{ gridRow: '1/3' }} /><div className="bg-indigo-400 rounded-tr-[2px]" /><div className="bg-indigo-500 rounded-br-[2px]" /></div>,
                    'Four Grid': <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px]"><div className="bg-indigo-300 rounded-tl-[2px]" /><div className="bg-indigo-400 rounded-tr-[2px]" /><div className="bg-indigo-400 rounded-bl-[2px]" /><div className="bg-indigo-500 rounded-br-[2px]" /></div>,
                    'Hero + Two': <div className="w-full h-full grid gap-[1px]" style={{ gridTemplateRows: '1.5fr 1fr' }}><div className="bg-indigo-300 rounded-t-[2px]" /><div className="flex gap-[1px]"><div className="flex-1 bg-indigo-400 rounded-bl-[2px]" /><div className="flex-1 bg-indigo-500 rounded-br-[2px]" /></div></div>,
                    'Cinematic Spread': <div className="w-full h-full bg-slate-800 flex items-center justify-center p-[2px]"><div className="w-full bg-indigo-300 rounded-[1px]" style={{ height: '40%' }} /></div>,
                  };
                  return (
                    <button
                      key={opt}
                      type="button"
                      title={opt}
                      onClick={() => {
                        setPageLayouts((prev) => {
                          setPageImages((prevImages) => ({
                            ...prevImages,
                            [page.index]: { ...(prevImages[page.index] ?? {}), layout: opt },
                          }));
                          return { ...prev, [page.index]: opt };
                        });
                      }}
                      className={`shrink-0 flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${
                        active
                          ? 'bg-indigo-50 ring-2 ring-indigo-400 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <div className={`w-10 h-8 rounded-[3px] overflow-hidden ${active ? 'opacity-100' : 'opacity-60'}`}>
                        {miniLayout[opt] ?? <div className="w-full h-full bg-slate-300 rounded-[2px]" />}
                      </div>
                      <span className={`text-[8px] font-bold leading-none ${active ? 'text-indigo-700' : 'text-slate-400'}`}>
                        {opt === 'Cinematic Spread' ? 'Cinema' : opt === 'Single Photo' ? 'Single' : opt === 'Hero + Two' ? 'Hero' : opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Page preview — paper-like with depth shadow ── */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div
                  className="relative w-full rounded-xl overflow-hidden transition-shadow duration-300"
                  style={{
                    aspectRatio: '4/3',
                    maxHeight: 'calc(100vh - 420px)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px -12px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)',
                  }}
                >
                  {renderPageInner(page, 'preview', { editable: true, onCropChange: onCrop })}
                </div>
              </div>

              {/* ── Controls below preview ── */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {/* Image slots + Pick button */}
                <div className="flex items-center gap-3">
                  {/* Current images preview */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
                    {Array.from({ length: slotCount }).map((_, si) => {
                      const slotUrl = isMultiLayout ? urls[si] : (si === 0 ? state.imageDataUrl : undefined);
                      return (
                        <div key={si} className="relative flex-shrink-0 group/slot">
                          <div className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${
                            slotUrl
                              ? 'border-2 border-emerald-300 shadow-sm shadow-emerald-100'
                              : 'border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}>
                            {slotUrl ? (
                              <img src={slotUrl} alt={`Slot ${si + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-0.5">
                                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="text-[8px] text-slate-400 font-bold">{si + 1}</span>
                              </div>
                            )}
                          </div>
                          {slotUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setPageImages(prev => {
                                  const cur = prev[page.index] ?? {};
                                  if (isMultiLayout) {
                                    const u = [...(cur.imageDataUrls ?? [])];
                                    const ids = [...(cur.imageIds ?? [])];
                                    u[si] = '';
                                    ids[si] = 0;
                                    return { ...prev, [page.index]: { ...cur, imageDataUrl: u[0] || '', imageDataUrls: u, imageIds: ids } };
                                  }
                                  return { ...prev, [page.index]: { ...cur, imageDataUrl: undefined, imageDataUrls: undefined, imageIds: undefined } };
                                });
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center hover:bg-red-600 shadow-md opacity-0 group-hover/slot:opacity-100 transition-opacity z-10"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Single pick button */}
                  <button
                    type="button"
                    onClick={() => setPageImagePickerFor({ pageIndex: page.index, layout: layoutLabel })}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 border border-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {isMultiLayout ? `Pick ${slotCount} Photos` : 'Pick Photo'}
                  </button>
                </div>

                {/* Captions — only for inner pages */}
                {!isCover && !isLast && (
                  <div className="flex gap-2 flex-wrap items-center">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    {Array.from({ length: slotCount }).map((_, si) => (
                      <input
                        key={si}
                        type="text"
                        placeholder={slotCount > 1 ? `Caption ${si + 1}...` : 'Write a message for this page...'}
                        value={captions[si] ?? ''}
                        onChange={(e) => setCaption(si, e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                      />
                    ))}
                  </div>
                )}

                {/* Cover/Last page hint */}
                {(isCover || isLast) && (
                  <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </div>
                    <div className="text-[11px] text-amber-800">
                      <strong>{isCover ? 'Front Cover' : 'Back Cover'}</strong> — customize text, font, and background on the{' '}
                      <button
                        type="button"
                        onClick={() => navigate(`/photo-themes/${categorySlug}`, { state: { templateId: dbTemplateId, photobookId } })}
                        className="underline font-bold text-amber-900 hover:text-orange-700 transition-colors"
                      >
                        Cover Editor
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Navigation buttons with keyboard hints ── */}
              <div className="flex items-center justify-between pt-3 mt-auto border-t border-slate-100">
                <button
                  type="button"
                  disabled={safeStep === 0}
                  onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FaChevronLeft className="w-3 h-3" /> Previous
                </button>
                <div className="hidden sm:flex items-center gap-2 text-[9px] text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono">←</kbd>
                  <span>navigate</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono">→</kbd>
                </div>
                <button
                  type="button"
                  disabled={safeStep >= albumPages.length - 1}
                  onClick={() => setCurrentStep(s => Math.min(albumPages.length - 1, s + 1))}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* PDF generation overlay */}
      {isGeneratingPdf && pdfProgress && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-600">{Math.round((pdfProgress.current / pdfProgress.total) * 100)}%</span>
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Generating your PDF</h3>
            <p className="text-xs text-slate-500 mb-4">Rendering page {pdfProgress.current} of {pdfProgress.total}...</p>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                style={{ width: `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating toast notifications */}
      {(saveError || saveSuccess) && createPortal(
        <div className="fixed top-6 right-6 z-[9999] animate-[slideDown_0.3s_ease-out]">
          {saveError && (
            <div className="rounded-xl bg-red-600 px-5 py-3 text-sm text-white shadow-lg shadow-red-600/30 flex items-center gap-2 max-w-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveError(null)} className="ml-2 text-white/70 hover:text-white">×</button>
            </div>
          )}
          {saveSuccess && (
            <div className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2">
              <FaCheck className="w-3.5 h-3.5" /> Album saved!
            </div>
          )}
        </div>,
        document.body
      )}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Action bar — visually grouped ── */}
      <div className="no-print rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left — navigation */}
          <button
            type="button"
            onClick={() => navigate(`/photo-themes/${categorySlug}`, {
              state: { templateId: dbTemplateId, photobookId },
            })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" />
            Back to Covers
          </button>

          {/* Center — preview controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
            {/* Orientation toggle */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setBookOrientation('landscape')}
                className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  bookOrientation === 'landscape'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ⬜ Landscape
              </button>
              <button
                type="button"
                onClick={() => setBookOrientation('portrait')}
                className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  bookOrientation === 'portrait'
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ▯ Portrait
              </button>
            </div>
            <button
              type="button"
              onClick={handleOpenFlipBook}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Flip Book
            </button>
            <button
              type="button"
              onClick={handleOpenSinglePageView}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Page View
            </button>
          </div>

          {/* Right — save & export */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAlbum}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <FaSpinner className="w-3.5 h-3.5 animate-spin" /> : <FaSave className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative overflow-hidden"
            >
              {isGeneratingPdf && pdfProgress && (
                <div
                  className="absolute inset-0 bg-emerald-500/30 transition-all duration-300"
                  style={{ width: `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {isGeneratingPdf ? <FaSpinner className="w-3.5 h-3.5 animate-spin" /> : <FaDownload className="w-3.5 h-3.5" />}
                {isGeneratingPdf && pdfProgress
                  ? `${pdfProgress.current}/${pdfProgress.total}`
                  : 'PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen book preview modal — landscape / portrait */}
      {showFlipBook &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex flex-col bg-gradient-to-b from-[#0f0f14] via-[#16161d] to-[#1a1a24]">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 backdrop-blur-md border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <div>
                  <span className="text-sm font-bold text-white tracking-wide">Flip Book</span>
                  <span className="ml-2 text-[10px] text-white/40 capitalize">{categorySlug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Orientation toggle */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setBookOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      bookOrientation === 'landscape'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      bookOrientation === 'portrait'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
                {/* Download button */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isGeneratingPdf ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  PDF
                </button>
                {/* Page view switch */}
                <button
                  type="button"
                  onClick={() => { setShowFlipBook(false); setShowSinglePageView(true); setSinglePageIndex(0); }}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  Page View
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlipBook(false)}
                  className="rounded-lg bg-white/[0.06] w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Book area — with shelf-like surface */}
            <div className="flex-1 flex items-center justify-center overflow-hidden px-4 py-6 relative" key={bookOrientation}>
              {/* Spotlight glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[50%] h-[60%] rounded-full bg-indigo-500/[0.04] blur-[100px]" />
              </div>
              {/* Prev / Next buttons */}
              <button
                type="button"
                onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
                className="absolute left-4 z-30 group rounded-full bg-black/20 hover:bg-black/50 p-3 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/[0.06]"
              >
                <FaChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              {/* @ts-ignore */}
              <HTMLFlipBook
                ref={flipBookRef}
                width={bookOrientation === 'landscape' ? 700 : 500}
                height={bookOrientation === 'landscape' ? 500 : 700}
                size="stretch"
                minWidth={bookOrientation === 'landscape' ? 360 : 280}
                maxWidth={bookOrientation === 'landscape' ? 1000 : 800}
                minHeight={bookOrientation === 'landscape' ? 280 : 360}
                maxHeight={bookOrientation === 'landscape' ? 720 : 1000}
                maxShadowOpacity={0.7}
                showCover={true}
                mobileScrollSupport={true}
                drawShadow={true}
                flippingTime={700}
                onFlip={(e: any) => setFlipBookPage(e?.data ?? 0)}
                className="shadow-[0_30px_100px_rgba(0,0,0,0.6)] rounded-xl relative z-20"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              >
                {albumPages.map((page) => (
                  <FlipBookPage key={page.index}>
                    {renderPageInner(page, 'preview')}
                  </FlipBookPage>
                ))}
              </HTMLFlipBook>
              <button
                type="button"
                onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
                className="absolute right-4 z-30 group rounded-full bg-black/20 hover:bg-black/50 p-3 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/[0.06]"
              >
                <FaChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {/* Book shadow on surface */}
              <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 w-[35%] h-4 bg-black/20 rounded-full blur-xl pointer-events-none" />
            </div>

            {/* Bottom bar — page counter + keyboard hints */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 backdrop-blur-md border-t border-white/[0.06]">
              <div className="flex items-center gap-4">
                {/* Page counter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/70">
                    Page {flipBookPage + 1}
                  </span>
                  <span className="text-[10px] text-white/30">of {albumPages.length}</span>
                </div>
                {/* Progress dots */}
                <div className="hidden sm:flex items-center gap-1">
                  {albumPages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === flipBookPage ? 'bg-indigo-400 w-4' : idx < flipBookPage ? 'bg-white/30' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">←</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">→</kbd>
                  <span>flip pages</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">Esc</kbd>
                  <span>close</span>
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Single-page fullscreen view — with slideshow, zoom, and professional controls */}
      {showSinglePageView &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex flex-col bg-gradient-to-b from-[#0f0f14] via-[#16161d] to-[#1a1a24]">
            {/* Crossfade animation styles */}
            <style>{`
              @keyframes fadeSlideIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
              .page-fade-in { animation: fadeSlideIn 0.35s ease-out both; }
            `}</style>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 backdrop-blur-md border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <span className="text-sm font-bold text-white tracking-wide">
                    {albumPages[singlePageIndex]?.type === 'cover' ? 'Front Cover' :
                     albumPages[singlePageIndex]?.type === 'last' ? 'Back Cover' :
                     `Page ${singlePageIndex + 1}`}
                  </span>
                  <span className="ml-2 text-[10px] text-white/30">{singlePageIndex + 1} of {albumPages.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Slideshow controls */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06] mr-1">
                  <button
                    type="button"
                    onClick={() => setSlideshowActive(p => !p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all inline-flex items-center gap-1 ${
                      slideshowActive ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/70'
                    }`}
                    title={slideshowActive ? 'Pause slideshow (Space)' : 'Start slideshow (Space)'}
                  >
                    {slideshowActive ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                    {slideshowActive ? 'Pause' : 'Play'}
                  </button>
                  {slideshowActive && (
                    <select
                      value={slideshowSpeed}
                      onChange={(e) => setSlideshowSpeed(Number(e.target.value))}
                      className="bg-transparent text-[10px] text-white/50 font-bold border-none outline-none cursor-pointer"
                    >
                      <option value={2000} className="bg-slate-800">2s</option>
                      <option value={3000} className="bg-slate-800">3s</option>
                      <option value={4000} className="bg-slate-800">4s</option>
                      <option value={6000} className="bg-slate-800">6s</option>
                      <option value={8000} className="bg-slate-800">8s</option>
                    </select>
                  )}
                </div>
                {/* Zoom toggle */}
                <button
                  type="button"
                  onClick={() => setIsZoomed(p => !p)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all border border-white/[0.06] inline-flex items-center gap-1 ${
                    isZoomed ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40 hover:text-white/70'
                  }`}
                  title="Toggle zoom (Z)"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </button>
                {/* Orientation toggle */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setBookOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      bookOrientation === 'landscape' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      bookOrientation === 'portrait' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
                {/* Download PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 border border-emerald-500/30"
                >
                  {isGeneratingPdf ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  PDF
                </button>
                {/* Switch to Flip Book */}
                <button
                  type="button"
                  onClick={() => { setShowSinglePageView(false); setSlideshowActive(false); setShowFlipBook(true); }}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  Flip Book
                </button>
                {/* Close */}
                <button
                  type="button"
                  onClick={() => { setShowSinglePageView(false); setSlideshowActive(false); }}
                  className="rounded-lg bg-white/[0.06] w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Page display area */}
            <div
              className="flex-1 flex items-center justify-center overflow-hidden px-4 py-6 relative cursor-pointer"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                if (isZoomed) { setIsZoomed(false); return; }
              }}
            >
              {/* Spotlight glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[45%] h-[55%] rounded-full bg-indigo-500/[0.03] blur-[100px]" />
              </div>
              {/* Previous page button */}
              <button
                type="button"
                disabled={singlePageIndex === 0}
                onClick={(e) => { e.stopPropagation(); setSlideshowActive(false); setSinglePageIndex(p => Math.max(0, p - 1)); }}
                className="absolute left-4 z-30 group rounded-full bg-black/20 hover:bg-black/50 disabled:opacity-0 disabled:cursor-default p-3.5 text-white/60 hover:text-white transition-all backdrop-blur-sm border border-white/[0.06]"
              >
                <FaChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              {/* Single page — with crossfade animation + zoom */}
              <div
                className={`rounded-xl overflow-hidden page-fade-in transition-transform duration-500 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-default'}`}
                style={{
                  ...(bookOrientation === 'landscape'
                    ? { width: 'min(94vw, calc((100vh - 140px) * 1.4))', height: 'min(calc(100vh - 140px), 94vw / 1.4)', maxWidth: '1400px', maxHeight: 'calc(100vh - 140px)' }
                    : { width: 'min(92vw, calc((100vh - 140px) * 0.77))', height: 'min(calc(100vh - 140px), 92vw / 0.77)', maxWidth: '1100px', maxHeight: 'calc(100vh - 140px)' }),
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1), 0 20px 60px rgba(0,0,0,0.3), 0 40px 100px -20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                }}
                key={singlePageIndex}
                onClick={(e) => { e.stopPropagation(); setIsZoomed(p => !p); }}
              >
                {albumPages[singlePageIndex] && renderPageInner(albumPages[singlePageIndex], 'preview')}
              </div>

              {/* Next page button */}
              <button
                type="button"
                disabled={singlePageIndex >= albumPages.length - 1}
                onClick={(e) => { e.stopPropagation(); setSlideshowActive(false); setSinglePageIndex(p => Math.min(albumPages.length - 1, p + 1)); }}
                className="absolute right-4 z-30 group rounded-full bg-black/20 hover:bg-black/50 disabled:opacity-0 disabled:cursor-default p-3.5 text-white/60 hover:text-white transition-all backdrop-blur-sm border border-white/[0.06]"
              >
                <FaChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Slideshow progress bar */}
              {slideshowActive && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-48">
                  <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ animation: `slideProgress ${slideshowSpeed}ms linear infinite` }}
                    />
                  </div>
                </div>
              )}
              <style>{`@keyframes slideProgress { from { width: 0%; } to { width: 100%; } }`}</style>
            </div>

            {/* Bottom: thumbnail strip + keyboard hints */}
            <div className="bg-black/40 backdrop-blur-md border-t border-white/[0.06] px-4 py-2.5">
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
                {albumPages.map((page, idx) => {
                  const st = pageImages[page.index] ?? {};
                  const thumbSrc = st.imageDataUrls?.[0] ?? st.imageDataUrl;
                  const thumbAspect = bookOrientation === 'landscape' ? { width: 56, height: 40 } : { width: 40, height: 56 };
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setSlideshowActive(false); setSinglePageIndex(idx); }}
                      className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                        idx === singlePageIndex
                          ? 'border-indigo-400 shadow-lg shadow-indigo-500/30 scale-110'
                          : idx < singlePageIndex
                          ? 'border-white/15 opacity-70 hover:opacity-100'
                          : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                      style={thumbAspect}
                    >
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <span className="text-[8px] text-slate-500 font-bold">{page.type === 'cover' ? 'C' : page.type === 'last' ? 'L' : idx + 1}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="hidden sm:flex items-center justify-center gap-4 mt-1.5 text-[9px] text-white/25">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">←</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">→</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Space</kbd> play/pause
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Z</kbd> zoom
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Esc</kbd> close
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {pageImagePickerFor &&
        (() => {
          const pickerPageIdx = pageImagePickerFor.pageIndex;
          const pickerLayout = pageImagePickerFor.layout;
          const isMulti = MULTI_IMAGE_LAYOUTS.includes(pickerLayout);
          const totalSlots = isMulti ? (MULTI_IMAGE_SLOT_COUNT[pickerLayout] ?? 2) : 1;

          const applySinglePick = (picked: { name: string; dataUrl: string; imageId?: number }) => {
            const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
            const imgId = picked.imageId ?? 0;
            setPageImages((prev) => {
              const current = prev[pickerPageIdx] ?? {};
              return {
                ...prev,
                [pickerPageIdx]: {
                  ...current,
                  imageDataUrl: imgUrl,
                  imageDataUrls: undefined,
                  imageIds: imgId ? [imgId] : undefined,
                },
              };
            });
            setPageImagePickerFor(null);
          };

          const applyMultiPick = (picks: { name: string; dataUrl: string; imageId?: number }[]) => {
            setPageImages((prev) => {
              const current = prev[pickerPageIdx] ?? {};
              const newUrls: string[] = [];
              const newIds: number[] = [];
              for (let i = 0; i < totalSlots; i++) {
                const p = picks[i];
                if (p) {
                  newUrls[i] = p.imageId ? buildPreviewUrl(p.imageId) : p.dataUrl;
                  newIds[i] = p.imageId ?? 0;
                } else {
                  const existing = current.imageDataUrls ?? [];
                  newUrls[i] = existing[i] ?? '';
                  newIds[i] = current.imageIds?.[i] ?? 0;
                }
              }
              return {
                ...prev,
                [pickerPageIdx]: {
                  ...current,
                  imageDataUrl: newUrls[0] || '',
                  imageDataUrls: newUrls,
                  imageIds: newIds,
                },
              };
            });
            setPageImagePickerFor(null);
          };

          return createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
              onClick={() => setPageImagePickerFor(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200/80"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Simple header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {isMulti ? `Select ${totalSlots} Photos` : 'Select Photo'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isMulti
                        ? `Choose up to ${totalSlots} images${studioAlbumImageIds ? ' from your album' : ' from your library'}`
                        : `Click an image${studioAlbumImageIds ? ' from your album' : ''} to select it`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPageImagePickerFor(null)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Image picker — multi-select for multi-image layouts */}
                <div className="p-4 overflow-y-auto flex-1">
                  <FileVaultImagePicker
                    allowMultiSelect={isMulti}
                    filterImageIds={studioAlbumImageIds ?? undefined}
                    onPick={async (picked) => {
                      if (!isMulti) {
                        applySinglePick(picked);
                      } else {
                        // Single click in multi mode fills next empty slot
                        const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
                        const imgId = picked.imageId ?? 0;
                        setPageImages((prev) => {
                          const current = prev[pickerPageIdx] ?? {};
                          const existingUrls = [...(current.imageDataUrls ?? (current.imageDataUrl ? [current.imageDataUrl] : []))];
                          const existingIds = [...(current.imageIds ?? [])];
                          while (existingUrls.length < totalSlots) existingUrls.push('');
                          while (existingIds.length < totalSlots) existingIds.push(0);
                          let fillSlot = existingUrls.findIndex((u) => !u);
                          if (fillSlot === -1) fillSlot = 0;
                          existingUrls[fillSlot] = imgUrl;
                          existingIds[fillSlot] = imgId;
                          return {
                            ...prev,
                            [pickerPageIdx]: { ...current, imageDataUrl: existingUrls[0] || imgUrl, imageDataUrls: existingUrls, imageIds: existingIds },
                          };
                        });
                      }
                    }}
                    onPickMany={isMulti ? async (picks) => {
                      applyMultiPick(picks);
                    } : undefined}
                  />
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
};

export default PhotoThemeAlbumBuilderPage;

