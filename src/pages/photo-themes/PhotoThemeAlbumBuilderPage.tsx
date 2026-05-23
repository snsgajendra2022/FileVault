import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import HTMLFlipBook from 'react-pageflip';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import {
  FaSave,
  FaCheck,
  FaSpinner,
  FaArrowLeft,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaSearch,
  FaPlus,
  FaTrash,
  FaImages,
  FaPalette,
  FaStar,
} from 'react-icons/fa';
import { getPhotoBookTemplate } from '../../templates/photobookTemplates';
import { FileVaultImagePicker } from '../../components/PhotoBook/FileVaultImagePicker';
import type { EditablePageState } from './PhotoThemeCategoryPage';
import { getDescriptionTypographyStyle } from './PhotoThemeCategoryPage';
import api from '../../api/client/axiosInstance';
import imageService from '../../api/services/imageService';
import { useAuth } from '../../state/context/AuthContext';
import { getStoredToken } from '../../utils/authUtils';
import React, { useCallback, useMemo, useState } from 'react';
import { ModernAlbumImageLibrary } from 'src/components/PhotoBook/ModernAlbumImageLibrary';

/** Same host as axios — required for `<img src>` on photobook thumbnails. */
function getApiBaseForAssets(): string {
  const env = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const ax = api.defaults.baseURL;
  if (typeof ax === 'string' && ax.trim()) return ax.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function appendPreviewToken(url: string): string {
  const token = getStoredToken();
  if (!token || url.startsWith('data:')) return url;
  if (/[?&]token=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/** Build a reliable preview URL from an image ID */
function buildPreviewUrl(imageId: number): string {
  const base = getApiBaseForAssets();
  return appendPreviewToken(`${base}/api/images/${imageId}/preview`);
}

/** Turn relative backend URLs into absolute ones the browser can render */
function resolveImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  if (/\.enc(\?|$)/i.test(url)) return undefined;
  const idMatch = url.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/i);
  if (idMatch) return buildPreviewUrl(Number(idMatch[1]));
  if (url.startsWith('http://') || url.startsWith('https://')) return appendPreviewToken(url);
  const base = getApiBaseForAssets();
  const path = url.startsWith('/') ? url : `/${url}`;
  return appendPreviewToken(`${base}${path}`);
}

/** Small inline SVGs as data URLs for cover “logo” badges (no network). */
const COVER_DECAL_SVGS: Record<string, string> = {
  cake: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path fill="#fff" d="M32 8c-4 4-8 8-8 14h16c0-6-4-10-8-14z"/><rect x="12" y="28" width="40" height="8" rx="4" fill="#f9a8d4"/><rect x="8" y="36" width="48" height="20" rx="6" fill="#fce7f3"/><path stroke="#fff" stroke-width="2" d="M20 44h24"/></svg>'),
  rings: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="26" cy="36" r="14" fill="none" stroke="#fff" stroke-width="4"/><circle cx="38" cy="36" r="14" fill="none" stroke="#e9d5ff" stroke-width="4"/></svg>'),
  heart: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fda4af" d="M32 54S8 36 8 22a12 12 0 0 1 20-8 12 12 0 0 1 20 8c0 14-24 32-24 32z"/></svg>'),
  balloon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="24" rx="18" ry="22" fill="#93c5fd"/><path stroke="#fff" stroke-width="2" d="M32 46v14"/></svg>'),
  star: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fde047" d="M32 6l8 20h20l-16 12 6 20-18-12-18 12 6-20L6 26h20z"/></svg>'),
};

function buildThemeDefaultCover(slug: string, t: TFunction): EditablePageState {
  const baseStyle: NonNullable<EditablePageState['style']> = {
    fontSize: 28,
    fontWeight: 700,
    align: 'center',
    verticalAlign: 'center',
    headlineColor: '#ffffff',
    subheadlineColor: '#e5e7eb',
    logoPosition: 'top-center',
    logoSize: 56,
  };
  switch (slug) {
    case 'birthday':
    case 'festival':
      return {
        headline: t('defaultBirthdayHeadline'),
        subheadline: t('defaultBirthdaySub'),
        description: t('defaultBirthdayDesc'),
        style: { ...baseStyle, logoDataUrl: COVER_DECAL_SVGS.cake },
      };
    case 'wedding':
      return {
        headline: t('defaultWeddingHeadline'),
        subheadline: t('defaultWeddingSub'),
        description: t('defaultWeddingDesc'),
        style: { ...baseStyle, logoDataUrl: COVER_DECAL_SVGS.rings },
      };
    case 'anniversary':
      return {
        headline: t('defaultAnniversaryHeadline'),
        subheadline: t('defaultAnniversarySub'),
        description: t('defaultAnniversaryDesc'),
        style: { ...baseStyle, logoDataUrl: COVER_DECAL_SVGS.heart },
      };
    default:
      return {
        headline: t('defaultGenericHeadline'),
        subheadline: t('defaultGenericSub'),
        description: t('defaultGenericDesc'),
        style: { ...baseStyle, fontSize: 26, logoDataUrl: COVER_DECAL_SVGS.star },
      };
  }
}

function buildThemeDefaultLast(_slug: string, t: TFunction): EditablePageState {
  return {
    headline: t('defaultLastHeadline'),
    subheadline: t('defaultLastSub'),
    description: t('defaultLastDesc'),
    style: {
      fontSize: 22,
      fontWeight: 600,
      align: 'center',
      verticalAlign: 'center',
      headlineColor: '#ffffff',
      subheadlineColor: '#d1d5db',
      logoDataUrl: COVER_DECAL_SVGS.heart,
      logoPosition: 'bottom-center',
      logoSize: 48,
    },
  };
}

function buildMinimalPresetCover(t: TFunction): EditablePageState {
  return {
    headline: t('presetMinimalHeadline'),
    subheadline: '',
    description: '',
    style: {
      fontSize: 24,
      fontWeight: 600,
      align: 'center',
      verticalAlign: 'center',
      headlineColor: '#ffffff',
      subheadlineColor: '#e5e7eb',
      logoPosition: 'top-center',
      logoSize: 0,
    },
  };
}

function extractImageIdFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = url.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/);
  return match ? Number(match[1]) : null;
}

type AlbumPage = {
  index: number;
  type: 'cover' | 'inner' | 'last';
  layoutName: string;
  /** Flip-book preview only: split front cover into a text leaf then a photo leaf */
  coverSplit?: 'text' | 'image';
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
  coverBlur,
  coverScale,
}: {
  src: string;
  alt?: string;
  cropPos?: CropPos;
  onCropChange?: (pos: CropPos) => void;
  className?: string;
  /** Album cover/last: match category editor photo-side blur */
  coverBlur?: boolean;
  /** Album cover/last: `imageScale` / API `imageZoom` */
  coverScale?: number;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeAlbumBuilderPage' });
  const pos = cropPos ?? { x: 50, y: 50 };
  const imgRef = React.useRef<HTMLImageElement>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; startPos: CropPos } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [livePos, setLivePos] = useState(pos);
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
        className={`absolute inset-0 w-full h-full object-cover select-none${coverBlur ? ' blur-sm' : ''}`}
        style={{
          objectPosition: `${livePos.x}% ${livePos.y}%`,
          cursor: onCropChange ? (dragging ? 'grabbing' : 'grab') : undefined,
          ...(coverScale != null && coverScale !== 1
            ? { transform: `scale(${coverScale})`, transformOrigin: 'center center' }
            : {}),
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {onCropChange && !dragging && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-1 opacity-0 group-hover/crop:opacity-100 transition-opacity pointer-events-none z-10">
          <span className="text-[9px] font-semibold text-white bg-black/50 rounded-full px-2 py-0.5 backdrop-blur-sm">
            {t('dragToReposition')}
          </span>
        </div>
      )}
    </div>
  );
}

/** Arrangement type: drives how slots are positioned (single, grid, hero, luxury, etc.) */
type LayoutArrangement =
  | 'single'
  | 'cinematic'
  | 'two-up'
  | 'two-vertical'
  | 'hero-two'
  | 'hero-four'
  | 'hero-left'
  | 'hero-right'
  | 'hero-top'
  | 'hero-bottom'
  | 'three-grid'
  | 'three-stack'
  | 'three-diagonal'
  | 'four-grid'
  | 'four-split'
  | 'four-collage'
  | 'collage'
  | 'five-hero'
  | 'six-grid'
  | 'film-strip'
  | 'polaroid'
  | 'timeline'
  | 'magazine'
  | 'romantic'
  | 'luxury'
  | 'luxury-cover'
  | 'luxury-inner'
  | 'memory'
  | 'story'
  | 'diagonal'
  | 'circle-focus'

type LayoutSlotRect = { x: number; y: number; width: number; height: number };

/** Single source of truth for page layout options — one unique layout per arrangement, no duplicates */
const PAGE_LAYOUT_CONFIG: Array<{ id: string; shortLabel: string; slotCount: number; arrangement?: LayoutArrangement }> = [
  // —— 1 photo (2 distinct styles) ——
  { id: 'Single Full Bleed', shortLabel: 'Full bleed', slotCount: 1, arrangement: 'single' },
  { id: 'Cinematic Love', shortLabel: 'Cinematic', slotCount: 1, arrangement: 'cinematic' },
  // —— 2 photos (2 distinct styles) ——
  { id: 'Love Side by Side', shortLabel: 'Side by side', slotCount: 2, arrangement: 'two-up' },
  { id: 'Bride & Groom', shortLabel: 'Stacked', slotCount: 2, arrangement: 'two-vertical' },
  // —— 3 photos (3 distinct styles) ——
  { id: 'Hero + Memories', shortLabel: 'Hero + two', slotCount: 3, arrangement: 'hero-two' },
  { id: 'Three Grid', shortLabel: 'Three grid', slotCount: 3, arrangement: 'three-grid' },
  { id: 'Romantic Collage', shortLabel: 'Romantic collage', slotCount: 3, arrangement: 'collage' },
  // —— 4 photos (4 distinct styles) ——
  { id: 'Wedding Grid', shortLabel: 'Classic grid', slotCount: 4, arrangement: 'four-grid' },
  { id: 'Memory Collage', shortLabel: 'Overlap collage', slotCount: 4, arrangement: 'collage' },
  { id: 'Luxury Cover', shortLabel: 'Luxury cover', slotCount: 4, arrangement: 'luxury-cover' },
  { id: 'Cinematic Inner', shortLabel: 'Hero + three', slotCount: 4, arrangement: 'luxury-inner' },
  // —— 5 photos (1 style) ——
  { id: 'Hero Wedding Story', shortLabel: 'Hero + four', slotCount: 5, arrangement: 'hero-four' },
  // —— 6 photos (1 style) ——
  { id: 'Memories Spread', shortLabel: 'Six grid', slotCount: 6, arrangement: 'six-grid' },
  // Legacy IDs (backward compatibility for saved albums)
  { id: 'Single Photo', shortLabel: 'Single', slotCount: 1, arrangement: 'single' },
  { id: 'Hero + Two', shortLabel: 'Hero', slotCount: 3, arrangement: 'hero-two' },
  { id: 'Two Up', shortLabel: 'Two up', slotCount: 2, arrangement: 'two-up' },
  { id: 'Four Grid', shortLabel: 'Grid 4', slotCount: 4, arrangement: 'four-grid' },
  { id: 'Cinematic Spread', shortLabel: 'Cinema', slotCount: 1, arrangement: 'cinematic' },
  { id: 'Collage', shortLabel: 'Collage', slotCount: 3, arrangement: 'collage' },
];

/** Optional JSON-style geometry for layouts (percent-based positions) */
const LAYOUT_GEOMETRY: Record<string, LayoutSlotRect[]> = {
  // 1-slot layouts: full page
  'Single Full Bleed': [{ x: 0, y: 0, width: 100, height: 100 }],
  'Single Photo': [{ x: 0, y: 0, width: 100, height: 100 }],
  'Cinematic Love': [{ x: 5, y: 30, width: 90, height: 40 }],
  'Cinematic Spread': [{ x: 5, y: 30, width: 90, height: 40 }],

  // 2-slot layouts: side‑by‑side and stacked
  'Love Side by Side': [
    { x: 0, y: 0, width: 50, height: 100 },
    { x: 50, y: 0, width: 50, height: 100 },
  ],
  'Two Up': [
    { x: 0, y: 0, width: 50, height: 100 },
    { x: 50, y: 0, width: 50, height: 100 },
  ],
  'Bride & Groom': [
    { x: 0, y: 0, width: 100, height: 50 },
    { x: 0, y: 50, width: 100, height: 50 },
  ],

  // 3-slot simple grid / hero layouts
  'Three Grid': [
    { x: 0, y: 0, width: 50, height: 100 },
    { x: 50, y: 0, width: 50, height: 50 },
    { x: 50, y: 50, width: 50, height: 50 },
  ],
  'Hero + Memories': [
    { x: 0, y: 0, width: 100, height: 60 },
    { x: 0, y: 60, width: 50, height: 40 },
    { x: 50, y: 60, width: 50, height: 40 },
  ],
  'Hero + Two': [
    { x: 0, y: 0, width: 100, height: 60 },
    { x: 0, y: 60, width: 50, height: 40 },
    { x: 50, y: 60, width: 50, height: 40 },
  ],
  'Romantic Collage': [
    { x: 4, y: 6, width: 52, height: 58 },
    { x: 44, y: 40, width: 52, height: 58 },
    { x: 25, y: 20, width: 50, height: 55 },
  ],
  'Collage': [
    { x: 4, y: 6, width: 52, height: 58 },
    { x: 44, y: 40, width: 52, height: 58 },
    { x: 25, y: 20, width: 50, height: 55 },
  ],

  // 4-slot grid layouts
  'Wedding Grid': [
    { x: 0, y: 0, width: 50, height: 50 },
    { x: 50, y: 0, width: 50, height: 50 },
    { x: 0, y: 50, width: 50, height: 50 },
    { x: 50, y: 50, width: 50, height: 50 },
  ],
  'Four Grid': [
    { x: 0, y: 0, width: 50, height: 50 },
    { x: 50, y: 0, width: 50, height: 50 },
    { x: 0, y: 50, width: 50, height: 50 },
    { x: 50, y: 50, width: 50, height: 50 },
  ],
  'Memory Collage': [
    { x: 0, y: 0, width: 50, height: 50 },
    { x: 50, y: 0, width: 50, height: 50 },
    { x: 0, y: 50, width: 50, height: 50 },
    { x: 50, y: 50, width: 50, height: 50 },
  ],
  'Luxury Cover': [
    { x: 0, y: 0, width: 38, height: 33 },
    { x: 0, y: 33, width: 38, height: 33 },
    { x: 0, y: 66, width: 38, height: 34 },
    { x: 40, y: 0, width: 60, height: 100 },
  ],
  'Cinematic Inner': [
    { x: 0, y: 0, width: 100, height: 58 },
    { x: 0, y: 60, width: 33, height: 40 },
    { x: 33, y: 60, width: 34, height: 40 },
    { x: 67, y: 60, width: 33, height: 40 },
  ],

  // 6-slot grid
  'Memories Spread': [
    { x: 0, y: 0, width: 33, height: 50 },
    { x: 33, y: 0, width: 34, height: 50 },
    { x: 67, y: 0, width: 33, height: 50 },
    { x: 0, y: 50, width: 33, height: 50 },
    { x: 33, y: 50, width: 34, height: 50 },
    { x: 67, y: 50, width: 33, height: 50 },
  ],
};

const PAGE_LAYOUT_OPTIONS = PAGE_LAYOUT_CONFIG.map((c) => c.id);

/** i18n keys for layout short labels (matches PAGE_LAYOUT_CONFIG ids) */
const LAYOUT_SHORT_TKEY: Record<string, string> = {
  'Single Full Bleed': 'layoutFullBleed',
  'Cinematic Love': 'layoutCinematic',
  'Love Side by Side': 'layoutSideBySide',
  'Bride & Groom': 'layoutStacked',
  'Hero + Memories': 'layoutHeroTwo',
  'Three Grid': 'layoutThreeGrid',
  'Romantic Collage': 'layoutRomanticCollage',
  'Wedding Grid': 'layoutClassicGrid',
  'Memory Collage': 'layoutOverlapCollage',
  'Luxury Cover': 'layoutLuxuryCover',
  'Cinematic Inner': 'layoutHeroThree',
  'Hero Wedding Story': 'layoutHeroFour',
  'Memories Spread': 'layoutSixGrid',
  'Single Photo': 'layoutSingle',
  'Hero + Two': 'layoutHeroTwo',
  'Two Up': 'layoutTwoUp',
  'Four Grid': 'layoutGrid4',
  'Cinematic Spread': 'layoutCinema',
  'Collage': 'layoutCollage',
};

/** Get arrangement for a layout id (for rendering); falls back to slotCount-based default */
function getArrangementForLayoutId(layoutId: string): LayoutArrangement {
  const config = PAGE_LAYOUT_CONFIG.find((c) => c.id === layoutId);
  if (config?.arrangement) return config.arrangement;
  const slotCount = getSlotCountForLayoutId(layoutId);
  if (slotCount <= 1) return 'single';
  if (slotCount === 2) return 'two-up';
  if (slotCount === 3) return 'hero-two';
  if (slotCount === 4) return 'four-grid';
  if (slotCount === 5) return 'hero-four';
  if (slotCount === 6) return 'six-grid';
  return 'six-grid';
}

/** Get slot count for a layout id */
function getSlotCountForLayoutId(layoutId: string): number {
  const config = PAGE_LAYOUT_CONFIG.find((c) => c.id === layoutId);
  if (config) return config.slotCount;
  return 1;
}

/** Multi-image layouts: any config with slotCount > 1 (for picker logic) */
const MULTI_IMAGE_LAYOUTS = PAGE_LAYOUT_OPTIONS;
const MULTI_IMAGE_SLOT_COUNT: Record<string, number> = PAGE_LAYOUT_CONFIG.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.slotCount }),
  {} as Record<string, number>
);

/** Dynamic layout thumbnail: shows current page images by arrangement */
function LayoutOptionThumb({
  layoutId,
  slotCount,
  urls,
  isActive,
  className = '',
}: {
  layoutId: string;
  slotCount: number;
  urls: string[];
  isActive: boolean;
  className?: string;
}) {
  const arrangement = getArrangementForLayoutId(layoutId);
  const getSlotSrc = (i: number) => urls[i] ?? urls[0] ?? '';
  const placeholder = (
    <div className="w-full h-full bg-slate-200/80 rounded-[2px] flex items-center justify-center">
      <svg className="w-1/2 h-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    </div>
  );
  const slot = (i: number, extraClass = '') => {
    const src = getSlotSrc(i);
    return (
      <div key={i} className={`overflow-hidden rounded-[3px] bg-slate-100 ${extraClass}`}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : placeholder}
      </div>
    );
  };

  let inner: React.ReactNode;
  switch (arrangement) {
    case 'two-up':
      inner = (
        <div className="w-full h-full flex gap-[2px]">
          {slot(0, 'flex-1')}
          {slot(1, 'flex-1')}
        </div>
      );
      break;
    case 'two-vertical':
      inner = (
        <div className="w-full h-full flex flex-col gap-[2px]">
          {slot(0, 'flex-1')}
          {slot(1, 'flex-1')}
        </div>
      );
      break;
    case 'three-grid':
      inner = (
        <div className="w-full h-full grid gap-[2px]" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
          <div className="row-span-2 overflow-hidden rounded-[3px] bg-slate-100">{getSlotSrc(0) ? <img src={getSlotSrc(0)} alt="" className="w-full h-full object-cover" /> : placeholder}</div>
          {slot(1)}
          {slot(2)}
        </div>
      );
      break;
    case 'hero-two':
      inner = (
        <div className="w-full h-full grid gap-[2px]" style={{ gridTemplateRows: '1.5fr 1fr' }}>
          {slot(0, 'min-h-0')}
          <div className="grid grid-cols-2 gap-[2px] min-h-0">
            {slot(1)}
            {slot(2)}
          </div>
        </div>
      );
      break;
    case 'four-grid':
      inner = (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
          {[0, 1, 2, 3].map((i) => slot(i))}
        </div>
      );
      break;
    case 'collage':
      inner = (
        <div className="w-full h-full relative">
          {[
            { i: 0, cls: 'absolute top-0 left-0 w-[55%] h-[60%] rounded-[3px] overflow-hidden bg-slate-100' },
            { i: 1, cls: 'absolute bottom-0 right-0 w-[55%] h-[60%] rounded-[3px] overflow-hidden bg-slate-100' },
            { i: 2, cls: 'absolute inset-0 m-auto w-[50%] h-[50%] z-10 rounded-[3px] overflow-hidden bg-slate-100' },
          ].map(({ i, cls }) => (
            <div key={i} className={cls}>
              {getSlotSrc(i) ? <img src={getSlotSrc(i)} alt="" className="w-full h-full object-cover" /> : placeholder}
            </div>
          ))}
        </div>
      );
      break;
    case 'cinematic':
      inner = (
        <div className="w-full h-full bg-slate-800 rounded-[3px] flex items-center justify-center p-[3px]">
          <div className="w-full rounded-[2px] overflow-hidden bg-slate-100" style={{ height: '42%' }}>
            {getSlotSrc(0) ? <img src={getSlotSrc(0)} alt="" className="w-full h-full object-cover" /> : placeholder}
          </div>
        </div>
      );
      break;
    case 'luxury-cover':
      inner = (
        <div className="w-full h-full flex gap-[2px]">
          <div className="w-[38%] flex flex-col gap-[2px]">
            {slot(0)}
            {slot(1)}
            {slot(2)}
          </div>
          <div className="flex-1 min-w-0">{slot(3, 'w-full h-full')}</div>
        </div>
      );
      break;
    case 'luxury-inner':
      inner = (
        <div className="w-full h-full grid gap-[2px]" style={{ gridTemplateRows: '1.4fr 1fr' }}>
          {slot(0, 'min-h-0')}
          <div className="grid grid-cols-3 gap-[2px] min-h-0">
            {slot(1)}
            {slot(2)}
            {slot(3)}
          </div>
        </div>
      );
      break;
    case 'hero-four':
      inner = (
        <div className="w-full h-full grid gap-[2px]" style={{ gridTemplateRows: '1.2fr 1fr' }}>
          {slot(0, 'min-h-0')}
          <div className="grid grid-cols-4 gap-[2px] min-h-0">
            {[1, 2, 3, 4].map((i) => slot(i))}
          </div>
        </div>
      );
      break;
    case 'six-grid':
      inner = (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-[2px]">
          {[0, 1, 2, 3, 4, 5].map((i) => slot(i))}
        </div>
      );
      break;
    default:
      inner = slot(0, 'w-full h-full');
  }

  return (
    <div
      className={`w-full h-full min-h-[36px] rounded-[4px] overflow-hidden border border-slate-200/80 ${isActive ? 'ring-2 ring-amber-500/80 ring-offset-1 border-amber-400/60' : ''} ${className}`}
    >
      {inner}
    </div>
  );
}

/** Single slot in the album editor: draggable when filled, droppable, click to add/replace */
function AlbumSlotCard({
  id,
  slotIndex,
  url,
  label,
  onOpenPicker,
  onRemove,
}: {
  id: string;
  slotIndex: number;
  url: string | undefined;
  label: string;
  onOpenPicker: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeAlbumBuilderPage' });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id,
    data: { slotIndex },
    disabled: !url,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, data: { slotIndex } });
  const setRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };
  return (
    <div
      ref={setRef}
      className={`relative flex flex-col rounded-xl overflow-hidden transition-all border-2 flex-shrink-0 group/slot ${url
          ? 'border-amber-200/80 bg-white shadow-md hover:shadow-lg cursor-grab active:cursor-grabbing'
          : 'border-dashed border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100 cursor-pointer'
        } ${isDragging ? 'opacity-60 z-50' : ''} ${isOver ? 'ring-2 ring-amber-400 ring-offset-2 bg-amber-50/50' : ''}`}
      style={{ width: 88, minWidth: 88, height: 88 }}
      onClick={() => !url && onOpenPicker()}
    >
      <div className="absolute top-1 left-1.5 z-10">
        <span className="text-[10px] font-bold text-white/90 bg-black/40 rounded-md px-1.5 py-0.5">{label}</span>
      </div>
      {url ? (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); onOpenPicker(); }}
            title={t('clickReplaceDragSwap')}
          >
            <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
            <div
              className="absolute inset-0 bg-black/0 group-hover/slot:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/slot:opacity-100 gap-2"
              {...(attributes as object)}
              {...(listeners as object)}
            >
              <span className="text-[10px] font-semibold text-white bg-black/50 rounded-lg px-2 py-1">{t('dragToSwap')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 shadow opacity-0 group-hover/slot:opacity-100 transition-opacity"
            aria-label={t('removePhotoAria')}
          >
            ×
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-1" onClick={onOpenPicker}>
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="text-[10px] font-semibold text-slate-500">{t('addPhoto')}</span>
        </div>
      )}
    </div>
  );
}

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
  } catch (_) { }
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

/** GET /api/photobooks/:id/pages may embed covers alongside `pages`. */
type PhotobookPagesApiResponse = {
  pages?: ApiAlbumPageResponse[];
  total?: number;
  photobookId?: number;
  templateId?: number;
  userId?: number;
  frontCover?: Record<string, unknown>;
  backCover?: Record<string, unknown>;
};

function hexToRgbaAlbum(hex: string, alpha: number): string {
  const h = hex.replace('#', '').slice(0, 6);
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Text-side flip, glass, overlays — same contract as PhotoThemeCategoryPage /api/photobooks/:id/covers */
function mergeCoverLeafStyleFromApi(side: Record<string, unknown>): Partial<NonNullable<EditablePageState['style']>> {
  const o: Partial<NonNullable<EditablePageState['style']>> = {};
  const set = (k: keyof NonNullable<EditablePageState['style']>, v: unknown) => {
    if (v !== undefined && v !== null) (o as Record<string, unknown>)[k as string] = v;
  };
  set('textLeafBgMode', side.textLeafBgMode);
  set('textLeafBgGradient', side.textLeafBgGradient);
  set('textLeafBgImageUrl', side.textLeafBgImageUrl);
  set('textLeafBgImageId', side.textLeafBgImageId);
  set('textPanelBlurPx', side.textPanelBlurPx);
  set('textPanelGlassOpacity', side.textPanelGlassOpacity);
  set('textPanelGlassColor', side.textPanelGlassColor);
  set('letterSpacing', side.letterSpacing);
  set('lineHeight', side.lineHeight);
  set('textShadow', side.textShadow);
  set('dividerEnabled', side.dividerEnabled);
  set('dividerWidth', side.dividerWidth);
  set('dividerColor', side.dividerColor);
  set('logoPositionX', side.logoPositionX);
  set('logoPositionY', side.logoPositionY);
  set('descriptionFontSize', side.descriptionFontSize);
  set('descriptionColor', side.descriptionColor);
  set('descriptionFontWeight', side.descriptionFontWeight);
  set('descriptionLineHeight', side.descriptionLineHeight);
  set('descriptionLetterSpacing', side.descriptionLetterSpacing);
  set('descriptionFontFamily', side.descriptionFontFamily);
  set('descriptionAlign', side.descriptionAlign);
  if (side.textSideOverlays != null) set('textSideOverlays', side.textSideOverlays);
  const raw = side.coverStyleExtrasJson;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        Object.assign(o, mergeCoverLeafStyleFromApi(parsed));
      }
    } catch {
      /* ignore */
    }
  }
  return o;
}

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
  const [searchParams] = useSearchParams();
  const location = useLocation() as {
    state?: {
      coverPage?: EditablePageState;
      lastPage?: EditablePageState;
      dbTemplateId?: number;
      templateId?: number;
      photobookId?: number;
      fromStudioAlbum?: boolean;
      albumImageIds?: number[];
      albumName?: string;
      /** When set from PhotoBook page: open preview in big view (flip or page) */
      openPreview?: 'flip' | 'page';
    };
  };
 const [customLayouts, setCustomLayouts] = useState<
            Array<{ id: string; shortLabel: string; slotCount: number; geometry: LayoutSlotRect[] }>
          >([]);
  const [showLayoutCreator, setShowLayoutCreator] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutSlotCount, setNewLayoutSlotCount] = useState(4);

  const [layoutStudioSlots, setLayoutStudioSlots] = useState<LayoutSlotRect[]>([
    { x: 4, y: 5, width: 58, height: 90 },
    { x: 66, y: 5, width: 30, height: 27 },
    { x: 66, y: 36, width: 30, height: 27 },
    { x: 66, y: 67, width: 30, height: 28 },
  ]);

  const [activeLayoutSlot, setActiveLayoutSlot] = useState<number | null>(0);
  const [layoutStudioBg, setLayoutStudioBg] = useState('linear-gradient(135deg,#ffffff,#f8fafc)');
  const [layoutStudioBgImage, setLayoutStudioBgImage] = useState('');
  const [layoutStudioRadius, setLayoutStudioRadius] = useState(14);
  const [layoutStudioShadow, setLayoutStudioShadow] = useState(true);


  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeAlbumBuilderPage' });

  const layoutShort = React.useCallback(
    (id: string) => t(LAYOUT_SHORT_TKEY[id] || 'layoutSingle'),
    [t],
  );

  const STUDIO_ALBUM_KEY = `studioAlbum_${categorySlug}`;

const customLayoutGeometry = useMemo(() => {
  return customLayouts.reduce((acc, layout) => {
    acc[layout.id] = layout.geometry;
    return acc;
  }, {} as Record<string, LayoutSlotRect[]>);
}, [customLayouts]);

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
    if (location.state?.dbTemplateId != null) {
      const n = Number(location.state.dbTemplateId);
      if (!Number.isNaN(n)) return n;
    }
    if (location.state?.templateId != null) {
      const n = Number(location.state.templateId);
      if (!Number.isNaN(n)) return n;
    }
    const q = searchParams.get('templateId');
    if (q != null && q !== '') {
      const n = Number(q);
      if (!Number.isNaN(n)) return n;
    }
    return getStoredPhotobook()?.templateId ?? null;
  };

  const getInitialPhotobookId = (): number | null => {
    if (location.state?.photobookId != null) {
      const n = Number(location.state.photobookId);
      if (!Number.isNaN(n)) return n;
    }
    const q = searchParams.get('photobookId');
    if (q != null && q !== '') {
      const n = Number(q);
      if (!Number.isNaN(n)) return n;
    }
    return getStoredPhotobook()?.photobookId ?? null;
  };

  const [dbTemplateId, setDbTemplateId] = useState<number | null>(getInitialTemplateId);
  const [photobookId, setPhotobookId] = useState<number | null>(getInitialPhotobookId);





  // When navigating (e.g. Edit from Photo Book), sync from location state so we load the correct album
  React.useEffect(() => {
    const fromState = location.state as {
      photobookId?: number;
      dbTemplateId?: number;
      templateId?: number;
    } | null;
    if (fromState?.photobookId != null) setPhotobookId(Number(fromState.photobookId));
    if (fromState?.dbTemplateId != null) setDbTemplateId(Number(fromState.dbTemplateId));
    if (fromState?.templateId != null) setDbTemplateId(Number(fromState.templateId));
  }, [location.state?.photobookId, location.state?.dbTemplateId, location.state?.templateId]);

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

  // Event / API-generated books: deep link with ?photobookId= only — resolve template from the photobook row.
  React.useEffect(() => {
    if (!photobookId || dbTemplateId != null || !user?.id) return;
    const fill = async () => {
      try {
        const token = getStoredToken();
        const r = await api.get<{ templateId?: number }>(`/api/photobooks/${photobookId}`, {
          headers: { ...(token ? { 'X-API-KEY': token } : {}) },
        });
        if (r.data?.templateId != null) setDbTemplateId(Number(r.data.templateId));
      } catch {
        /* ignore */
      }
    };
    fill();
  }, [photobookId, dbTemplateId, user?.id]);

  // Recover photobookId + templateId from API when neither deep link nor storage gave a book id
  // (skip when photobookId is set but template missing — filled by GET /api/photobooks/:id above).
  React.useEffect(() => {
    if (!user?.id || !categorySlug) return;
    if (photobookId && dbTemplateId) return;
    if (photobookId && !dbTemplateId) return;

    const recover = async () => {
      try {
        const token = getStoredToken();
        const res = await api.get(`/api/photobooks/by-category/${categorySlug}`, {
          headers: { ...(token ? { 'X-API-KEY': token } : {}) },
        });
        const list = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        const latest = list[0];
        if (latest?.templateId) {
          if (dbTemplateId == null) setDbTemplateId(latest.templateId);
          if (photobookId == null) setPhotobookId(latest.id);
        }
      } catch {
        console.warn('No saved photobook found for category:', categorySlug);
      }
    };
    recover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, categorySlug, photobookId, dbTemplateId]);

  const [effectiveCover, setEffectiveCover] = useState<EditablePageState | undefined>(() => {
    const fromLoc = location.state?.coverPage;
    if (fromLoc) return fromLoc;
    const stored = categorySlug ? getStoredCoverLast(categorySlug) : null;
    return stored?.coverPage ?? undefined;
  });
  const [effectiveLast, setEffectiveLast] = useState<EditablePageState | undefined>(() => {
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
  const [pageCount, setPageCount] = useState<number>(() =>
    Math.min(18, Math.max(6, basePages.length || 6)),
  );

  // Keep pageCount in sync if basePages length changes (new albums only; editing uses saved length)
  React.useEffect(() => {
    if (!basePages.length || photobookId) return;
    setPageCount((prev) => {
      const min = 6;
      const max = 18;
      const baseDefault = Math.max(min, basePages.length);
      const next = prev || baseDefault;
      return Math.min(max, Math.max(min, next));
    });
  }, [basePages.length, photobookId]);

  const albumPages: AlbumPage[] = React.useMemo(() => {
    if (!basePages.length) return [];

    const min = 6;
    const max = 18;
    // Allow 1–18 so loaded albums with fewer pages (e.g. 3) display correctly
    const target = Math.min(max, Math.max(1, pageCount));

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

  /** Flip modal: cover + back cover behave as 2 leaves (text then photo). Editor/PDF still use `albumPages`. */
  const flipBookAlbumPages: AlbumPage[] = React.useMemo(() => {
    if (!albumPages.length) return albumPages;
    const first = albumPages[0];
    const last = albumPages[albumPages.length - 1];
    if (first?.type !== 'cover' || last?.type !== 'last') return albumPages;

    const middle = albumPages.slice(1, -1);
    return [
      { ...first, coverSplit: 'text' },
      { ...first, coverSplit: 'image' },
      ...middle,
      { ...last, coverSplit: 'image' },
      { ...last, coverSplit: 'text' },
    ];
  }, [albumPages]);

  const [pageImages, setPageImages] = useState<Record<number, PageImageState>>({});
  const [pageLayouts, setPageLayouts] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [layoutQuickFilter, setLayoutQuickFilter] = useState<number | 'all'>('all');
  const prevPhotobookIdRef = React.useRef(photobookId);
  React.useEffect(() => {
    if (prevPhotobookIdRef.current !== photobookId) {
      prevPhotobookIdRef.current = photobookId;
      setPageImages({});
      setPageLayouts({});
      setCurrentStep(0);
    }
  }, [photobookId]);
  const [showFlipBook, setShowFlipBook] = useState(false);
  const [showSinglePageView, setShowSinglePageView] = useState(false);
  const [singlePageIndex, setSinglePageIndex] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingFlipbook, setIsGeneratingFlipbook] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [isGeneratingBase64, setIsGeneratingBase64] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowSpeed, setSlideshowSpeed] = useState(4000);
  const [isZoomed, setIsZoomed] = useState(false);
  const [flipBookPage, setFlipBookPage] = useState(0);
  const flipBookRef = React.useRef<any>(null);
  /** After opening the modal, optionally jump to this page index (single-view → flip, or 0 on fresh open). */
  const flipOpenTargetRef = React.useRef<number | null>(null);
  const stepperRef = React.useRef<HTMLDivElement>(null);
  const slotDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  type BookOrientation = 'landscape' | 'portrait';
  const [bookOrientation, setBookOrientation] = useState<BookOrientation>(
    () => (typeof window !== 'undefined' && window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
  );
  const [pageImagePickerFor, setPageImagePickerFor] = useState<{
    pageIndex: number;
    layout: string;
    slotIndex?: number; // if set, replace this specific slot; otherwise fill next empty
  } | null>(null);

  // Color theme options for Anniversary theme (translated labels)
  const anniversaryColorThemes = React.useMemo(
    () => [
      { id: 'red-pink', nameKey: 'annivRedPink' as const, colors: ['rgba(220, 38, 38, 0.18)', 'rgba(236, 72, 153, 0.15)', 'rgba(219, 39, 119, 0.12)', 'rgba(251, 113, 133, 0.15)', 'rgba(239, 68, 68, 0.18)'], accent: ['rgba(251, 146, 60, 0.1)', 'rgba(244, 114, 182, 0.1)'], base: '#fef2f2', heartColors: ['text-red-400', 'text-pink-400', 'text-red-500', 'text-pink-500'] },
      { id: 'purple-violet', nameKey: 'annivPurpleViolet' as const, colors: ['rgba(139, 92, 246, 0.18)', 'rgba(168, 85, 247, 0.15)', 'rgba(147, 51, 234, 0.12)', 'rgba(192, 132, 252, 0.15)', 'rgba(124, 58, 237, 0.18)'], accent: ['rgba(196, 181, 253, 0.1)', 'rgba(221, 214, 254, 0.1)'], base: '#faf5ff', heartColors: ['text-purple-400', 'text-violet-400', 'text-purple-500', 'text-violet-500'] },
      { id: 'rose-gold', nameKey: 'annivRoseGold' as const, colors: ['rgba(225, 29, 72, 0.18)', 'rgba(251, 146, 60, 0.15)', 'rgba(244, 63, 94, 0.12)', 'rgba(252, 165, 165, 0.15)', 'rgba(217, 119, 6, 0.18)'], accent: ['rgba(253, 186, 116, 0.1)', 'rgba(254, 215, 170, 0.1)'], base: '#fff1f2', heartColors: ['text-rose-400', 'text-amber-400', 'text-rose-500', 'text-orange-400'] },
      { id: 'coral-peach', nameKey: 'annivCoralPeach' as const, colors: ['rgba(249, 115, 22, 0.18)', 'rgba(251, 146, 60, 0.15)', 'rgba(234, 88, 12, 0.12)', 'rgba(253, 186, 116, 0.15)', 'rgba(239, 68, 68, 0.18)'], accent: ['rgba(254, 215, 170, 0.1)', 'rgba(255, 237, 213, 0.1)'], base: '#fff7ed', heartColors: ['text-orange-400', 'text-amber-400', 'text-orange-500', 'text-red-400'] },
      { id: 'lavender', nameKey: 'annivLavender' as const, colors: ['rgba(167, 139, 250, 0.18)', 'rgba(196, 181, 253, 0.15)', 'rgba(139, 92, 246, 0.12)', 'rgba(221, 214, 254, 0.15)', 'rgba(124, 58, 237, 0.18)'], accent: ['rgba(237, 233, 254, 0.1)', 'rgba(243, 240, 253, 0.1)'], base: '#f5f3ff', heartColors: ['text-purple-300', 'text-violet-300', 'text-purple-400', 'text-indigo-400'] },
      { id: 'deep-pink', nameKey: 'annivDeepPink' as const, colors: ['rgba(219, 39, 119, 0.18)', 'rgba(236, 72, 153, 0.15)', 'rgba(190, 24, 93, 0.12)', 'rgba(244, 114, 182, 0.15)', 'rgba(157, 23, 77, 0.18)'], accent: ['rgba(249, 168, 212, 0.1)', 'rgba(252, 211, 243, 0.1)'], base: '#fdf2f8', heartColors: ['text-pink-500', 'text-rose-500', 'text-pink-600', 'text-rose-600'] },
      { id: 'burgundy', nameKey: 'annivBurgundy' as const, colors: ['rgba(185, 28, 28, 0.18)', 'rgba(220, 38, 38, 0.15)', 'rgba(153, 27, 27, 0.12)', 'rgba(239, 68, 68, 0.15)', 'rgba(127, 29, 29, 0.18)'], accent: ['rgba(254, 202, 202, 0.1)', 'rgba(252, 165, 165, 0.1)'], base: '#fef2f2', heartColors: ['text-red-600', 'text-red-500', 'text-red-700', 'text-red-400'] },
      { id: 'blush', nameKey: 'annivBlush' as const, colors: ['rgba(251, 113, 133, 0.18)', 'rgba(244, 114, 182, 0.15)', 'rgba(236, 72, 153, 0.12)', 'rgba(249, 168, 212, 0.15)', 'rgba(219, 39, 119, 0.18)'], accent: ['rgba(252, 211, 243, 0.1)', 'rgba(253, 224, 71, 0.08)'], base: '#fdf2f8', heartColors: ['text-pink-300', 'text-rose-300', 'text-pink-400', 'text-rose-400'] },
    ].map((row) => ({ ...row, name: t(row.nameKey) })),
    [t],
  );

  // Wedding theme – image background options for album pages
  const weddingBackgroundThemes = React.useMemo(
    () => [
      { id: 'ivory-classic', nameKey: 'wedIvoryClassic' as const, base: '#fffff5', gradient: 'linear-gradient(160deg, #fffff5 0%, #faf8f0 50%, #f5f0e6 100%)' },
      { id: 'blush-rose', nameKey: 'wedBlushRose' as const, base: '#fdf2f4', gradient: 'linear-gradient(160deg, #fdf2f4 0%, #fce7eb 50%, #fadde2 100%)' },
      { id: 'gold-cream', nameKey: 'wedGoldCream' as const, base: '#fefce8', gradient: 'linear-gradient(160deg, #fefce8 0%, #fef9c3 40%, #fde68a 100%)' },
      { id: 'lavender-dream', nameKey: 'wedLavenderDream' as const, base: '#f5f3ff', gradient: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' },
      { id: 'sage-cream', nameKey: 'wedSageCream' as const, base: '#f0fdf4', gradient: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #bbf7d0 60%)' },
      { id: 'champagne', nameKey: 'wedChampagne' as const, base: '#fffbeb', gradient: 'linear-gradient(160deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' },
      { id: 'pearl-white', nameKey: 'wedPearlWhite' as const, base: '#fafafa', gradient: 'linear-gradient(160deg, #fafafa 0%, #f4f4f5 50%, #e4e4e7 100%)' },
      { id: 'dusty-pink', nameKey: 'wedDustyPink' as const, base: '#fdf4f3', gradient: 'linear-gradient(160deg, #fdf4f3 0%, #fce7e5 50%, #f9d5d2 100%)' },
      { id: 'mint-ivory', nameKey: 'wedMintIvory' as const, base: '#f0fdf9', gradient: 'linear-gradient(160deg, #f0fdf9 0%, #ccfbf1 40%, #99f6e4 70%)' },
    ].map((row) => ({ ...row, name: t(row.nameKey) })),
    [t],
  );

  const [selectedColorTheme, setSelectedColorTheme] = useState<string>('red-pink');
  const [selectedWeddingBackground, setSelectedWeddingBackground] = useState<string>('ivory-classic');

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const themeDefaultsAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!categorySlug || isLoading) return;
    if (location.state?.coverPage) {
      themeDefaultsAppliedRef.current = true;
      return;
    }
    if (themeDefaultsAppliedRef.current) return;

    setEffectiveCover((prev) => {
      if (prev?.headline?.trim()) {
        themeDefaultsAppliedRef.current = true;
        return prev;
      }
      themeDefaultsAppliedRef.current = true;
      return buildThemeDefaultCover(categorySlug, t);
    });
    setEffectiveLast((prev) => {
      if (prev?.headline?.trim()) return prev;
      return buildThemeDefaultLast(categorySlug, t);
    });
  }, [categorySlug, isLoading, location.state?.coverPage, t]);

  React.useEffect(() => {
    if (!categorySlug) return;
    if (!effectiveCover || !effectiveLast) return;
    setStoredCoverLast(categorySlug, effectiveCover, effectiveLast);
  }, [categorySlug, effectiveCover, effectiveLast]);

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
      setSaveError(t('errLoginFirst'));
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
          setSaveError(t('errTemplateUnknown'));
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
        setSaveError(t('errCreatePhotobook'));
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

      // Always persist under this photobook — do not fall back to /album-pages/bulk (same template = wrong book).
      await api.post(`/api/photobooks/${pbId}/pages`, saveBody, { headers });

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
      setSaveError(err.response?.data?.error || err.message || t('errSaveAlbum'));
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
    // When loading saved album, use saved page count so we show the correct number of pages (e.g. 3 for cover+1+back)
    if (saved.length >= 1) setPageCount((prev) => Math.min(18, Math.max(1, saved.length)));
  }, []);

  // Helper: apply loaded covers into state — maps ALL style fields from API (incl. text leaf + coverStyleExtrasJson)
  const applyLoadedCovers = React.useCallback((coverData: any) => {
    const resolveImg = (side: any) =>
      side?.imageId ? buildPreviewUrl(side.imageId) : resolveImageUrl(side?.imageUrl);

    const mapSide = (side: any): EditablePageState => {
      const raw = side as Record<string, unknown>;
      const leaf = mergeCoverLeafStyleFromApi(raw);
      if (leaf.textLeafBgImageUrl && typeof leaf.textLeafBgImageUrl === 'string') {
        leaf.textLeafBgImageUrl = resolveImageUrl(leaf.textLeafBgImageUrl) || leaf.textLeafBgImageUrl;
      }
      return {
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
          gradient: typeof side.gradient === 'string' ? side.gradient : undefined,
          ...leaf,
        },
      };
    };

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

        // Photobook-scoped load only when we have a book id — empty pages are valid for a new book.
        // Do NOT fall back to /api/album-pages (userId+templateId): that merges legacy rows for
        // that template and shows another book's content.
        if (photobookId) {
          try {
            const res = await api.get<PhotobookPagesApiResponse>(
              `/api/photobooks/${photobookId}/pages`,
              { headers },
            );
            pages = res.data?.pages ?? [];
            if (res.data?.templateId != null) setDbTemplateId(Number(res.data.templateId));
            if (res.data?.photobookId != null) setPhotobookId(Number(res.data.photobookId));
          } catch {
            /* endpoint error — leave pages empty */
          }
        } else if (dbTemplateId) {
          try {
            const res = await api.get<{ pages: ApiAlbumPageResponse[]; total: number }>(
              `/api/album-pages?userId=${user.id}&templateId=${dbTemplateId}`,
              { headers },
            );
            pages = res.data?.pages ?? [];
          } catch {
            /* legacy load failed */
          }
        }

        applyLoadedPages(pages, coversFromRoute);

        if (!coversFromRoute) {
          let coverData: any = null;
          if (photobookId) {
            try {
              const r = await api.get(`/api/photobooks/${photobookId}/covers`, { headers });
              coverData = r.data;
            } catch {
              /* leave null */
            }
          } else if (dbTemplateId) {
            try {
              const r = await api.get(`/api/covers`, {
                params: { userId: user.id, templateId: String(dbTemplateId) },
                headers,
              });
              coverData = Array.isArray(r.data) ? r.data[0] : r.data;
            } catch {
              /* legacy covers failed */
            }
          }
          if (coverData) {
            applyLoadedCovers(coverData);
            setPageImages((prev) => {
              const next = { ...prev };
              if (coverData?.frontCover) {
                const url = coverData.frontCover.imageId
                  ? buildPreviewUrl(coverData.frontCover.imageId)
                  : (coverData.frontCover.imageUrl ? resolveImageUrl(coverData.frontCover.imageUrl) : '');
                if (url) {
                  next[0] = {
                    ...next[0],
                    imageDataUrl: url,
                    imageDataUrls: [url],
                    imageIds: coverData.frontCover.imageId ? [coverData.frontCover.imageId] : undefined,
                  };
                }
              }
              const lastIdx = pages.length > 0 ? pages.length - 1 : 0;
              if (coverData?.backCover && lastIdx >= 0) {
                const url = coverData.backCover.imageId
                  ? buildPreviewUrl(coverData.backCover.imageId)
                  : (coverData.backCover.imageUrl ? resolveImageUrl(coverData.backCover.imageUrl) : '');
                if (url) {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    imageDataUrl: url,
                    imageDataUrls: [url],
                    imageIds: coverData.backCover.imageId ? [coverData.backCover.imageId] : undefined,
                  };
                }
              }
              return next;
            });
          }
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
    flipOpenTargetRef.current = 0;
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
    editOpts?: { editable?: boolean; onCropChange?: (slot: number, pos: CropPos) => void; forceWhiteBackground?: boolean },
  ) => {
    const st = pageImages[page.index] ?? {};
    const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
    const arrangement = getArrangementForLayoutId(layoutLabel);
    const isCover = page.type === 'cover';
    const isLast = page.type === 'last';
    /** Flip book only: cover/back-cover become text leaf then photo leaf */
    const coverTextOnly = (isCover || isLast) && page.coverSplit === 'text';
    const coverImageOnly = (isCover || isLast) && page.coverSplit === 'image';
    const textState: EditablePageState | undefined = isCover
      ? (coverFromState ?? { headline: t('cover'), subheadline: '', description: '' } as EditablePageState)
      : isLast
        ? (lastFromState ?? { headline: t('theEnd'), subheadline: '', description: '' } as EditablePageState)
        : undefined;

    const urls = st.imageDataUrls ?? (st.imageDataUrl ? [st.imageDataUrl] : []);
    const coverOrLastUrl = (isCover && coverFromState?.imageDataUrl) || (isLast && lastFromState?.imageDataUrl) || '';
    const getSrc = (i: number) => urls[i] ?? urls[0] ?? st.imageDataUrl ?? (i === 0 ? coverOrLastUrl : '') ?? '';
    const hasImg = !!getSrc(0);
    const showImageLayer = hasImg && !coverTextOnly;
    const hasOverlayCopy = !!(
      textState?.headline?.trim() ||
      textState?.subheadline?.trim() ||
      textState?.description?.trim()
    );
    const hasFloatingTextOverlays = (textState?.style?.textSideOverlays?.length ?? 0) > 0;
    const showLogo = !!(textState?.style?.logoDataUrl && (textState.style.logoSize ?? 56) > 0);

    // Editor preview: clean white canvas for inner pages (photo album style)
    const useWhiteCanvas = editOpts?.forceWhiteBackground && !isCover && !isLast;
    const pageBgThemed = useWhiteCanvas
      ? '#ffffff'
      : categorySlug === 'wedding'
        ? selectedWeddingTheme.gradient
        : categorySlug === 'anniversary'
          ? `linear-gradient(135deg, ${selectedTheme.colors[0]}, ${selectedTheme.colors[2]}, ${selectedTheme.colors[4]})`
          : 'linear-gradient(135deg, #fafafa, #f1f5f9)';
    const needsDarkCoverBg =
      !coverTextOnly &&
      (isCover || isLast) &&
      !hasImg &&
      (hasOverlayCopy || showLogo);
    const pageBg = coverTextOnly
      ? 'linear-gradient(160deg, #0a0f1a 0%, #1e293b 42%, #312e81 88%, #0f172a 100%)'
      : needsDarkCoverBg
        ? 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
        : pageBgThemed;

    const tlsForLeaf = textState?.style;
    /** Image mode, or legacy API with URL but no mode */
    const textLeafIsImageMode =
      tlsForLeaf?.textLeafBgMode === 'image' ||
      (tlsForLeaf?.textLeafBgMode == null && !!tlsForLeaf?.textLeafBgImageUrl);
    const textLeafBgUrlResolved =
      tlsForLeaf?.textLeafBgImageUrl && textLeafIsImageMode && tlsForLeaf.textLeafBgMode !== 'gradient'
        ? resolveImageUrl(String(tlsForLeaf.textLeafBgImageUrl)) || String(tlsForLeaf.textLeafBgImageUrl)
        : undefined;

    /** Front/back photo side: blur, zoom, vignette, scrim gradient — same as category editor */
    const coverPhotoFx =
      (isCover || isLast) && !coverTextOnly && textState?.style
        ? {
          blur: !!textState.style.blurBackground,
          scale: textState.style.imageScale ?? 1,
          vignette: !!textState.style.vignette,
          dark: !!textState.style.darkModeCover,
          animate: !!textState.style.subtleAnimation,
          gradient: textState.style.gradient?.trim(),
        }
        : null;
    const coverImgBlur = !!coverPhotoFx?.blur;
    const coverImgScale = coverPhotoFx?.scale ?? 1;

    const coverTextLeafBgStyle: React.CSSProperties = {};
    if (coverTextOnly && textLeafBgUrlResolved) {
      coverTextLeafBgStyle.backgroundImage = `url("${String(textLeafBgUrlResolved).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
      coverTextLeafBgStyle.backgroundSize = 'cover';
      coverTextLeafBgStyle.backgroundPosition = 'center';
    } else if (coverTextOnly && tlsForLeaf?.textLeafBgMode === 'gradient' && tlsForLeaf.textLeafBgGradient) {
      coverTextLeafBgStyle.background = tlsForLeaf.textLeafBgGradient;
    }
    const pageRootStyle: React.CSSProperties =
      coverTextOnly && Object.keys(coverTextLeafBgStyle).length > 0
        ? coverTextLeafBgStyle
        : { background: pageBg };

    /** Main editor (no flip split): full-bleed text-side bg under photos / placeholder */
    const showTextLeafBgImgLayer =
      (isCover || isLast) &&
      !coverTextOnly &&
      !!textLeafBgUrlResolved;
    const showTextLeafBgGradientLayer =
      (isCover || isLast) &&
      !coverTextOnly &&
      tlsForLeaf?.textLeafBgMode === 'gradient' &&
      !!tlsForLeaf?.textLeafBgGradient;

    const textSideOverlayNodes =
      textState?.style?.textSideOverlays?.length && (isCover || isLast)
        ? textState.style.textSideOverlays.map((o) => (
          <div
            key={o.id}
            className="absolute z-[35] pointer-events-none max-w-[min(92%,20rem)] break-words"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              transform: 'translate(-50%, -50%)',
              textAlign: o.textAlign || 'center',
              fontSize: o.fontSize ?? 13,
              color: o.color ?? '#f8fafc',
              fontWeight: o.fontWeight ?? 600,
              fontStyle: o.fontStyle,
              fontFamily: o.fontFamily,
              letterSpacing: o.letterSpacing != null ? `${o.letterSpacing}px` : undefined,
              lineHeight: o.lineHeight,
              textShadow: o.textShadow ? '0 2px 10px rgba(0,0,0,0.75)' : undefined,
            }}
          >
            {o.text}
          </div>
        ))
        : null;

    const crops = st.cropPositions ?? {};

    // Unified image builder — uses DraggableCropImage when editable, plain <img> otherwise
    const mkImg = (i: number, extraClass = '') => {
      const cp = crops[i] ?? { x: 50, y: 50 };
      const imgAlt = t('pageImgAlt', { page: page.index + 1, slot: i + 1 });
      const cBlur = !!coverPhotoFx?.blur;
      const cScale = coverPhotoFx?.scale ?? 1;
      const imgStyle: React.CSSProperties = {
        objectPosition: `${cp.x}% ${cp.y}%`,
        ...(cScale !== 1 ? { transform: `scale(${cScale})`, transformOrigin: 'center center' } : {}),
      };
      if (editOpts?.editable) {
        return (
          <DraggableCropImage
            key={i}
            src={getSrc(i)}
            alt={imgAlt}
            cropPos={cp}
            onCropChange={(p) => editOpts.onCropChange?.(i, p)}
            className={extraClass}
            coverBlur={cBlur}
            coverScale={cScale}
          />
        );
      }
      return (
        <div key={i} className={`relative overflow-hidden ${extraClass}`} style={{ minWidth: 0, minHeight: 0 }}>
          <img
            src={getSrc(i)}
            alt={imgAlt}
            draggable={false}
            className={`absolute inset-0 w-full h-full object-cover${cBlur ? ' blur-sm' : ''}`}
            style={imgStyle}
          />
        </div>
      );
    };

    let imageContent: React.ReactNode = null;
    if (showImageLayer) {
      const geometry = LAYOUT_GEOMETRY[layoutLabel] || customLayoutGeometry[layoutLabel];

      // JSON-based layout engine when geometry is defined
      if (geometry && geometry.length > 0) {
        imageContent = (
          <div className="absolute inset-0">
            {geometry.map((rect, idx) => (
              <div
                key={idx}
                className="absolute overflow-hidden rounded-md"
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                {mkImg(idx, 'w-full h-full')}
              </div>
            ))}
          </div>
        );
      } else {
        // Fallback: existing hand-tuned arrangements
        switch (arrangement) {
          case 'two-up':
            imageContent = (
              <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2" style={{ gridTemplateRows: '1fr' }}>
                {mkImg(0, 'rounded-md')}{mkImg(1, 'rounded-md')}
              </div>
            );
            break;
          case 'two-vertical':
            imageContent = (
              <div className="absolute inset-0 grid grid-cols-1 gap-2 p-2" style={{ gridTemplateRows: '1fr 1fr' }}>
                {mkImg(0, 'rounded-md')}{mkImg(1, 'rounded-md')}
              </div>
            );
            break;
          case 'three-grid':
            imageContent = (
              <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                <div className="relative overflow-hidden rounded-md" style={{ gridRow: '1 / 3', minWidth: 0, minHeight: 0 }}>
                  {editOpts?.editable ? (
                    <DraggableCropImage src={getSrc(0)} alt={t('pageImgAlt', { page: page.index + 1, slot: 1 })} cropPos={crops[0] ?? { x: 50, y: 50 }} onCropChange={(p) => editOpts.onCropChange?.(0, p)} className="w-full h-full" coverBlur={coverImgBlur} coverScale={coverImgScale} />
                  ) : (
                    <img src={getSrc(0)} alt="" draggable={false} className={`absolute inset-0 w-full h-full object-cover${coverImgBlur ? ' blur-sm' : ''}`} style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%`, ...(coverImgScale !== 1 ? { transform: `scale(${coverImgScale})`, transformOrigin: 'center center' } : {}) }} />
                  )}
                </div>
                {mkImg(1, 'rounded-md')}{mkImg(2, 'rounded-md')}
              </div>
            );
            break;
          case 'hero-two':
            imageContent = (
              <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateRows: '1.5fr 1fr' }}>
                {mkImg(0, 'rounded-md')}
                <div className="grid grid-cols-2 gap-2" style={{ minHeight: 0 }}>{mkImg(1, 'rounded-md')}{mkImg(2, 'rounded-md')}</div>
              </div>
            );
            break;
          case 'four-grid':
            imageContent = (
              <div className="absolute inset-0 grid gap-2 p-2" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                {[0, 1, 2, 3].map(i => mkImg(i, 'rounded-md'))}
              </div>
            );
            break;
          case 'collage':
            imageContent = (
              <div className="absolute inset-0">
                {[
                  { idx: 0, cls: 'absolute top-[4%] left-[4%] w-[52%] h-[58%] rotate-[-3deg] overflow-hidden rounded-md shadow-lg' },
                  { idx: 1, cls: 'absolute bottom-[4%] right-[4%] w-[52%] h-[58%] rotate-[3deg] overflow-hidden rounded-md shadow-lg' },
                  { idx: 2, cls: 'absolute inset-0 m-auto w-[54%] h-[54%] z-10 overflow-hidden rounded-md shadow-xl' },
                ].map(({ idx, cls }) => (
                  <div key={idx} className={cls}>
                    {editOpts?.editable ? (
                      <DraggableCropImage src={getSrc(idx)} alt="" cropPos={crops[idx] ?? { x: 50, y: 50 }} onCropChange={(p) => editOpts.onCropChange?.(idx, p)} className="w-full h-full" coverBlur={coverImgBlur} coverScale={coverImgScale} />
                    ) : (
                      <img src={getSrc(idx)} alt="" draggable={false} className={`absolute inset-0 w-full h-full object-cover${coverImgBlur ? ' blur-sm' : ''}`} style={{ objectPosition: `${(crops[idx]?.x ?? 50)}% ${(crops[idx]?.y ?? 50)}%`, ...(coverImgScale !== 1 ? { transform: `scale(${coverImgScale})`, transformOrigin: 'center center' } : {}) }} />
                    )}
                  </div>
                ))}
              </div>
            );
            break;
          case 'cinematic':
            imageContent = (
              <div className="absolute inset-0 bg-black flex items-center justify-center p-3">
                <div className="relative w-full rounded-md overflow-hidden" style={{ aspectRatio: '2.35/1', maxHeight: '70%' }}>
                  {editOpts?.editable ? (
                    <DraggableCropImage src={getSrc(0)} alt={t('pageImgAlt', { page: page.index + 1, slot: 1 })} cropPos={crops[0] ?? { x: 50, y: 50 }} onCropChange={(p) => editOpts.onCropChange?.(0, p)} className="w-full h-full" coverBlur={coverImgBlur} coverScale={coverImgScale} />
                  ) : (
                    <img src={getSrc(0)} alt="" draggable={false} className={`absolute inset-0 w-full h-full object-cover${coverImgBlur ? ' blur-sm' : ''}`} style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%`, ...(coverImgScale !== 1 ? { transform: `scale(${coverImgScale})`, transformOrigin: 'center center' } : {}) }} />
                  )}
                </div>
              </div>
            );
            break;
          case 'luxury-cover':
            imageContent = (
              <div className="absolute inset-0 flex gap-3 p-3">
                <div className="w-[38%] flex flex-col gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-md">
                      {mkImg(i, 'w-full h-full')}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0 rounded-lg overflow-hidden shadow-lg">
                  {mkImg(3, 'w-full h-full')}
                </div>
              </div>
            );
            break;
          case 'luxury-inner':
            imageContent = (
              <div className="absolute inset-0 grid gap-3 p-3" style={{ gridTemplateRows: '1.4fr 1fr' }}>
                <div className="min-h-0 rounded-lg overflow-hidden shadow-md">
                  {mkImg(0, 'w-full h-full')}
                </div>
                <div className="grid grid-cols-3 gap-3 min-h-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="min-h-0 rounded-lg overflow-hidden shadow-md">
                      {mkImg(i, 'w-full h-full')}
                    </div>
                  ))}
                </div>
              </div>
            );
            break;
          case 'hero-four':
            imageContent = (
              <div className="absolute inset-0 grid gap-3 p-3" style={{ gridTemplateRows: '1.2fr 1fr' }}>
                <div className="min-h-0 rounded-lg overflow-hidden shadow-md">
                  {mkImg(0, 'w-full h-full')}
                </div>
                <div className="grid grid-cols-4 gap-3 min-h-0">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="min-h-0 rounded-lg overflow-hidden shadow-md">
                      {mkImg(i, 'w-full h-full')}
                    </div>
                  ))}
                </div>
              </div>
            );
            break;
          case 'six-grid':
            imageContent = (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-2">
                {[0, 1, 2, 3, 4, 5].map((i) => mkImg(i, 'rounded-md'))}
              </div>
            );
            break;
          default:
            imageContent = (
              <div className="absolute inset-0">
                {editOpts?.editable ? (
                  <DraggableCropImage
                    src={getSrc(0)}
                    alt={t('pageLabel', { n: page.index + 1 })}
                    cropPos={crops[0] ?? { x: 50, y: 50 }}
                    onCropChange={(p) => editOpts.onCropChange?.(0, p)}
                    className="w-full h-full"
                    coverBlur={coverImgBlur}
                    coverScale={coverImgScale}
                  />
                ) : (
                  <img
                    src={getSrc(0)}
                    alt={t('pageLabel', { n: page.index + 1 })}
                    draggable={false}
                    className={`w-full h-full object-cover${coverImgBlur ? ' blur-sm' : ''}`}
                    style={{ objectPosition: `${(crops[0]?.x ?? 50)}% ${(crops[0]?.y ?? 50)}%`, ...(coverImgScale !== 1 ? { transform: `scale(${coverImgScale})`, transformOrigin: 'center center' } : {}) }}
                  />
                )}
              </div>
            );
        }
      }
    }

    return (
      <div className="relative w-full h-full overflow-hidden" style={pageRootStyle}>
        {showTextLeafBgImgLayer && (
          <img
            src={textLeafBgUrlResolved}
            alt=""
            className="absolute inset-0 z-[5] h-full w-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        )}
        {showTextLeafBgGradientLayer && (
          <div
            className="absolute inset-0 z-[5] pointer-events-none"
            style={{ background: tlsForLeaf!.textLeafBgGradient }}
            aria-hidden
          />
        )}
        <div
          className={`absolute inset-0 z-[10] overflow-hidden${coverPhotoFx?.animate ? ' cover-fade-in' : ''
            }${coverPhotoFx?.dark ? ' brightness-90' : ''}`}
          style={
            coverPhotoFx?.vignette
              ? { boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' }
              : undefined
          }
        >
          {imageContent ?? (
            coverTextOnly ? null : (isCover || isLast) && needsDarkCoverBg ? null : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs text-white/25 font-medium tracking-wide">{t('addAPhoto')}</span>
              </div>
            )
          )}
          {coverPhotoFx?.gradient ? (
            <div
              className="absolute inset-0 z-[11] pointer-events-none"
              style={{ background: coverPhotoFx.gradient }}
              aria-hidden
            />
          ) : null}
        </div>

        {coverTextOnly && textState && (
          <div
            className={`absolute inset-0 z-20 flex px-4 py-6 sm:px-8 ${textState.style?.verticalAlign === 'top' ? 'items-start pt-8' :
                textState.style?.verticalAlign === 'center' ? 'items-center' : 'items-end pb-10'
              } justify-center`}
          >
            <div
              className="w-full max-w-[min(92%,26rem)] rounded-2xl border border-white/25 shadow-[0_28px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)] px-6 py-8 sm:px-8 sm:py-10"
              style={{
                background: hexToRgbaAlbum(
                  textState.style?.textPanelGlassColor || '#ffffff',
                  (textState.style?.textPanelGlassOpacity ?? 40) / 100,
                ),
                backdropFilter: `blur(${textState.style?.textPanelBlurPx ?? 24}px)`,
                WebkitBackdropFilter: `blur(${textState.style?.textPanelBlurPx ?? 24}px)`,
              }}
            >
              {textState.style?.logoDataUrl && (textState.style.logoSize ?? 60) > 0 && (
                <div className="flex justify-center mb-4">
                  <img
                    src={textState.style.logoDataUrl}
                    alt=""
                    className="rounded-xl shadow-lg object-contain"
                    style={{
                      width: `${Math.min(72, textState.style.logoSize ?? 56)}px`,
                      height: `${Math.min(72, textState.style.logoSize ?? 56)}px`,
                    }}
                  />
                </div>
              )}
              <div className="text-center flex flex-col items-center">
                {textState.headline && (
                  <div className="leading-tight" style={{
                    fontSize: size === 'pdf' ? Math.min(40, (textState.style?.fontSize ?? 22) * 1.35) : Math.min(34, (textState.style?.fontSize ?? 22) * 1.15),
                    fontWeight: textState.style?.fontWeight ?? 700,
                    color: textState.style?.headlineColor ?? '#ffffff',
                    fontFamily: textState.style?.fontFamily,
                    textShadow: '0 2px 12px rgba(0,0,0,0.35)',
                    letterSpacing: textState.style?.letterSpacing ? `${textState.style.letterSpacing}px` : undefined,
                  }}>{textState.headline}</div>
                )}
                {textState.subheadline && (
                  <div className="mt-2 leading-tight" style={{
                    fontSize: size === 'pdf' ? Math.min(24, ((textState.style?.fontSize ?? 22) - 2) * 1.2) : Math.min(20, ((textState.style?.fontSize ?? 22) - 2) * 1.05),
                    fontWeight: Math.max(400, (textState.style?.fontWeight ?? 700) - 150),
                    color: textState.style?.subheadlineColor ?? '#e5e7eb',
                    fontFamily: textState.style?.fontFamily,
                    textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                  }}>{textState.subheadline}</div>
                )}
                {textState.description && (
                  <p
                    className="mt-4 whitespace-pre-wrap"
                    style={{
                      ...getDescriptionTypographyStyle(textState.style),
                      // When inside a centered flex column, avoid shrink-wrapping that makes
                      // multiline text appear left-anchored.
                      width: '100%',
                      maxWidth: '22rem',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      textAlign: 'center',
                      color: textState.style?.descriptionColor ?? '#ffffff',
                      fontSize: size === 'pdf' ? 18 : 14,
                      lineHeight: 1.5,
                      opacity: 0.95,
                    }}
                  >
                    {textState.description}
                  </p>
                )}
              </div>
            </div>
            {textSideOverlayNodes}
          </div>
        )}

        {!coverTextOnly && !coverImageOnly && textState && (isCover || isLast) && (hasImg || hasOverlayCopy || showLogo || hasFloatingTextOverlays) && (
          <div
            className={`absolute inset-0 z-20 flex px-6 py-8 ${textState.style?.overlayOpacity != null ? '' : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
              } ${textState.style?.verticalAlign === 'top' ? 'items-start' :
                textState.style?.verticalAlign === 'center' ? 'items-center' : 'items-end'
              }`}
            style={
              textState.style?.overlayOpacity != null
                ? { backgroundColor: `${textState.style.overlayColor || '#000000'}${Math.round((textState.style.overlayOpacity ?? 0.4) * 255).toString(16).padStart(2, '0')}` }
                : undefined
            }
          >
            <div className={`w-full ${textState.style?.align === 'center' ? 'text-center' :
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
                <div
                  className="mt-3 max-w-[80%] whitespace-pre-wrap"
                  style={{
                    ...getDescriptionTypographyStyle(textState.style),
                    marginLeft:
                      (textState.style?.descriptionAlign ?? textState.style?.align) === 'center'
                        ? 'auto'
                        : undefined,
                    marginRight:
                      (textState.style?.descriptionAlign ?? textState.style?.align) === 'center'
                        ? 'auto'
                        : undefined,
                  }}
                >{textState.description}</div>
              )}
            </div>
            {textSideOverlayNodes}
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

        {!coverTextOnly && textState?.style?.logoDataUrl && (textState.style.logoSize ?? 60) > 0 && (isCover || isLast) && !coverImageOnly && (
          <div className="absolute z-30" style={{
            top: textState.style.logoPosition?.includes('top') ? '12px' : undefined,
            bottom: textState.style.logoPosition?.includes('bottom') ? '12px' : undefined,
            left: textState.style.logoPosition?.includes('left') ? '12px' : textState.style.logoPosition?.includes('center') ? '50%' : undefined,
            right: textState.style.logoPosition?.includes('right') ? '12px' : undefined,
            transform: textState.style.logoPosition?.includes('center') ? 'translateX(-50%)' : undefined,
          }}>
            <img src={textState.style.logoDataUrl} alt={t('logoAlt')} className="rounded-lg shadow-lg" style={{
              width: `${textState.style.logoSize ?? 60}px`, height: `${textState.style.logoSize ?? 60}px`, objectFit: 'contain',
            }} />
          </div>
        )}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageImages, pageLayouts, coverFromState, lastFromState, categorySlug, selectedWeddingTheme, selectedTheme, t]);

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

  // Shared: render all album pages to image data URLs (same as PDF/flipbook content). Calls onProgress(current, total).
  const renderAllPagesToDataUrls = React.useCallback(async (
    onProgress: (current: number, total: number) => void
  ): Promise<string[]> => {
    const isLandscape = bookOrientation === 'landscape';
    const W = isLandscape ? 1040 : 800;
    const H = isLandscape ? 800 : 1040;
    const dataUrls: string[] = [];

    for (let i = 0; i < albumPages.length; i++) {
      onProgress(i + 1, albumPages.length);
      const page = albumPages[i];
      const st = pageImages[page.index] ?? {};
      const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
      const arrangement = getArrangementForLayoutId(layoutLabel);
      const isCover = page.type === 'cover';
      const isLast = page.type === 'last';

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // Background — white inner pages (same as flipbook), theme for cover/last
      const useWhitePage = !isCover && !isLast;
      if (useWhitePage) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
      } else {
        const bgStr = categorySlug === 'wedding'
          ? selectedWeddingTheme.gradient
          : categorySlug === 'anniversary'
            ? `linear-gradient(135deg, ${selectedTheme.colors[0]}, ${selectedTheme.colors[2]}, ${selectedTheme.colors[4]})`
            : 'linear-gradient(135deg, #fafafa, #f1f5f9)';
        fillGradient(ctx, W, H, bgStr);
      }

      // Collect image sources — load up to 6 for six-grid / hero-four
      const urls = st.imageDataUrls ?? (st.imageDataUrl ? [st.imageDataUrl] : []);
      const getUrl = (idx: number) => urls[idx] ?? urls[0] ?? st.imageDataUrl ?? '';

      const images: (HTMLImageElement | null)[] = [];
      const urlSet = new Set<string>();
      for (let s = 0; s < 6; s++) {
        const u = getUrl(s);
        if (u && !urlSet.has(u)) urlSet.add(u);
        images[s] = u ? await loadImage(u) : null;
      }

      const pad = 24, gap = 18, rad = 12;
      const crops = st.cropPositions ?? {};
      const getImg = (idx: number) => images[idx] ?? images[0];

      if (images[0]) {
        switch (arrangement) {
          case 'two-up': {
            const colW = (W - pad * 2 - gap) / 2;
            const h = H - pad * 2;
            drawCover(ctx, getImg(0)!, pad, pad, colW, h, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad + colW + gap, pad, colW, h, crops[1], rad);
            break;
          }
          case 'two-vertical': {
            const rowH = (H - pad * 2 - gap) / 2;
            const fullW = W - pad * 2;
            drawCover(ctx, getImg(0)!, pad, pad, fullW, rowH, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad, pad + rowH + gap, fullW, rowH, crops[1], rad);
            break;
          }
          case 'three-grid': {
            const colW = (W - pad * 2 - gap) / 2;
            const rowH = (H - pad * 2 - gap) / 2;
            const fullH = H - pad * 2;
            drawCover(ctx, getImg(0)!, pad, pad, colW, fullH, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad + colW + gap, pad, colW, rowH, crops[1], rad);
            drawCover(ctx, getImg(2)!, pad + colW + gap, pad + rowH + gap, colW, rowH, crops[2], rad);
            break;
          }
          case 'four-grid': {
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
          case 'hero-two': {
            const heroH = Math.round((H - pad * 2 - gap) * 0.6);
            const btmH = H - pad * 2 - gap - heroH;
            const colW = (W - pad * 2 - gap) / 2;
            drawCover(ctx, getImg(0)!, pad, pad, W - pad * 2, heroH, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad, pad + heroH + gap, colW, btmH, crops[1], rad);
            drawCover(ctx, getImg(2)!, pad + colW + gap, pad + heroH + gap, colW, btmH, crops[2], rad);
            break;
          }
          case 'cinematic': {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, W, H);
            const cinePad = 32;
            const imgW = W - cinePad * 2;
            const imgH = Math.round(imgW / 2.35);
            const imgY = Math.round((H - imgH) / 2);
            drawCover(ctx, getImg(0)!, cinePad, imgY, imgW, imgH, crops[0], rad);
            break;
          }
          case 'collage': {
            const cw = Math.round(W * 0.52), ch = Math.round(H * 0.56);
            ctx.save(); ctx.translate(pad, pad + 10); ctx.rotate(-3 * Math.PI / 180);
            drawCover(ctx, getImg(0)!, 0, 0, cw, ch, crops[0], rad); ctx.restore();
            ctx.save(); ctx.translate(W - pad - cw, H - pad - ch - 10); ctx.rotate(3 * Math.PI / 180);
            drawCover(ctx, getImg(1)!, 0, 0, cw, ch, crops[1], rad); ctx.restore();
            const mw = Math.round(W * 0.56), mh = Math.round(H * 0.52);
            drawCover(ctx, getImg(2)!, (W - mw) / 2, (H - mh) / 2, mw, mh, crops[2], rad);
            break;
          }
          case 'luxury-cover': {
            const leftW = Math.round((W - pad * 2 - gap) * 0.38);
            const rightW = W - pad * 2 - gap - leftW;
            const rowH = (H - pad * 2 - gap * 2) / 3;
            drawCover(ctx, getImg(0)!, pad, pad, leftW, rowH, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad, pad + rowH + gap, leftW, rowH, crops[1], rad);
            drawCover(ctx, getImg(2)!, pad, pad + (rowH + gap) * 2, leftW, rowH, crops[2], rad);
            drawCover(ctx, getImg(3)!, pad + leftW + gap, pad, rightW, H - pad * 2, crops[3], rad);
            break;
          }
          case 'luxury-inner': {
            const heroH = Math.round((H - pad * 2 - gap) * 0.58);
            const btmH = H - pad * 2 - gap - heroH;
            const colW = (W - pad * 2 - gap * 2) / 3;
            drawCover(ctx, getImg(0)!, pad, pad, W - pad * 2, heroH, crops[0], rad);
            drawCover(ctx, getImg(1)!, pad, pad + heroH + gap, colW, btmH, crops[1], rad);
            drawCover(ctx, getImg(2)!, pad + colW + gap, pad + heroH + gap, colW, btmH, crops[2], rad);
            drawCover(ctx, getImg(3)!, pad + (colW + gap) * 2, pad + heroH + gap, colW, btmH, crops[3], rad);
            break;
          }
          case 'hero-four': {
            const heroH = Math.round((H - pad * 2 - gap) * 0.55);
            const btmH = H - pad * 2 - gap - heroH;
            const colW = (W - pad * 2 - gap * 3) / 4;
            drawCover(ctx, getImg(0)!, pad, pad, W - pad * 2, heroH, crops[0], rad);
            for (let c = 0; c < 4; c++) {
              drawCover(ctx, getImg(c + 1)!, pad + c * (colW + gap), pad + heroH + gap, colW, btmH, crops[c + 1], rad);
            }
            break;
          }
          case 'six-grid': {
            const colW = (W - pad * 2 - gap * 2) / 3;
            const rowH = (H - pad * 2 - gap) / 2;
            for (let r = 0; r < 2; r++) {
              for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                drawCover(ctx, getImg(idx)!, pad + c * (colW + gap), pad + r * (rowH + gap), colW, rowH, crops[idx], rad);
              }
            }
            break;
          }
          default:
            drawCover(ctx, images[0]!, pad, pad, W - pad * 2, H - pad * 2, crops[0], rad);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('noPhoto'), W / 2, H / 2);
      }

      // Cover / last page text overlay
      if (isCover || isLast) {
        const ts = isCover
          ? (coverFromState ?? { headline: t('cover'), subheadline: '' } as EditablePageState)
          : (lastFromState ?? { headline: t('theEnd'), subheadline: '' } as EditablePageState);

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

      dataUrls.push(canvas.toDataURL('image/jpeg', 0.92));
    }

    return dataUrls;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumPages, pageImages, coverFromState, lastFromState, categorySlug, selectedWeddingTheme, selectedTheme, loadImage, bookOrientation, t]);

  // PDF download — uses shared render, then compiles to PDF
  const handleDownloadPdf = React.useCallback(async () => {
    if (isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64 || !albumPages.length) return;
    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: albumPages.length });
    try {
      const dataUrls = await renderAllPagesToDataUrls((cur, tot) => setPdfProgress({ current: cur, total: tot }));
      const isLandscape = bookOrientation === 'landscape';
      const W = isLandscape ? 1040 : 800;
      const H = isLandscape ? 800 : 1040;
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: [W, H] });
      for (let i = 0; i < dataUrls.length; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrls[i], 'JPEG', 0, 0, W, H);
      }
      pdf.save(`${categorySlug}-album.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert(t('alertPdfFailed'));
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  }, [albumPages.length, bookOrientation, categorySlug, isGeneratingPdf, isGeneratingFlipbook, isGeneratingZip, isGeneratingBase64, renderAllPagesToDataUrls, t]);

  // Flipbook download — same book as on screen, standalone HTML with touch/swipe flip
  const handleDownloadFlipbook = React.useCallback(async () => {
    if (isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64 || !albumPages.length) return;
    setIsGeneratingFlipbook(true);
    setPdfProgress({ current: 0, total: albumPages.length });
    try {
      const dataUrls = await renderAllPagesToDataUrls((cur, tot) => setPdfProgress({ current: cur, total: tot }));
      const isLandscape = bookOrientation === 'landscape';
      const W = isLandscape ? 1040 : 800;
      const H = isLandscape ? 800 : 1040;
      const isLandscapeFlip = bookOrientation === 'landscape';
      const bookW = isLandscapeFlip ? 700 : 500;
      const bookH = isLandscapeFlip ? 500 : 700;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>${t('titleFlipbookHtml')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; background: linear-gradient(to bottom, #0f0f14, #16161d); touch-action: none; -webkit-tap-highlight-color: transparent; }
    #view { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    #book { width: 100%; height: 100%; }
    #counter { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.5); font-size: 12px; z-index: 10; pointer-events: none; }
    #hint { position: fixed; bottom: 44px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.4); font-size: 11px; z-index: 10; pointer-events: none; transition: opacity 0.6s; }
    #hint.hide { opacity: 0; }
  </style>
  <script src="https://unpkg.com/page-flip@2.0.7/dist/js/page-flip.browser.js"></script>
</head>
<body>
  <div id="view"><div id="book"></div></div>
  <div id="hint">${t('hintTouchDrag')}</div>
  <div id="counter">1 / ${dataUrls.length}</div>
  <script>
    var pages = ${JSON.stringify(dataUrls)};
    var bookEl = document.getElementById('book');
    var counter = document.getElementById('counter');
    var hint = document.getElementById('hint');
    var pageFlip = new St.PageFlip(bookEl, {
      width: ${bookW},
      height: ${bookH},
      size: 'stretch',
      minWidth: ${isLandscapeFlip ? 360 : 280},
      maxWidth: ${isLandscapeFlip ? 1000 : 800},
      minHeight: ${isLandscapeFlip ? 280 : 360},
      maxHeight: ${isLandscapeFlip ? 720 : 1000},
      maxShadowOpacity: 0.7,
      showCover: true,
      mobileScrollSupport: true,
      drawShadow: true,
      flippingTime: 700,
      useMouseEvents: true,
      swipeDistance: 30
    });
    pageFlip.loadFromImages(pages);
    pageFlip.on('flip', function(e) {
      counter.textContent = (e.data + 1) + ' / ' + pages.length;
      if (hint) hint.classList.add('hide');
    });
    pageFlip.on('init', function() {
      counter.textContent = '1 / ' + pages.length;
    });
  </script>
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${categorySlug}-flipbook.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Flipbook export failed:', err);
      alert(t('alertFlipbookFailed'));
    } finally {
      setIsGeneratingFlipbook(false);
      setPdfProgress(null);
    }
  }, [albumPages.length, bookOrientation, categorySlug, isGeneratingPdf, isGeneratingFlipbook, isGeneratingZip, isGeneratingBase64, renderAllPagesToDataUrls, t]);

  // Download same book as ZIP of images (JPG per page) — easy to send, works on mobile (unzip & view in gallery)
  const handleDownloadImagesZip = React.useCallback(async () => {
    if (isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64 || !albumPages.length) return;
    setIsGeneratingZip(true);
    setPdfProgress({ current: 0, total: albumPages.length });
    try {
      const dataUrls = await renderAllPagesToDataUrls((cur, tot) => setPdfProgress({ current: cur, total: tot }));
      const zip = new JSZip();
      dataUrls.forEach((dataUrl, i) => {
        const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        if (base64) zip.file(`page-${i + 1}.jpg`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${categorySlug}-album-images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP export failed:', err);
      alert(t('alertZipFailed'));
    } finally {
      setIsGeneratingZip(false);
      setPdfProgress(null);
    }
  }, [albumPages.length, categorySlug, isGeneratingPdf, isGeneratingFlipbook, isGeneratingZip, isGeneratingBase64, renderAllPagesToDataUrls, t]);

  // Download same book as Base64 (JSON with data URLs or raw base64) — easy to send as text, use in APIs
  const handleDownloadBase64 = React.useCallback(async () => {
    if (isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64 || !albumPages.length) return;
    setIsGeneratingBase64(true);
    setPdfProgress({ current: 0, total: albumPages.length });
    try {
      const dataUrls = await renderAllPagesToDataUrls((cur, tot) => setPdfProgress({ current: cur, total: tot }));
      const base64Only = dataUrls.map((url) => (url.indexOf(',') >= 0 ? url.split(',')[1] : url));
      const payload = {
        album: categorySlug,
        pageCount: dataUrls.length,
        pages: dataUrls,
        base64: base64Only,
      };
      const json = JSON.stringify(payload, null, 0);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${categorySlug}-album-base64.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Base64 export failed:', err);
      alert(t('alertBase64Failed'));
    } finally {
      setIsGeneratingBase64(false);
      setPdfProgress(null);
    }
  }, [albumPages.length, categorySlug, isGeneratingPdf, isGeneratingFlipbook, isGeneratingZip, isGeneratingBase64, renderAllPagesToDataUrls, t]);

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

  // When navigated from PhotoBook with openPreview: open flip book or page view in big view
  React.useEffect(() => {
    const mode = location.state?.openPreview;
    if (!mode || !albumPages.length || isLoading) return;
    if (mode === 'flip') {
      flipOpenTargetRef.current = 0;
      setFlipBookPage(0);
      setShowFlipBook(true);
    } else if (mode === 'page') {
      setShowSinglePageView(true);
      setSinglePageIndex(0);
    }
    const pathname = (location as { pathname?: string }).pathname ?? window.location.pathname;
    navigate(pathname, { replace: true, state: { ...location.state, openPreview: undefined } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumPages.length, isLoading, location.state?.openPreview]);

  // After flip modal opens, apply start page (library uses PageFlip.flip(index) once PageFlip is ready).
  React.useEffect(() => {
    if (!showFlipBook) return;
    const target = flipOpenTargetRef.current;
    if (target == null) return;
    flipOpenTargetRef.current = null;
    const id = window.setTimeout(() => {
      try {
        const pf = flipBookRef.current?.pageFlip?.();
        if (pf && typeof pf.flip === 'function' && target >= 0) {
          pf.flip(target);
        }
      } catch {
        /* ignore */
      }
    }, 120);
    return () => clearTimeout(id);
  }, [showFlipBook]);

  // Scroll active page thumb into view in the stepper
  React.useEffect(() => {
    const el = stepperRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[data-active-step="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentStep, albumPages.length]);

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
        else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          flipBookRef.current?.pageFlip()?.flipPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          flipBookRef.current?.pageFlip()?.flipNext();
        }
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

  // Collect all photo URLs used in the album (for left sidebar library)
  const libraryPhotoUrls = React.useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    albumPages.forEach((p) => {
      const st = pageImages[p.index];
      const list = st?.imageDataUrls ?? (st?.imageDataUrl ? [st.imageDataUrl] : []);
      list.forEach((u) => {
        if (u && !seen.has(u)) {
          seen.add(u);
          urls.push(u);
        }
      });
    });
    return urls;
  }, [albumPages, pageImages]);

  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'recent'>('all');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [pendingLibraryImage, setPendingLibraryImage] = useState<{ url: string; imageId?: number } | null>(null);
  const [showStudioGrid, setShowStudioGrid] = useState(false);
  const [studioRightTab, setStudioRightTab] = useState<'layers' | 'type' | 'effects'>('layers');
  const [canvasViewMode, setCanvasViewMode] = useState<'spread' | 'page'>('page');
  const spreadContainerRef = React.useRef<HTMLDivElement>(null);
  const [spreadTransform, setSpreadTransform] = React.useState(
    'rotateX(5deg) rotateY(-8deg) rotateZ(1deg)'
  );

  const handleSpreadPointerMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = spreadContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 40;
    setSpreadTransform(
      `rotateX(${5 + rotateX}deg) rotateY(${-8 + rotateY}deg) rotateZ(1deg)`
    );
    el.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
    el.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
  }, []);

  const handleSpreadPointerLeave = useCallback(() => {
    setSpreadTransform('rotateX(5deg) rotateY(-8deg) rotateZ(1deg)');
  }, []);

  const categorySuiteGradient =
    categorySlug === 'birthday'
      ? 'from-[#ec4899] to-[#f43f5e]'
      : categorySlug === 'wedding'
        ? 'from-[#8b5cf6] to-[#6366f1]'
        : categorySlug === 'anniversary'
          ? 'from-[#ef4444] to-[#ec4899]'
          : 'from-[#4648d4] to-[#8127cf]';

  if (!template) {
    return (
      <div className="space-y-4 w-full">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {t('unknownTheme', { slug: categorySlug })}
        </div>
      </div>
    );
  }

  return (
    <div className="album-builder-studio flex flex-col min-h-[calc(100vh-4rem)] w-full pb-24">
      {/* Print styles */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          header, nav, aside { display: none !important; }
          .no-print { display: none !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
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

      {isLoading && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-indigo-100 bg-white px-6 py-5 shadow-xl flex items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-200" />
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{t('loadingAlbum')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('restoringPages')}</p>
            </div>
          </div>
        </div>
      )}

      {studioAlbumImageIds && (
        <div className="no-print mx-2 sm:mx-4 mt-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <FaImages className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xs text-indigo-700">
            <span className="font-bold">{studioAlbumName || t('studioAlbum')}</span>
            <span className="text-indigo-500"> — {t('imagesAvailable', { count: studioAlbumImageIds.length })}</span>
          </span>
        </div>
      )}

      {/* StudioPro top bar */}
      <header className="no-print sticky top-0 z-30 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between px-4 sm:px-8 py-3 bg-white/80 backdrop-blur-3xl border-b border-slate-200/60">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/photo-themes/${categorySlug}`, { state: { templateId: dbTemplateId, photobookId } })}
            className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-[#4648d4]/5 hover:text-[#4648d4] transition-colors"
            aria-label={t('backAria')}
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[#4648d4] tracking-tight shrink-0">
              {t('studioPro')}
            </span>
            <span className="hidden sm:inline px-2 py-0.5 bg-[#4648d4]/10 text-[#4648d4] text-[10px] font-black uppercase tracking-widest rounded-md leading-none">
              {t('ultraPro')}
            </span>
          </div>
          <div className="hidden md:block h-6 w-px bg-slate-200 mx-1" />
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-bold text-[#0b1c30] truncate">
              {studioAlbumName || template?.name || t('myAlbum')}
            </h1>
            <p className="text-xs text-[#464554] truncate">
              {template?.name} · {t('pagesCount', { count: albumPages.length })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t('liveSync')}</span>
          </div>
          <div
            className="w-20 sm:w-24 h-2 rounded-full bg-slate-200 overflow-hidden"
            title={t('pagesFilled', {
              filled: albumPages.filter(
                (p) => pageImages[p.index]?.imageDataUrl || (pageImages[p.index]?.imageDataUrls?.length ?? 0) > 0
              ).length,
              total: albumPages.length,
            })}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4648d4] to-[#8127cf] transition-all duration-300"
              style={{
                width: `${Math.round(
                  (albumPages.filter(
                    (p) => pageImages[p.index]?.imageDataUrl || (pageImages[p.index]?.imageDataUrls?.length ?? 0) > 0
                  ).length /
                    Math.max(1, albumPages.length)) *
                    100
                )}%`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleOpenFlipBook}
            className="px-4 py-2 text-[#4648d4] font-bold hover:bg-[#4648d4]/5 rounded-xl transition-all text-sm"
          >
            {t('preview')}
          </button>
          <button
            type="button"
            onClick={handleSaveAlbum}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-[#0b1c30] hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            {isSaving ? <FaSpinner className="w-4 h-4 animate-spin inline" /> : t('saveDraft')}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-6 py-2.5 bg-[#4648d4] text-white font-bold rounded-xl shadow-[0_10px_20px_-5px_rgba(70,72,212,0.4)] hover:shadow-[0_15px_25px_-5px_rgba(70,72,212,0.5)] transition-all text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingPdf ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaDownload className="w-4 h-4" />}
            {t('export')}
          </button>
        </div>
      </header>

      {/* Main workspace: left library | center canvas | right studio panel */}
      <div className="album-pages-section flex-1 flex flex-col lg:flex-row min-h-0 no-print">
        {/* Left — workspace + photo library */}
        <aside className="hidden lg:flex lg:w-72 shrink-0 border-r border-slate-100 bg-white flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-4 p-4 mb-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 shadow-sm">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categorySuiteGradient} flex items-center justify-center text-white shadow-xl rotate-3 shrink-0`}
              >
                <FaStar className="text-2xl" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[#0b1c30] truncate">{template?.name || categorySlug}</h3>
                <p className="text-[10px] text-[#4648d4] font-bold uppercase tracking-[0.15em]">{t('suiteProEditor')}</p>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-3">{t('projectAssets')}</p>
            <nav className="space-y-1 mb-6">
              <div className="w-full flex items-center gap-4 p-3 text-[#4648d4] bg-[#4648d4]/5 rounded-2xl font-bold border border-[#4648d4]/10 shadow-sm text-sm">
                <FaImages className="text-xl shrink-0" />
                <span>{t('photoLibrary')}</span>
                <span className="ml-auto bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {libraryPhotoUrls.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStudioRightTab('layers')}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-sm font-bold ${
                  studioRightTab === 'layers'
                    ? 'text-[#4648d4] bg-[#4648d4]/5 border border-[#4648d4]/10'
                    : 'text-[#464554] hover:bg-[#4648d4]/5 hover:text-[#4648d4]'
                }`}
              >
                <FaPalette className="text-xl shrink-0" />
                {t('layoutsNav')}
              </button>
            </nav>
          </div>
          <div className="px-4 pb-3 border-b border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <FaImages className="w-3.5 h-3.5 text-[#4648d4]" />
              {t('photoLibrary')}
            </h2>
            <div className="mt-2 relative">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPhotos')}
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {(['all', 'recent'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLibraryFilter(f)}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold capitalize transition-colors ${libraryFilter === f ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {f === 'all' ? t('filterAll') : t('filterRecent')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
              <span>{t('photosInAlbum', { count: libraryPhotoUrls.length })}</span>
              {pendingLibraryImage && (
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-[9px] font-semibold text-indigo-700 border border-indigo-200">
                  {t('tapSlotToApply')}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {libraryPhotoUrls.slice(0, 40).map((url, i) => {
                const imageId = extractImageIdFromUrl(url);
                const isActive = pendingLibraryImage?.url === url;
                return (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => {
                      setPendingLibraryImage({ url, imageId: imageId ?? undefined });
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border bg-slate-50 shadow-sm transition-all ${isActive
                        ? 'border-indigo-500 ring-2 ring-indigo-400/60 scale-[1.02]'
                        : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                      }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {isActive && (
                      <span className="absolute bottom-1 left-1 right-1 mx-auto text-[9px] font-semibold text-white bg-black/60 rounded-full px-1.5 py-0.5 text-center">
                        {t('selectedClickSlot')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                const idx = Math.min(currentStep, Math.max(0, albumPages.length - 1));
                const p = albumPages[idx];
                if (p) setPageImagePickerFor({ pageIndex: p.index, layout: getPageLayoutLabel(p.index, p.layoutName) });
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <FaPlus className="w-3.5 h-3.5" />
              {t('addFromLibrary')}
            </button>
          </div>
        </aside>

        {/* Center + Right: canvas and settings (from step editor) */}
        {(() => {
          const safeStep = Math.min(currentStep, albumPages.length - 1);
          const page = albumPages[safeStep];
          if (!page) return <div className="flex-1 flex min-h-0" />;
          const state = pageImages[page.index] ?? {};
          const layoutLabel = getPageLayoutLabel(page.index, page.layoutName);
          const isCover = page.type === 'cover';
          const isLast = page.type === 'last';
          const slotCount = getSlotCountForLayoutId(layoutLabel);
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

          const handleSlotDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const a = String(active.id).match(/^slot-(\d+)-(\d+)$/);
            const b = String(over.id).match(/^slot-(\d+)-(\d+)$/);
            if (!a || !b || a[1] !== b[1]) return;
            const pageIdx = Number(a[1]);
            const fromSlot = Number(a[2]);
            const toSlot = Number(b[2]);
            setPageImages((prev) => {
              const cur = prev[pageIdx] ?? {};
              const urlList = [...(cur.imageDataUrls ?? (cur.imageDataUrl ? [cur.imageDataUrl] : []))];
              const ids = [...(cur.imageIds ?? [])];
              while (urlList.length <= Math.max(fromSlot, toSlot)) urlList.push('');
              while (ids.length <= Math.max(fromSlot, toSlot)) ids.push(0);
              [urlList[fromSlot], urlList[toSlot]] = [urlList[toSlot], urlList[fromSlot]];
              [ids[fromSlot], ids[toSlot]] = [ids[toSlot], ids[fromSlot]];
              return {
                ...prev,
                [pageIdx]: { ...cur, imageDataUrl: urlList[0] || '', imageDataUrls: urlList, imageIds: ids },
              };
            });
          };


          const createCustomLayout = () => {
            const name = newLayoutName.trim() || `Premium Layout ${layoutStudioSlots.length}`;
            const id = `${name}-${Date.now()}`;

            setCustomLayouts((prev) => [
              ...prev,
              {
                id,
                shortLabel: name,
                slotCount: layoutStudioSlots.length,
                geometry: layoutStudioSlots,
              },
            ]);

            setPageLayouts((prev) => ({ ...prev, [page.index]: id }));
            setPageImages((prev) => ({
              ...prev,
              [page.index]: {
                ...(prev[page.index] ?? {}),
                layout: id,
              },
            }));

            setShowLayoutCreator(false);
            setNewLayoutName('');
          };

          const allLayoutConfig = [
            ...PAGE_LAYOUT_CONFIG,
            ...customLayouts.map((l) => ({
              id: l.id,
              shortLabel: l.shortLabel,
              slotCount: l.slotCount,
              arrangement: 'single' as LayoutArrangement,
            })),
          ];

          const filteredLayoutConfig = layoutQuickFilter === 'all'
            ? allLayoutConfig
            : allLayoutConfig.filter((c) => c.slotCount === layoutQuickFilter);
            
          // const filteredLayoutConfig = layoutQuickFilter === 'all'
          //   ? PAGE_LAYOUT_CONFIG
          //   : PAGE_LAYOUT_CONFIG.filter((c) => c.slotCount === layoutQuickFilter);

          return (
            <>
              {/* Center — Studio canvas */}
              <main className="flex-1 flex flex-col min-w-0 min-h-0 album-builder-studio-mesh">
                <div className="h-14 border-b border-slate-200/40 flex items-center justify-between px-4 sm:px-8 bg-white/40 backdrop-blur-xl shrink-0">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-full border border-slate-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((z) => Math.max(50, z - 10))}
                        className="p-1 hover:text-[#4648d4] transition-colors text-slate-500"
                        aria-label="Zoom out"
                      >
                        −
                      </button>
                      <span className="text-[11px] font-black text-slate-500 min-w-[40px] text-center">{canvasZoom}%</span>
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((z) => Math.min(150, z + 10))}
                        className="p-1 hover:text-[#4648d4] transition-colors text-slate-500"
                        aria-label="Zoom in"
                      >
                        +
                      </button>
                    </div>
                    <div className="hidden sm:block h-6 w-px bg-slate-300/40" />
                    <div className="flex items-center gap-4 sm:gap-6">
                      <button
                        type="button"
                        onClick={() => {
                          if (isCover || isLast) setCanvasViewMode('spread');
                        }}
                        disabled={!isCover && !isLast}
                        className={`text-[11px] sm:text-xs font-black tracking-wider uppercase flex items-center gap-2 transition-colors ${
                          canvasViewMode === 'spread' && (isCover || isLast)
                            ? 'text-[#4648d4]'
                            : 'text-slate-400 hover:text-[#4648d4] disabled:opacity-40'
                        }`}
                      >
                        {t('spreadView')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCanvasViewMode('page');
                          handleOpenFlipBook();
                        }}
                        className="text-[11px] sm:text-xs font-black text-slate-400 hover:text-[#4648d4] tracking-wider uppercase flex items-center gap-2"
                      >
                        {t('flipbookView')}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowStudioGrid((g) => !g)}
                      className={`p-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                        showStudioGrid ? 'text-[#4648d4] bg-white shadow-sm' : 'text-slate-400 hover:text-[#4648d4] hover:bg-white/80'
                      }`}
                    >
                      <span className="hidden lg:inline">{t('gridSystem')}</span>
                      ⊞
                    </button>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1 hidden md:inline ${
                        isCover
                          ? 'bg-amber-100 text-amber-900'
                          : isLast
                            ? 'bg-stone-100 text-stone-800'
                            : 'bg-white/80 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isCover ? t('cover') : isLast ? t('back') : t('pageLabel', { n: page.index + 1 })}
                    </span>
                  </div>
                </div>

                <div
                  ref={spreadContainerRef}
                  className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center album-builder-no-scrollbar album-builder-perspective min-h-0"
                  onMouseMove={handleSpreadPointerMove}
                  onMouseLeave={handleSpreadPointerLeave}
                >
                  <button
                    type="button"
                    disabled={safeStep === 0}
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 z-10"
                    aria-label={t('previousPage')}
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>

                  {(isCover || isLast) && canvasViewMode === 'spread' ? (
                    <div
                      className="album-builder-spread-3d relative cursor-crosshair mx-4"
                      style={{ transform: spreadTransform }}
                    >
                      <div className="flex rounded-sm overflow-hidden relative border border-white/60 shadow-2xl">
                        <div
                          className={`absolute inset-0 z-40 album-builder-grid-overlay ${showStudioGrid ? 'active' : ''}`}
                        />
                        <div className="album-builder-dynamic-light" />
                        <div className="w-[min(280px,38vw)] sm:w-[320px] h-[min(380px,52vh)] bg-white album-builder-paper-texture relative border-r border-slate-100 flex-shrink-0">
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70">
                            <FaImages className="text-5xl text-slate-200/80 mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('back')}</p>
                            <p className="text-sm font-semibold text-slate-600 mt-2 line-clamp-2">
                              {effectiveLast?.headline || t('thankYou')}
                            </p>
                          </div>
                        </div>
                        <div className="absolute left-[min(268px,37vw)] sm:left-[308px] top-0 bottom-0 w-12 album-builder-book-spine z-20 pointer-events-none opacity-60" />
                        <div className="w-[min(280px,38vw)] sm:w-[320px] h-[min(380px,52vh)] bg-white album-builder-paper-texture relative z-10 flex-shrink-0 overflow-hidden">
                          {effectiveCover?.imageDataUrl ? (
                            <img
                              src={effectiveCover.imageDataUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-200" />
                          )}
                          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
                            <div className="album-builder-glass-card p-6 sm:p-8 rounded-[2rem] relative">
                              <div
                                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${categorySuiteGradient}`}
                              />
                              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl text-[#0b1c30] mb-2 leading-tight">
                                {effectiveCover?.headline || t('defaultBirthdayHeadline')}
                              </h2>
                              <p className="text-base text-[#464554] italic opacity-80">
                                {effectiveCover?.subheadline || ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex-1 flex items-center justify-center min-h-0 max-w-4xl mx-2"
                      style={{ transform: `scale(${canvasZoom / 100})`, transformOrigin: 'center center' }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 10 : -10;
                        setCanvasZoom((z) => Math.min(150, Math.max(50, z + delta)));
                      }}
                    >
                      <div
                        className={`relative w-full rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xl ${
                          showStudioGrid ? 'ring-2 ring-[#4648d4]/20' : ''
                        }`}
                        style={{
                          aspectRatio: '4/3',
                          maxHeight: 'calc(100vh - 280px)',
                        }}
                      >
                        {showStudioGrid && (
                          <div className="absolute inset-0 z-10 album-builder-grid-overlay active pointer-events-none" />
                        )}
                        {renderPageInner(page, 'preview', {
                          editable: true,
                          onCropChange: onCrop,
                          forceWhiteBackground: true,
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={safeStep >= albumPages.length - 1}
                    onClick={() => setCurrentStep((s) => Math.min(albumPages.length - 1, s + 1))}
                    className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 z-10"
                    aria-label={t('nextPage')}
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Pro preset strip (cover pages) */}
                {(isCover || isLast) && (
                  <div className="px-4 sm:px-8 pb-4 shrink-0">
                    <div className="album-builder-glass-card rounded-[2rem] p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {t('proPresetGallery')}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(
                            [
                              ['birthday', () => setEffectiveCover(buildThemeDefaultCover('birthday', t))],
                              ['wedding', () => setEffectiveCover(buildThemeDefaultCover('wedding', t))],
                              ['anniversary', () => setEffectiveCover(buildThemeDefaultCover('anniversary', t))],
                              ['minimal', () => setEffectiveCover(buildMinimalPresetCover(t))],
                            ] as const
                          ).map(([key, fn]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={fn}
                              className="rounded-xl border border-slate-200 bg-white/80 py-4 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-[#4648d4]/40 hover:shadow-md transition-all"
                            >
                              {key === 'birthday'
                                ? t('presetBirthday')
                                : key === 'wedding'
                                  ? t('presetWedding')
                                  : key === 'anniversary'
                                    ? t('presetAnniversary')
                                    : t('presetMinimal')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {showLayoutCreator && createPortal(
                  <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-xl p-3 sm:p-6 flex items-center justify-center">
                    <div className="w-full max-w-6xl h-[92vh] rounded-[2rem] overflow-hidden bg-white shadow-2xl border border-white/20 flex flex-col">
                      
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-950 text-white flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black tracking-tight">Layout Studio</h3>
                          <p className="text-xs text-indigo-100 mt-1">
                            Create premium reusable photo book layouts with custom image positions.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowLayoutCreator(false)}
                          className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xl font-bold"
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] bg-slate-100">
                        
                        {/* Left presets */}
                        <aside className="border-r border-slate-200 bg-white p-4 overflow-y-auto">
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Premium presets
                          </p>

                          {[
                            {
                              name: 'Magazine Hero',
                              slots: 5,
                              bg: 'linear-gradient(135deg,#0f172a,#312e81)',
                              geometry: [
                                { x: 3, y: 3, width: 60, height: 94 },
                                { x: 66, y: 3, width: 31, height: 22 },
                                { x: 66, y: 27, width: 31, height: 22 },
                                { x: 66, y: 51, width: 31, height: 22 },
                                { x: 66, y: 75, width: 31, height: 22 },
                              ],
                            },
                            {
                              name: 'Luxury Collage',
                              slots: 6,
                              bg: 'linear-gradient(135deg,#fff7ed,#fce7f3)',
                              geometry: [
                                { x: 4, y: 5, width: 42, height: 42 },
                                { x: 52, y: 5, width: 44, height: 28 },
                                { x: 52, y: 37, width: 20, height: 25 },
                                { x: 76, y: 37, width: 20, height: 25 },
                                { x: 4, y: 52, width: 42, height: 43 },
                                { x: 52, y: 66, width: 44, height: 29 },
                              ],
                            },
                            {
                              name: 'Polaroid Story',
                              slots: 4,
                              bg: 'linear-gradient(135deg,#f8fafc,#e0f2fe)',
                              geometry: [
                                { x: 8, y: 10, width: 36, height: 36 },
                                { x: 55, y: 8, width: 35, height: 35 },
                                { x: 12, y: 55, width: 35, height: 35 },
                                { x: 58, y: 54, width: 34, height: 34 },
                              ],
                            },
                            {
                              name: 'Full Bleed Mosaic',
                              slots: 9,
                              bg: 'linear-gradient(135deg,#111827,#020617)',
                              geometry: [
                                { x: 0, y: 0, width: 34, height: 34 },
                                { x: 34, y: 0, width: 33, height: 34 },
                                { x: 67, y: 0, width: 33, height: 34 },
                                { x: 0, y: 34, width: 34, height: 33 },
                                { x: 34, y: 34, width: 33, height: 33 },
                                { x: 67, y: 34, width: 33, height: 33 },
                                { x: 0, y: 67, width: 34, height: 33 },
                                { x: 34, y: 67, width: 33, height: 33 },
                                { x: 67, y: 67, width: 33, height: 33 },
                              ],
                            },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setNewLayoutName(preset.name);
                                setNewLayoutSlotCount(preset.slots);
                                setLayoutStudioBg(preset.bg);
                                setLayoutStudioSlots(preset.geometry);
                              }}
                              className="w-full mb-3 rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-300 hover:shadow-xl transition-all"
                            >
                              <div
                                className="aspect-[4/3] rounded-xl relative overflow-hidden mb-2"
                                style={{ background: preset.bg }}
                              >
                                {preset.geometry.map((g, i) => (
                                  <div
                                    key={i}
                                    className="absolute rounded-lg bg-white/80 border border-white/70 shadow-sm flex items-center justify-center text-[10px] font-black text-slate-700"
                                    style={{
                                      left: `${g.x}%`,
                                      top: `${g.y}%`,
                                      width: `${g.width}%`,
                                      height: `${g.height}%`,
                                    }}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>

                              <p className="text-xs font-black text-slate-900">{preset.name}</p>
                              <p className="text-[10px] text-slate-500">{preset.slots} image slots</p>
                            </button>
                          ))}
                        </aside>

                        {/* Center live editor */}
                        <main className="p-5 flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm font-black text-slate-900">Live Layout Canvas</p>
                              <p className="text-xs text-slate-500">Adjust position, size, radius and background.</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const nextIndex = layoutStudioSlots.length;
                                setLayoutStudioSlots((prev) => [
                                  ...prev,
                                  { x: 10 + (nextIndex * 5) % 50, y: 10 + (nextIndex * 7) % 50, width: 28, height: 28 },
                                ]);
                                setNewLayoutSlotCount((n) => n + 1);
                                setActiveLayoutSlot(nextIndex);
                              }}
                              className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                            >
                              + Add Image Box
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 flex items-center justify-center">
                            <div
                              className="relative w-full max-w-3xl aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white"
                              style={{ background: layoutStudioBg }}
                            >
                              {layoutStudioBgImage && (
                                <img
                                  src={layoutStudioBgImage}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                                />
                              )}

                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.25),transparent_35%)]" />

                              {layoutStudioSlots.map((slot, i) => {
                                const active = activeLayoutSlot === i;
                                const sampleUrl = urls[i] || urls[0];

                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveLayoutSlot(i)}
                                    className={`absolute overflow-hidden transition-all ${
                                      active
                                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-white z-20'
                                        : 'ring-1 ring-white/70 hover:ring-indigo-300'
                                    }`}
                                    style={{
                                      left: `${slot.x}%`,
                                      top: `${slot.y}%`,
                                      width: `${slot.width}%`,
                                      height: `${slot.height}%`,
                                      borderRadius: `${layoutStudioRadius}px`,
                                      boxShadow: layoutStudioShadow
                                        ? '0 20px 45px rgba(15,23,42,0.32)'
                                        : 'none',
                                    }}
                                  >
                                    {sampleUrl ? (
                                      <img src={sampleUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-white/80 flex items-center justify-center">
                                        <span className="text-lg font-black text-slate-500">{i + 1}</span>
                                      </div>
                                    )}

                                    <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-white">
                                      {i + 1}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </main>

                        {/* Right controls */}
                        <aside className="border-l border-slate-200 bg-white p-4 overflow-y-auto">
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Layout controls
                          </p>

                          <label className="block mb-3">
                            <span className="text-xs font-bold text-slate-600">Template Name</span>
                            <input
                              type="text"
                              value={newLayoutName}
                              onChange={(e) => setNewLayoutName(e.target.value)}
                              placeholder="My Premium Layout"
                              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </label>

                          <label className="block mb-3">
                            <span className="text-xs font-bold text-slate-600">Background</span>
                            <select
                              value={layoutStudioBg}
                              onChange={(e) => setLayoutStudioBg(e.target.value)}
                              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
                            >
                              <option value="linear-gradient(135deg,#ffffff,#f8fafc)">Clean White</option>
                              <option value="linear-gradient(135deg,#0f172a,#312e81)">Royal Dark</option>
                              <option value="linear-gradient(135deg,#fff7ed,#fce7f3)">Wedding Soft</option>
                              <option value="linear-gradient(135deg,#fdf2f8,#ede9fe)">Romantic Pink</option>
                              <option value="linear-gradient(135deg,#ecfeff,#e0f2fe)">Sky Premium</option>
                            </select>
                          </label>

                          <label className="block mb-3">
                            <span className="text-xs font-bold text-slate-600">Background Image URL</span>
                            <input
                              type="text"
                              value={layoutStudioBgImage}
                              onChange={(e) => setLayoutStudioBgImage(e.target.value)}
                              placeholder="Optional image URL"
                              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <label>
                              <span className="text-xs font-bold text-slate-600">Radius</span>
                              <input
                                type="range"
                                min={0}
                                max={40}
                                value={layoutStudioRadius}
                                onChange={(e) => setLayoutStudioRadius(Number(e.target.value))}
                                className="w-full accent-indigo-600"
                              />
                            </label>

                            <label className="flex items-end gap-2 pb-1">
                              <input
                                type="checkbox"
                                checked={layoutStudioShadow}
                                onChange={(e) => setLayoutStudioShadow(e.target.checked)}
                              />
                              <span className="text-xs font-bold text-slate-600">Shadow</span>
                            </label>
                          </div>

                          {activeLayoutSlot != null && layoutStudioSlots[activeLayoutSlot] && (
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
                              <p className="text-xs font-black text-indigo-900">
                                Image Box {activeLayoutSlot + 1}
                              </p>

                              {(['x', 'y', 'width', 'height'] as const).map((key) => (
                                <label key={key} className="block">
                                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                    <span>{key.toUpperCase()}</span>
                                    <span>{Math.round(layoutStudioSlots[activeLayoutSlot][key])}%</span>
                                  </div>

                                  <input
                                    type="range"
                                    min={key === 'width' || key === 'height' ? 5 : 0}
                                    max={key === 'width' || key === 'height' ? 100 : 95}
                                    value={layoutStudioSlots[activeLayoutSlot][key]}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setLayoutStudioSlots((prev) =>
                                        prev.map((s, idx) =>
                                          idx === activeLayoutSlot ? { ...s, [key]: val } : s
                                        )
                                      );
                                    }}
                                    className="w-full accent-indigo-600"
                                  />
                                </label>
                              ))}

                              <button
                                type="button"
                                onClick={() => {
                                  setLayoutStudioSlots((prev) => prev.filter((_, idx) => idx !== activeLayoutSlot));
                                  setActiveLayoutSlot(null);
                                  setNewLayoutSlotCount((n) => Math.max(1, n - 1));
                                }}
                                className="w-full rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                              >
                                Remove Selected Box
                              </button>
                            </div>
                          )}
                        </aside>
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          {layoutStudioSlots.length} image boxes · reusable layout template
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLayoutCreator(false)}
                            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={createCustomLayout}
                            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
                          >
                            Save Layout & Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </main>

              {/* Right — Studio control panel */}
              <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 album-builder-studio-panel flex flex-col overflow-hidden max-h-[50vh] lg:max-h-none">
                <div className="flex border-b border-white/10 h-14 shrink-0">
                  {(
                    [
                      ['layers', t('layoutsNav')],
                      ['type', t('coverTextPanel')],
                      ['effects', t('theme')],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStudioRightTab(tab)}
                      className={`flex-1 text-[10px] font-black tracking-[0.15em] uppercase border-b-2 transition-all ${
                        studioRightTab === tab
                          ? 'border-[#4648d4] text-white bg-white/[0.04]'
                          : 'border-transparent text-slate-500 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex-grow overflow-y-auto album-builder-no-scrollbar p-4 sm:p-6 space-y-6">
                  {studioRightTab === 'layers' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('photoCount')}</p>
                    <div className="flex flex-wrap gap-1">
                      {([1, 2, 3, 4, 5, 6, 'all'] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setLayoutQuickFilter(n === 'all' ? 'all' : n)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                            layoutQuickFilter === n
                              ? 'bg-[#4648d4]/20 text-white border border-[#4648d4]/30'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          {n === 'all' ? t('all') : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {t('pageLayout')}
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowLayoutCreator(true)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700"
                      >
                        <FaPlus className="w-2.5 h-2.5" />
                        Create Layout
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                      {filteredLayoutConfig.map((config) => {
                        const active = layoutLabel === config.id;

                        return (
                          <button
                            key={config.id}
                            type="button"
                            title={layoutShort(config.id)}
                            onClick={() => {
                              setPageLayouts((prev) => ({ ...prev, [page.index]: config.id }));
                              setPageImages((prev) => ({
                                ...prev,
                                [page.index]: {
                                  ...(prev[page.index] ?? {}),
                                  layout: config.id,
                                },
                              }));
                            }}
                            className={`shrink-0 flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${active
                                ? 'bg-amber-50 ring-2 ring-amber-400/70 ring-offset-1 border border-amber-200/50'
                                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/70'
                              }`}
                          >
                            <div className="w-full aspect-[4/3] rounded overflow-hidden bg-white border border-slate-200/60">
                              <LayoutOptionThumb
                                layoutId={config.id}
                                slotCount={config.slotCount}
                                urls={urls}
                                isActive={active}
                              />
                            </div>

                            <span className="text-[8px] font-semibold leading-none text-slate-600 truncate w-full text-center">
                              {config.shortLabel || layoutShort(config.id)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* legacy layout grid duplicate removed */}
                  {/* <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('pageLayout')}</p>
                    <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                      {filteredLayoutConfig.map((config) => {
                        const active = layoutLabel === config.id;
                        return (
                          <button
                            key={config.id}
                            type="button"
                            title={layoutShort(config.id)}
                            onClick={() => {
                              setPageLayouts((prev) => ({ ...prev, [page.index]: config.id }));
                              setPageImages((prev) => ({ ...prev, [page.index]: { ...(prev[page.index] ?? {}), layout: config.id } }));
                            }}
                            className={`shrink-0 flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all ${
                              active ? 'bg-amber-50 ring-2 ring-amber-400/70 ring-offset-1 border border-amber-200/50' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/70'
                            }`}
                          >
                            <div className="w-full aspect-[4/3] rounded overflow-hidden bg-white border border-slate-200/60">
                              <LayoutOptionThumb layoutId={config.id} slotCount={config.slotCount} urls={urls} isActive={active} />
                            </div>
                            <span className="text-[8px] font-semibold leading-none text-slate-600 truncate w-full text-center">{layoutShort(config.id)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div> */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('photoSlots')}</p>
                    <DndContext sensors={slotDndSensors} onDragEnd={handleSlotDragEnd}>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: slotCount }).map((_, si) => {
                          const slotUrl = slotCount > 1 ? urls[si] : (si === 0 ? state.imageDataUrl : undefined);

                          const handleOpenSlot = () => {
                            // If user has picked an image from the left gallery, apply it directly to this slot.
                            if (pendingLibraryImage) {
                              const imgUrl = pendingLibraryImage.url;
                              const imgId = pendingLibraryImage.imageId ?? 0;
                              setPageImages(prev => {
                                const cur = prev[page.index] ?? {};
                                const existingUrls = [...(cur.imageDataUrls ?? (cur.imageDataUrl ? [cur.imageDataUrl] : []))];
                                const existingIds = [...(cur.imageIds ?? [])];
                                while (existingUrls.length <= si) existingUrls.push('');
                                while (existingIds.length <= si) existingIds.push(0);
                                existingUrls[si] = imgUrl;
                                existingIds[si] = imgId;
                                return {
                                  ...prev,
                                  [page.index]: {
                                    ...cur,
                                    imageDataUrl: existingUrls[0] || imgUrl,
                                    imageDataUrls: existingUrls,
                                    imageIds: existingIds,
                                  },
                                };
                              });
                              setPendingLibraryImage(null);
                              return;
                            }

                            // Fallback: open FileVault picker for this specific slot.
                            setPageImagePickerFor({ pageIndex: page.index, layout: layoutLabel, slotIndex: si });
                          };

                          return (
                            <AlbumSlotCard
                              key={si}
                              id={`slot-${page.index}-${si}`}
                              slotIndex={si}
                              url={slotUrl}
                              label={String(si + 1)}
                              onOpenPicker={handleOpenSlot}
                              onRemove={() => {
                                setPageImages(prev => {
                                  const cur = prev[page.index] ?? {};
                                  if (slotCount > 1) {
                                    const u = [...(cur.imageDataUrls ?? [])];
                                    const ids = [...(cur.imageIds ?? [])];
                                    u[si] = '';
                                    ids[si] = 0;
                                    return { ...prev, [page.index]: { ...cur, imageDataUrl: u[0] || '', imageDataUrls: u, imageIds: ids } };
                                  }
                                  return { ...prev, [page.index]: { ...cur, imageDataUrl: undefined, imageDataUrls: undefined, imageIds: undefined } };
                                });
                              }}
                            />
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setPageImagePickerFor({ pageIndex: page.index, layout: layoutLabel })}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 text-xs font-semibold transition-colors"
                        >
                          <FaPlus className="w-3 h-3" /> {t('addPhoto')}
                        </button>
                      </div>
                    </DndContext>
                  </div>
                  {!isCover && !isLast && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('captions')}</p>
                      <div className="space-y-2">
                        {Array.from({ length: slotCount }).map((_, si) => (
                          <input
                            key={si}
                            type="text"
                            placeholder={t('captionPlaceholder', { n: si + 1 })}
                            value={captions[si] ?? ''}
                            onChange={(e) => setCaption(si, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  )}
                  {studioRightTab === 'type' && (isCover || isLast) && (() => {
                    const side = isCover ? effectiveCover : effectiveLast;
                    const merge = (patch: Partial<EditablePageState>) => {
                      const def = isCover ? buildThemeDefaultCover(categorySlug, t) : buildThemeDefaultLast(categorySlug, t);
                      const cur = side ?? def;
                      const next: EditablePageState = {
                        ...cur,
                        ...patch,
                        style: patch.style ? { ...(cur.style ?? {}), ...patch.style } : cur.style,
                      };
                      if (isCover) setEffectiveCover(next);
                      else setEffectiveLast(next);
                    };
                    const fs = side?.style?.fontSize ?? 26;
                    return (
                      <div className="album-builder-studio-panel-inner rounded-3xl p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t('coverTextPanel')}</p>
                          <span className="text-[9px] font-semibold text-[#4648d4]">{isCover ? t('frontCover') : t('backCover')}</span>
                        </div>
                        {/* <div className="flex flex-wrap gap-1">
                          {([
                            ['birthday', () => {
                              if (isCover) setEffectiveCover(buildThemeDefaultCover('birthday', t));
                              else setEffectiveLast(buildThemeDefaultLast(categorySlug, t));
                            }],
                            ['wedding', () => {
                              if (isCover) setEffectiveCover(buildThemeDefaultCover('wedding', t));
                              else setEffectiveLast(buildThemeDefaultLast(categorySlug, t));
                            }],
                            ['anniversary', () => {
                              if (isCover) setEffectiveCover(buildThemeDefaultCover('anniversary', t));
                              else setEffectiveLast(buildThemeDefaultLast(categorySlug, t));
                            }],
                            ['minimal', () => {
                              if (isCover) setEffectiveCover(buildMinimalPresetCover(t));
                              else {
                                setEffectiveLast({
                                  headline: t('presetMinimalHeadline'),
                                  subheadline: '',
                                  description: '',
                                  style: {
                                    fontSize: 20,
                                    fontWeight: 600,
                                    align: 'center',
                                    verticalAlign: 'center',
                                    headlineColor: '#ffffff',
                                    subheadlineColor: '#e5e7eb',
                                    logoPosition: 'bottom-center',
                                    logoSize: 0,
                                  },
                                });
                              }
                            }],
                          ] as const).map(([key, fn]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={fn}
                              className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/80 transition-colors"
                            >
                              {key === 'birthday' ? t('presetBirthday') : key === 'wedding' ? t('presetWedding') : key === 'anniversary' ? t('presetAnniversary') : t('presetMinimal')}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <label className="block">
                            <span className="text-[10px] font-semibold text-slate-500">{t('fieldTitle')}</span>
                            <input
                              type="text"
                              value={side?.headline ?? ''}
                              onChange={(e) => merge({ headline: e.target.value })}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-semibold text-slate-500">{t('fieldSubtitle')}</span>
                            <input
                              type="text"
                              value={side?.subheadline ?? ''}
                              onChange={(e) => merge({ subheadline: e.target.value })}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-semibold text-slate-500">{t('fieldDescription')}</span>
                            <textarea
                              rows={2}
                              value={side?.description ?? ''}
                              onChange={(e) => merge({ description: e.target.value })}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 resize-none"
                            />
                          </label>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 mb-1.5">{t('decorativeIcon')}</p>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => merge({ style: { ...side?.style, logoDataUrl: undefined, logoSize: 0 } })}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              {t('decalNone')}
                            </button>
                            {([
                              ['cake', COVER_DECAL_SVGS.cake],
                              ['rings', COVER_DECAL_SVGS.rings],
                              ['heart', COVER_DECAL_SVGS.heart],
                              ['balloon', COVER_DECAL_SVGS.balloon],
                              ['star', COVER_DECAL_SVGS.star],
                            ] as const).map(([id, src]) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => merge({ style: { ...side?.style, logoDataUrl: src, logoSize: 52, logoPosition: 'top-center' } })}
                                className="h-9 w-9 rounded-lg border border-slate-200 bg-white p-0.5 hover:border-indigo-400"
                              >
                                <img src={src} alt="" className="h-full w-full object-contain" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block col-span-2">
                            <span className="text-[10px] font-semibold text-slate-500">{t('titleSize')}</span>
                            <input
                              type="range"
                              min={16}
                              max={48}
                              value={fs}
                              onChange={(e) => merge({ style: { ...side?.style, fontSize: Number(e.target.value) } })}
                              className="mt-1 w-full accent-indigo-600"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-semibold text-slate-500">{t('textAlign')}</span>
                            <select
                              value={side?.style?.align ?? 'center'}
                              onChange={(e) => merge({ style: { ...side?.style, align: e.target.value as 'left' | 'center' | 'right' } })}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                            >
                              <option value="left">{t('alignLeft')}</option>
                              <option value="center">{t('alignCenter')}</option>
                              <option value="right">{t('alignRight')}</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-semibold text-slate-500">{t('verticalAlignLabel')}</span>
                            <select
                              value={side?.style?.verticalAlign ?? 'center'}
                              onChange={(e) => merge({ style: { ...side?.style, verticalAlign: e.target.value as 'top' | 'center' | 'bottom' } })}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                            >
                              <option value="top">{t('alignTop')}</option>
                              <option value="center">{t('alignCenter')}</option>
                              <option value="bottom">{t('alignBottom')}</option>
                            </select>
                          </label>
                        </div> */}
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {t('editIn')}{' '}
                          <button
                            type="button"
                            onClick={() => navigate(`/photo-themes/${categorySlug}`, { state: { templateId: dbTemplateId, photobookId } })}
                            className="font-semibold text-[#4648d4] underline underline-offset-2"
                          >
                            {t('coverEditorLink')}
                          </button>
                        </p>
                      </div>
                    );
                  })()}
                  {studioRightTab === 'effects' && (
                    <div className="space-y-4">
                      {categorySlug === 'anniversary' && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('theme')}</p>
                          <select
                            className="w-full rounded-xl border border-white/10 bg-[#14141d] px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
                            value={selectedColorTheme}
                            onChange={(e) => setSelectedColorTheme(e.target.value)}
                          >
                            {anniversaryColorThemes.map((theme) => (
                              <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {categorySlug === 'wedding' && (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('background')}</p>
                          <select
                            className="w-full rounded-xl border border-white/10 bg-[#14141d] px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
                            value={selectedWeddingBackground}
                            onChange={(e) => setSelectedWeddingBackground(e.target.value)}
                          >
                            {weddingBackgroundThemes.map((theme) => (
                              <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {categorySlug !== 'anniversary' && categorySlug !== 'wedding' && (
                        <p className="text-xs text-slate-500">{t('layoutSettings')}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-white/10 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('legendaryEngine')}</span>
                </div>
              </aside>
            </>
          );
        })()}
      </div>

      {/* Studio footer CTA */}
      <footer className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-3xl border-t border-slate-200/60 h-20 flex items-center justify-between px-6 sm:px-12 lg:pl-80 lg:pr-80">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </div>
            <span className="font-black uppercase tracking-[0.15em] text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline">
              {t('legendaryEngine')}
            </span>
          </div>
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#4648d4] hover:bg-slate-50 border border-transparent hover:border-slate-200"
              title={t('undo')}
              disabled
            >
              ↶
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#4648d4] hover:bg-slate-50 border border-transparent hover:border-slate-200"
              title={t('redo')}
              disabled
            >
              ↷
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={handleSaveAlbum}
            disabled={isSaving}
            className="px-5 sm:px-8 py-3 font-bold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 text-sm disabled:opacity-50"
          >
            {t('saveDraft')}
          </button>
          <button
            type="button"
            onClick={handleSaveAlbum}
            disabled={isSaving}
            className="px-6 sm:px-10 py-3.5 bg-[#4648d4] text-white font-black rounded-2xl shadow-[0_25px_50px_-12px_rgba(70,72,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.12em] disabled:opacity-50"
          >
            {isSaving ? <FaSpinner className="animate-spin" /> : null}
            {t('confirmFinalize')}
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Bottom filmstrip — page thumbnails */}
      <div className="no-print border-t border-slate-200/80 bg-white flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 overflow-x-auto shadow-[0_-4px_12px_rgba(0,0,0,0.04)] mb-20">
        <div ref={stepperRef} className="flex items-center gap-2 overflow-x-auto scroll-smooth flex-1 min-w-0" style={{ scrollPaddingInline: '8px' }}>
          {albumPages.map((p, i) => {
            const pState = pageImages[p.index] ?? {};
            const hasImg = !!(pState.imageDataUrl || (pState.imageDataUrls?.length ?? 0) > 0);
            const active = i === Math.min(currentStep, albumPages.length - 1);
            return (
              <button
                key={p.index}
                type="button"
                data-active-step={active ? 'true' : undefined}
                onClick={() => setCurrentStep(i)}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${active ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/30' : hasImg ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-80'
                  }`}
                style={{ width: 40, height: 30 }}
                title={p.type === 'cover' ? t('cover') : p.type === 'last' ? t('back') : t('pageLabel', { n: p.index + 1 })}
              >
                {hasImg && pState.imageDataUrl ? (
                  <img src={pState.imageDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-semibold ${active ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                    {p.type === 'cover' ? t('thumbLetterCover') : p.type === 'last' ? t('thumbLetterBack') : p.index + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setPageCount((c) => Math.min(18, c + 1))} disabled={pageCount >= 18} className="shrink-0 rounded-lg border-2 border-dashed border-slate-300 w-10 h-9 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50 transition-colors" title={t('addPageTitle')}><FaPlus className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => setPageCount((c) => Math.max(6, c - 1))} disabled={pageCount <= 6} className="shrink-0 rounded-lg border border-slate-200 w-10 h-9 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors" title={t('deletePageTitle')}><FaTrash className="w-3.5 h-3.5" /></button>
      </div>

      {/* PDF generation overlay */}
      {((isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64) && pdfProgress) && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-600">{Math.round((pdfProgress.current / pdfProgress.total) * 100)}%</span>
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">{isGeneratingBase64 ? t('generatingBase64') : isGeneratingZip ? t('generatingZip') : isGeneratingFlipbook ? t('generatingFlipbook') : t('generatingPdf')}</h3>
            <p className="text-xs text-slate-500 mb-4">{t('renderingPage', { current: pdfProgress.current, total: pdfProgress.total })}</p>
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
              <FaCheck className="w-3.5 h-3.5" /> {t('albumSaved')}
            </div>
          )}
        </div>,
        document.body
      )}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

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
                  <span className="text-sm font-bold text-white tracking-wide">{t('flipBook')}</span>
                  <span className="ml-2 text-[10px] text-white/40 capitalize">{categorySlug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Orientation toggle */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setBookOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${bookOrientation === 'landscape'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                      }`}
                  >
                    {t('landscape')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${bookOrientation === 'portrait'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/70'
                      }`}
                  >
                    {t('portrait')}
                  </button>
                </div>
                {/* Download same book — multiple formats: flipbook, images ZIP, PDF, or Base64 JSON */}
                <button
                  type="button"
                  onClick={handleDownloadFlipbook}
                  disabled={isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64}
                  title={t('flipbookDownloadTitle')}
                  className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isGeneratingFlipbook ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  {t('flipbookBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImagesZip}
                  disabled={isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64}
                  title={t('zipDownloadTitle')}
                  className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isGeneratingZip ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  {t('imagesZip')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBase64}
                  disabled={isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64}
                  title={t('base64DownloadTitle')}
                  className="rounded-lg bg-slate-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isGeneratingBase64 ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  {t('base64')}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || isGeneratingFlipbook || isGeneratingZip || isGeneratingBase64}
                  title={t('pdfDownloadTitle')}
                  className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isGeneratingPdf ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaDownload className="w-3 h-3" />}
                  {t('pdf')}
                </button>
                {/* Page view switch */}
                <button
                  type="button"
                  onClick={() => { setShowFlipBook(false); setShowSinglePageView(true); setSinglePageIndex(0); }}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  {t('pageView')}
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
                {flipBookAlbumPages.map((page) => (
                  <FlipBookPage key={`${page.index}-${page.coverSplit ?? 'full'}`}>
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
                    {t('pageNOfTotal', { n: flipBookPage + 1, total: flipBookAlbumPages.length })}
                  </span>
                </div>
                {/* Progress dots */}
                <div className="hidden sm:flex items-center gap-1">
                  {flipBookAlbumPages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === flipBookPage ? 'bg-indigo-400 w-4' : idx < flipBookPage ? 'bg-white/30' : 'bg-white/10'
                        }`}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">←</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">→</kbd>
                  <span>{t('flipPages')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px]">Esc</kbd>
                  <span>{t('closeHint')}</span>
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
                    {albumPages[singlePageIndex]?.type === 'cover' ? t('frontCover') :
                      albumPages[singlePageIndex]?.type === 'last' ? t('backCover') :
                        t('pageLabel', { n: singlePageIndex + 1 })}
                  </span>
                  <span className="ml-2 text-[10px] text-white/30">{t('pageNOfTotal', { n: singlePageIndex + 1, total: albumPages.length })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Slideshow controls */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06] mr-1">
                  <button
                    type="button"
                    onClick={() => setSlideshowActive(p => !p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all inline-flex items-center gap-1 ${slideshowActive ? 'bg-indigo-500/30 text-indigo-300' : 'text-white/40 hover:text-white/70'
                      }`}
                    title={slideshowActive ? t('slideshowPause') : t('slideshowStart')}
                  >
                    {slideshowActive ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                    {slideshowActive ? t('pause') : t('play')}
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
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all border border-white/[0.06] inline-flex items-center gap-1 ${isZoomed ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40 hover:text-white/70'
                    }`}
                  title={t('toggleZoom')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </button>
                {/* Orientation toggle */}
                <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setBookOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${bookOrientation === 'landscape' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                  >
                    {t('landscape')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${bookOrientation === 'portrait' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                  >
                    {t('portrait')}
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
                  {t('pdf')}
                </button>
                {/* Switch to Flip Book */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSinglePageView(false);
                    setSlideshowActive(false);
                    flipOpenTargetRef.current = singlePageIndex;
                    setFlipBookPage(singlePageIndex);
                    setShowFlipBook(true);
                  }}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]"
                >
                  {t('flipBook')}
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
                      className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === singlePageIndex
                          ? 'border-indigo-400 shadow-lg shadow-indigo-500/30 scale-110'
                          : idx < singlePageIndex
                            ? 'border-white/15 opacity-70 hover:opacity-100'
                            : 'border-white/10 opacity-50 hover:opacity-100'
                        }`}
                      style={thumbAspect}
                    >
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={t('pageLabel', { n: idx + 1 })} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <span className="text-[8px] text-slate-500 font-bold">{page.type === 'cover' ? t('thumbLetterCover') : page.type === 'last' ? t('thumbLetterLast') : idx + 1}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="hidden sm:flex items-center justify-center gap-4 mt-1.5 text-[9px] text-white/25">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">←</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">→</kbd> {t('navigate')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Space</kbd> {t('playPause')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Z</kbd> {t('zoom')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Esc</kbd> {t('closeHint')}
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
          const totalSlots = getSlotCountForLayoutId(pickerLayout);
          const isMulti = totalSlots > 1;

          const targetSlotIndex = pageImagePickerFor.slotIndex;
          const applySinglePick = (picked: { name: string; dataUrl: string; imageId?: number }) => {
            const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
            const imgId = picked.imageId ?? 0;
            setPageImages((prev) => {
              const current = prev[pickerPageIdx] ?? {};
              const existingUrls = [...(current.imageDataUrls ?? (current.imageDataUrl ? [current.imageDataUrl] : []))];
              const existingIds = [...(current.imageIds ?? [])];
              if (targetSlotIndex !== undefined) {
                while (existingUrls.length <= targetSlotIndex) existingUrls.push('');
                while (existingIds.length <= targetSlotIndex) existingIds.push(0);
                existingUrls[targetSlotIndex] = imgUrl;
                existingIds[targetSlotIndex] = imgId;
                return {
                  ...prev,
                  [pickerPageIdx]: {
                    ...current,
                    imageDataUrl: existingUrls[0] || '',
                    imageDataUrls: existingUrls,
                    imageIds: existingIds,
                  },
                };
              }
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

              // Start from existing slots so we don't wipe out other images
              const existingUrls = current.imageDataUrls ?? (current.imageDataUrl ? [current.imageDataUrl] : []);
              const newUrls: string[] = [...existingUrls];
              const existingIds = current.imageIds ?? [];
              const newIds: number[] = [...existingIds];

              while (newUrls.length < totalSlots) newUrls.push('');
              while (newIds.length < totalSlots) newIds.push(0);

              // If user opened picker from a specific slot, start filling from there
              const startSlot = targetSlotIndex ?? 0;

              picks.forEach((p, idx) => {
                const slot = startSlot + idx;
                if (slot >= totalSlots) return;
                newUrls[slot] = p.imageId ? buildPreviewUrl(p.imageId) : p.dataUrl;
                newIds[slot] = p.imageId ?? 0;
              });

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
                      {targetSlotIndex !== undefined
                        ? t('replaceSlot', { n: targetSlotIndex + 1 })
                        : isMulti
                          ? t('selectPhotos', { count: totalSlots })
                          : t('selectPhoto')}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {targetSlotIndex !== undefined
                        ? t('chooseForSlot', { n: targetSlotIndex + 1 })
                        : isMulti
                          ? t('chooseUpTo', {
                            count: totalSlots,
                            fromAlbum: studioAlbumImageIds ? t('fromAlbum') : t('fromLibrary'),
                          })
                          : t('clickToSelect', {
                            fromAlbum: studioAlbumImageIds ? t('fromAlbumSuffix') : '',
                          })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPageImagePickerFor(null)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>

                {/* Image picker — multi-select for multi-image layouts */}
                <div className="p-4 overflow-y-auto flex-1">
                  <FileVaultImagePicker
                    allowMultiSelect={isMulti}
                    filterImageIds={studioAlbumImageIds ?? undefined}
                    onPick={async (picked) => {
                      if (targetSlotIndex !== undefined || !isMulti) {
                        applySinglePick(picked);
                        return;
                      }
                      // Multi layout, no specific slot: fill next empty slot
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
                      setPageImagePickerFor(null);
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
