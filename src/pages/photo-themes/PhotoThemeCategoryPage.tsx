import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaStar,
  FaHeart,
  FaUsers,
  FaCalendarAlt,
  FaBriefcase,
  FaCloud,
  FaImages,
  FaFolderOpen,
  FaPalette,
  FaGripVertical,
  FaArrowLeft,
  FaChevronRight,
  FaSpinner,
} from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';
import imageService from '../../api/services/imageService';
import { getStoredToken } from '../../utils/authUtils';
import { FileVaultImagePicker } from '../../components/PhotoBook/FileVaultImagePicker';

/** Same host as `api` — `<img src>` must be absolute when the SPA is not served from the API origin. */
function getApiBaseForAssets(): string {
  const env = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const ax = api.defaults.baseURL;
  if (typeof ax === 'string' && ax.trim()) return ax.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** `<img src>` cannot send Authorization; append token for authenticated preview (same as PhotoBook hub). */
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

function resolveBackendImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  const idMatch = url.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/i);
  if (idMatch) return buildPreviewUrl(Number(idMatch[1]));
  if (url.startsWith('http://') || url.startsWith('https://')) return appendPreviewToken(url);
  const base = getApiBaseForAssets();
  const path = url.startsWith('/') ? url : `/${url}`;
  return appendPreviewToken(`${base}${path}`);
}

type PageKind = 'cover' | 'last';

/** Draggable extra text on the text-side preview (stored in localStorage with leaf extras). */
export type TextSideOverlay = {
  id: string;
  text: string;
  /** 0–100 from left of preview box */
  x: number;
  /** 0–100 from top of preview box */
  y: number;
  fontSize?: number;
  color?: string;
  /** Full CSS font stack (same preset system as main cover text). */
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  /** Extra legibility on busy backgrounds */
  textShadow?: boolean;
};

export type EditablePageState = {
  headline: string;
  subheadline: string;
  description: string;
  imageDataUrl?: string;
  imageId?: number;
  previewUrl?: string;
  style?: {
    fontSize?: number;
    fontWeight?: number;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    fontFamily?: string;
    headlineColor?: string;
    subheadlineColor?: string;
    imageScale?: number;
    overlayOpacity?: number;
    overlayGradientDirection?: 'top-bottom' | 'bottom-top' | 'radial';
    overlayColor?: string;
    letterSpacing?: number;
    lineHeight?: number;
    textShadow?: boolean;
    dividerEnabled?: boolean;
    dividerWidth?: number;
    dividerColor?: string;
    blurBackground?: boolean;
    vignette?: boolean;
    darkModeCover?: boolean;
    subtleAnimation?: boolean;
    /** Photo-side scrim (`gradient` from API / cover save) */
    gradient?: string;
    logoDataUrl?: string;
    logoImageId?: number;
    logoPosition?: 'top-left' | 'top-right' | 'top-center' | 'bottom-center';
    logoPositionX?: number;
    logoPositionY?: number;
    logoSize?: number;
    /** First flip side: text on glass / gradient (also sent on /api/photobooks/:id/covers + localStorage backup). */
    textLeafBgMode?: 'gradient' | 'image';
    textLeafBgGradient?: string;
    textLeafBgImageUrl?: string;
    textLeafBgImageId?: number;
    textPanelBlurPx?: number;
    /** 0–100 glass fill opacity (over blur) */
    textPanelGlassOpacity?: number;
    textPanelGlassColor?: string;
    /** Free-position labels on the text-side preview (sent as JSON on cover save). */
    textSideOverlays?: TextSideOverlay[];
    /** Optional overrides for the description block (textarea + text-side preview). When unset, defaults follow title/subtitle typography. */
    descriptionFontSize?: number;
    descriptionColor?: string;
    descriptionFontWeight?: number;
    descriptionLineHeight?: number;
    descriptionLetterSpacing?: number;
    /** Full CSS font stack; when empty, uses main `fontFamily`. */
    descriptionFontFamily?: string;
    descriptionAlign?: 'left' | 'center' | 'right';
  };
};

/** Resolved CSS for description — uses explicit `description*` fields when set, else sensible defaults from main typography. */
export function getDescriptionTypographyStyle(
  style: EditablePageState['style'] | undefined,
): React.CSSProperties {
  const s = style;
  const baseFs = s?.fontSize ?? 20;
  const defaultFs = Math.max(11, baseFs - 8);
  const famRaw = s?.descriptionFontFamily;
  const fontFamily =
    famRaw != null && String(famRaw).trim() !== '' ? String(famRaw).trim() : s?.fontFamily || undefined;
  return {
    fontSize: s?.descriptionFontSize ?? defaultFs,
    color: s?.descriptionColor ?? s?.subheadlineColor ?? '#475569',
    fontFamily: fontFamily || undefined,
    lineHeight: s?.descriptionLineHeight ?? s?.lineHeight ?? 1.55,
    letterSpacing:
      s?.descriptionLetterSpacing != null
        ? `${s.descriptionLetterSpacing}px`
        : s?.letterSpacing != null
          ? `${s.letterSpacing}px`
          : undefined,
    fontWeight:
      s?.descriptionFontWeight ??
      Math.max(400, (s?.fontWeight ?? 700) - 250),
    textAlign: (s?.descriptionAlign ?? s?.align ?? 'center') as React.CSSProperties['textAlign'],
  };
}

type ThemeMeta = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

type ApiCoverSide = {
  id?: number;
  userId?: number;
  templateId?: number;
  coverType?: 'FRONT_COVER' | 'BACK_COVER';
  headline: string;
  subheadline: string;
  description?: string;
  fontSize?: number;
  fontWeight?: string | number;
  align?: 'left' | 'center' | 'right';
  position?: 'top' | 'center' | 'bottom';
  fontFamily?: string;
  headlineColor?: string;
  subheadlineColor?: string;
  imageId?: number | null;
  imageUrl?: string | null;
  imageZoom?: number;
  overlayOpacity?: number;
  gradient?: string;
  overlayColor?: string;
  backgroundBlur?: boolean;
  backgroundVignette?: boolean;
  backgroundDarkMode?: boolean;
  backgroundAnimation?: boolean;
  logoImageId?: number | null;
  logoImageUrl?: string | null;
  logoPosition?: string;
  logoSize?: number;
  /** Text-side flip (same fields as `EditablePageState.style`) — backend may persist as JSON */
  textLeafBgMode?: 'gradient' | 'image';
  textLeafBgGradient?: string;
  textLeafBgImageUrl?: string;
  textLeafBgImageId?: number;
  textPanelBlurPx?: number;
  textPanelGlassOpacity?: number;
  textPanelGlassColor?: string;
  textSideOverlays?: TextSideOverlay[];
  letterSpacing?: number;
  lineHeight?: number;
  textShadow?: boolean;
  dividerEnabled?: boolean;
  dividerWidth?: number;
  dividerColor?: string;
  logoPositionX?: number;
  logoPositionY?: number;
  descriptionFontSize?: number;
  descriptionColor?: string;
  descriptionFontWeight?: number;
  descriptionLineHeight?: number;
  descriptionLetterSpacing?: number;
  descriptionFontFamily?: string;
  descriptionAlign?: 'left' | 'center' | 'right';
  /**
   * Single JSON string of text-side / overlay extras (same object as flat fields above).
   * Backends that cannot add many columns can persist this one field and return it on GET.
   */
  coverStyleExtrasJson?: string | null;
};

type ApiCoverRecord = {
  userId: number;
  templateId: number;
  frontCover: ApiCoverSide;
  backCover: ApiCoverSide;
};

const COVER_LEAF_EXTRAS_KEY = (photobookId: number) => `filevault_cover_leaf_v1_${photobookId}`;

type CoverLeafExtrasBlob = {
  front?: Partial<NonNullable<EditablePageState['style']>>;
  back?: Partial<NonNullable<EditablePageState['style']>>;
};

function loadCoverLeafExtras(photobookId: number | null): CoverLeafExtrasBlob {
  if (!photobookId) return {};
  try {
    const raw = localStorage.getItem(COVER_LEAF_EXTRAS_KEY(photobookId));
    if (!raw) return {};
    return JSON.parse(raw) as CoverLeafExtrasBlob;
  } catch {
    return {};
  }
}

function saveCoverLeafExtras(
  photobookId: number,
  front: EditablePageState['style'],
  back: EditablePageState['style']
) {
  try {
    localStorage.setItem(
      COVER_LEAF_EXTRAS_KEY(photobookId),
      JSON.stringify({ front: pickLeafStyleForStorage(front), back: pickLeafStyleForStorage(back) })
    );
  } catch {
    /* ignore quota */
  }
}

function pickLeafStyleForStorage(style: EditablePageState['style'] | undefined): Partial<NonNullable<EditablePageState['style']>> {
  if (!style) return {};
  const {
    textLeafBgMode,
    textLeafBgGradient,
    textLeafBgImageUrl,
    textLeafBgImageId,
    textPanelBlurPx,
    textPanelGlassOpacity,
    textPanelGlassColor,
    textSideOverlays,
  } = style;
  return {
    ...(textLeafBgMode != null ? { textLeafBgMode } : {}),
    ...(textLeafBgGradient != null ? { textLeafBgGradient } : {}),
    ...(textLeafBgImageUrl != null ? { textLeafBgImageUrl } : {}),
    ...(textLeafBgImageId != null ? { textLeafBgImageId } : {}),
    ...(textPanelBlurPx != null ? { textPanelBlurPx } : {}),
    ...(textPanelGlassOpacity != null ? { textPanelGlassOpacity } : {}),
    ...(textPanelGlassColor != null ? { textPanelGlassColor } : {}),
    ...(textSideOverlays != null && textSideOverlays.length > 0 ? { textSideOverlays } : {}),
  };
}

function mergeLeafExtrasIntoPage(
  page: EditablePageState,
  extras: Partial<NonNullable<EditablePageState['style']>> | undefined
): EditablePageState {
  if (!extras || Object.keys(extras).length === 0) return page;
  return { ...page, style: { ...page.style, ...extras } };
}

/** Text-side flip + overlays + typography extras for POST /api/photobooks/:id/covers */
function coverLeafFieldsToApi(style: EditablePageState['style'] | undefined): Partial<ApiCoverSide> {
  if (!style) return {};
  const o: Partial<ApiCoverSide> = {};
  if (style.textLeafBgMode != null) o.textLeafBgMode = style.textLeafBgMode;
  if (style.textLeafBgGradient != null) o.textLeafBgGradient = style.textLeafBgGradient;
  if (style.textLeafBgImageUrl != null) o.textLeafBgImageUrl = style.textLeafBgImageUrl;
  if (style.textLeafBgImageId != null) o.textLeafBgImageId = style.textLeafBgImageId;
  if (style.textPanelBlurPx != null) o.textPanelBlurPx = style.textPanelBlurPx;
  if (style.textPanelGlassOpacity != null) o.textPanelGlassOpacity = style.textPanelGlassOpacity;
  if (style.textPanelGlassColor != null) o.textPanelGlassColor = style.textPanelGlassColor;
  if (style.textSideOverlays != null) o.textSideOverlays = style.textSideOverlays;
  if (style.letterSpacing != null) o.letterSpacing = style.letterSpacing;
  if (style.lineHeight != null) o.lineHeight = style.lineHeight;
  if (style.textShadow != null) o.textShadow = style.textShadow;
  if (style.dividerEnabled != null) o.dividerEnabled = style.dividerEnabled;
  if (style.dividerWidth != null) o.dividerWidth = style.dividerWidth;
  if (style.dividerColor != null) o.dividerColor = style.dividerColor;
  if (style.logoPositionX != null) o.logoPositionX = style.logoPositionX;
  if (style.logoPositionY != null) o.logoPositionY = style.logoPositionY;
  if (style.descriptionFontSize != null) o.descriptionFontSize = style.descriptionFontSize;
  if (style.descriptionColor != null) o.descriptionColor = style.descriptionColor;
  if (style.descriptionFontWeight != null) o.descriptionFontWeight = style.descriptionFontWeight;
  if (style.descriptionLineHeight != null) o.descriptionLineHeight = style.descriptionLineHeight;
  if (style.descriptionLetterSpacing != null) o.descriptionLetterSpacing = style.descriptionLetterSpacing;
  if (style.descriptionFontFamily != null) o.descriptionFontFamily = style.descriptionFontFamily;
  if (style.descriptionAlign != null) o.descriptionAlign = style.descriptionAlign;
  return o;
}

function coverLeafFieldsFromApi(side: ApiCoverSide): Partial<NonNullable<EditablePageState['style']>> {
  const o: Partial<NonNullable<EditablePageState['style']>> = {};
  if (side.textLeafBgMode != null) o.textLeafBgMode = side.textLeafBgMode;
  if (side.textLeafBgGradient != null) o.textLeafBgGradient = side.textLeafBgGradient;
  if (side.textLeafBgImageUrl != null) o.textLeafBgImageUrl = side.textLeafBgImageUrl;
  if (side.textLeafBgImageId != null) o.textLeafBgImageId = side.textLeafBgImageId;
  if (side.textPanelBlurPx != null) o.textPanelBlurPx = side.textPanelBlurPx;
  if (side.textPanelGlassOpacity != null) o.textPanelGlassOpacity = side.textPanelGlassOpacity;
  if (side.textPanelGlassColor != null) o.textPanelGlassColor = side.textPanelGlassColor;
  if (side.textSideOverlays != null) o.textSideOverlays = side.textSideOverlays;
  if (side.letterSpacing != null) o.letterSpacing = side.letterSpacing;
  if (side.lineHeight != null) o.lineHeight = side.lineHeight;
  if (side.textShadow != null) o.textShadow = side.textShadow;
  if (side.dividerEnabled != null) o.dividerEnabled = side.dividerEnabled;
  if (side.dividerWidth != null) o.dividerWidth = side.dividerWidth;
  if (side.dividerColor != null) o.dividerColor = side.dividerColor;
  if (side.logoPositionX != null) o.logoPositionX = side.logoPositionX;
  if (side.logoPositionY != null) o.logoPositionY = side.logoPositionY;
  if (side.descriptionFontSize != null) o.descriptionFontSize = side.descriptionFontSize;
  if (side.descriptionColor != null) o.descriptionColor = side.descriptionColor;
  if (side.descriptionFontWeight != null) o.descriptionFontWeight = side.descriptionFontWeight;
  if (side.descriptionLineHeight != null) o.descriptionLineHeight = side.descriptionLineHeight;
  if (side.descriptionLetterSpacing != null) o.descriptionLetterSpacing = side.descriptionLetterSpacing;
  if (side.descriptionFontFamily != null) o.descriptionFontFamily = side.descriptionFontFamily;
  if (side.descriptionAlign != null) o.descriptionAlign = side.descriptionAlign;
  return o;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').slice(0, 6);
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isApiCoverSideEmpty(side: ApiCoverSide | undefined | null): boolean {
  if (!side) return true;
  const h = (side.headline || '').trim();
  const s = (side.subheadline || '').trim();
  const d = (side.description || '').trim();
  const imgId = side.imageId != null && Number(side.imageId) > 0;
  const url = typeof side.imageUrl === 'string' && side.imageUrl.length > 3;
  return !h && !s && !d && !imgId && !url;
}

function normalizeLogoPosition(
  p?: string | null
): 'top-left' | 'top-right' | 'top-center' | 'bottom-center' | undefined {
  if (!p) return undefined;
  const u = String(p).toUpperCase().replace(/-/g, '_');
  if (u.includes('TOP') && u.includes('CENTER')) return 'top-center';
  if (u.includes('TOP') && u.includes('RIGHT')) return 'top-right';
  if (u.includes('BOTTOM')) return 'bottom-center';
  if (u.includes('TOP') && u.includes('LEFT')) return 'top-left';
  return undefined;
}

function getLogoPresetCoords(pos?: 'top-left' | 'top-right' | 'top-center' | 'bottom-center') {
  if (pos === 'top-right') return { x: 88, y: 12 };
  if (pos === 'top-center') return { x: 50, y: 12 };
  if (pos === 'bottom-center') return { x: 50, y: 88 };
  return { x: 12, y: 12 };
}

/** Full CSS stacks saved in state / API; dropdown uses preset keys — keep in sync with PageEditorCard `<option>` list. */
type FontFamilyPreset =
  | 'system'
  | 'sans'
  | 'serif'
  | 'mono'
  | 'rounded'
  | 'display'
  | 'elegant'
  | 'script'
  | 'slab';

const FONT_FAMILY_PRESETS: Record<Exclude<FontFamilyPreset, 'system'>, string> = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  mono: '"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  rounded: '"Nunito", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  display: '"Oswald", "Arial Narrow", "Franklin Gothic Medium", "Helvetica Neue", sans-serif',
  elegant: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  script: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", "Apple Chancery", cursive',
  slab: 'Rockwell, "Courier New", "Courier Bold", "Rockwell Nova", serif',
};

const FONT_PRESET_ORDER: Exclude<FontFamilyPreset, 'system'>[] = [
  'sans',
  'serif',
  'mono',
  'rounded',
  'display',
  'elegant',
  'script',
  'slab',
];

function fontFamilyStoredToPreset(stored: string | undefined): FontFamilyPreset {
  if (stored == null || String(stored).trim() === '') return 'system';
  const s = String(stored).trim();
  for (const key of FONT_PRESET_ORDER) {
    if (s === FONT_FAMILY_PRESETS[key]) return key;
  }
  const lower = s.toLowerCase();
  if (lower.includes('brush script') || lower.includes('chancery') || (lower.includes('script') && !lower.includes('description'))) return 'script';
  if (lower.includes('oswald') || lower.includes('impact') || lower.includes('arial narrow')) return 'display';
  if (lower.includes('cormorant') || lower.includes('garamond') || lower.includes('palatino') || lower.includes('book antiqua')) return 'elegant';
  if (lower.includes('nunito') || lower.includes('rounded')) return 'rounded';
  if (lower.includes('rockwell') || lower.includes('slab')) return 'slab';
  if (lower.includes('georgia') || lower.includes('times new roman') || lower.includes('cambria')) return 'serif';
  if (lower.includes('courier') || lower.includes('consolas') || /\bmono\b/i.test(s)) return 'mono';
  if (lower.includes('system-ui') || lower.includes('segoe ui') || lower.includes('apple-system')) return 'sans';
  return 'sans';
}

function fontPresetToStored(preset: FontFamilyPreset): string | undefined {
  if (preset === 'system') return undefined;
  return FONT_FAMILY_PRESETS[preset];
}

type CoverStylePresetId = 'editorial' | 'celebration' | 'heritage' | 'futuristic';

type CoverStylePreset = {
  id: CoverStylePresetId;
  labelKey: 'presetEditorial' | 'presetCelebration' | 'presetHeritage' | 'presetFuturistic';
  previewBg: string;
  labelClass: string;
  stylePatch: Partial<NonNullable<EditablePageState['style']>>;
};

const COVER_STYLE_PRESETS: CoverStylePreset[] = [
  {
    id: 'editorial',
    labelKey: 'presetEditorial',
    previewBg: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
    labelClass: 'text-[#4648d4]',
    stylePatch: {
      fontFamily: FONT_FAMILY_PRESETS.elegant,
      fontSize: 26,
      fontWeight: 700,
      align: 'center',
      verticalAlign: 'center',
      headlineColor: '#0f172a',
      subheadlineColor: '#475569',
      descriptionColor: '#64748b',
      textLeafBgMode: 'gradient',
      textLeafBgGradient: 'linear-gradient(145deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)',
      textPanelGlassColor: '#ffffff',
      textPanelGlassOpacity: 45,
      textPanelBlurPx: 18,
      gradient: 'linear-gradient(to top, rgba(15,23,42,0.45), transparent)',
      overlayOpacity: 35,
      vignette: true,
      textShadow: false,
      subtleAnimation: false,
    },
  },
  {
    id: 'celebration',
    labelKey: 'presetCelebration',
    previewBg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    labelClass: 'text-white',
    stylePatch: {
      fontFamily: FONT_FAMILY_PRESETS.display,
      fontSize: 30,
      fontWeight: 800,
      align: 'center',
      verticalAlign: 'center',
      headlineColor: '#ffffff',
      subheadlineColor: '#fce7f3',
      descriptionColor: '#fdf2f8',
      textLeafBgMode: 'gradient',
      textLeafBgGradient: 'linear-gradient(145deg, #ec4899 0%, #f43f5e 45%, #fbbf24 100%)',
      textPanelGlassColor: '#ffffff',
      textPanelGlassOpacity: 28,
      textPanelBlurPx: 22,
      gradient: 'linear-gradient(to top, rgba(236,72,153,0.55), transparent)',
      overlayOpacity: 40,
      vignette: false,
      textShadow: true,
      subtleAnimation: true,
    },
  },
  {
    id: 'heritage',
    labelKey: 'presetHeritage',
    previewBg: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
    labelClass: 'text-amber-100',
    stylePatch: {
      fontFamily: FONT_FAMILY_PRESETS.serif,
      fontSize: 24,
      fontWeight: 700,
      align: 'center',
      verticalAlign: 'bottom',
      headlineColor: '#fef3c7',
      subheadlineColor: '#fde68a',
      descriptionColor: '#fef9c3',
      textLeafBgMode: 'gradient',
      textLeafBgGradient: 'linear-gradient(145deg, #451a03 0%, #92400e 48%, #b45309 100%)',
      textPanelGlassColor: '#78350f',
      textPanelGlassOpacity: 25,
      textPanelBlurPx: 16,
      gradient: 'linear-gradient(to top, rgba(69,26,3,0.6), transparent)',
      overlayOpacity: 45,
      vignette: true,
      textShadow: true,
      subtleAnimation: false,
    },
  },
  {
    id: 'futuristic',
    labelKey: 'presetFuturistic',
    previewBg: 'linear-gradient(135deg, #4648d4 0%, #8b5cf6 100%)',
    labelClass: 'text-white',
    stylePatch: {
      fontFamily: FONT_FAMILY_PRESETS.rounded,
      fontSize: 28,
      fontWeight: 800,
      align: 'left',
      verticalAlign: 'center',
      headlineColor: '#ffffff',
      subheadlineColor: '#c7d2fe',
      descriptionColor: '#e0e7ff',
      textLeafBgMode: 'gradient',
      textLeafBgGradient: 'linear-gradient(145deg, #0f172a 0%, #4648d4 45%, #8b5cf6 100%)',
      textPanelGlassColor: '#6366f1',
      textPanelGlassOpacity: 32,
      textPanelBlurPx: 28,
      gradient: 'linear-gradient(135deg, rgba(70,72,212,0.5), rgba(139,92,246,0.35))',
      overlayOpacity: 30,
      vignette: false,
      blurBackground: true,
      textShadow: true,
      subtleAnimation: true,
    },
  },
];

type ColorSwatchPreset = {
  id: string;
  colors: [string, string, string];
  stylePatch: Partial<NonNullable<EditablePageState['style']>>;
};

const COLOR_SWATCH_PRESETS: ColorSwatchPreset[] = [
  {
    id: 'quantum-rose',
    colors: ['#4648d4', '#ec4899', '#ffffff'],
    stylePatch: {
      headlineColor: '#4648d4',
      subheadlineColor: '#ec4899',
      descriptionColor: '#64748b',
      textPanelGlassColor: '#ffffff',
      textLeafBgGradient: 'linear-gradient(145deg, #4648d4 0%, #ec4899 55%, #ffffff 100%)',
      gradient: 'linear-gradient(to top, rgba(70,72,212,0.4), transparent)',
    },
  },
  {
    id: 'midnight-gold',
    colors: ['#0c0c12', '#f59e0b', '#f1f5f9'],
    stylePatch: {
      headlineColor: '#f1f5f9',
      subheadlineColor: '#f59e0b',
      descriptionColor: '#fde68a',
      textPanelGlassColor: '#0c0c12',
      textLeafBgGradient: 'linear-gradient(145deg, #0c0c12 0%, #1e293b 40%, #f59e0b 100%)',
      gradient: 'linear-gradient(to top, rgba(12,12,18,0.65), transparent)',
    },
  },
  {
    id: 'violet-blush',
    colors: ['#8b5cf6', '#6366f1', '#fbcfe8'],
    stylePatch: {
      headlineColor: '#6366f1',
      subheadlineColor: '#8b5cf6',
      descriptionColor: '#a5b4fc',
      textPanelGlassColor: '#fbcfe8',
      textLeafBgGradient: 'linear-gradient(145deg, #8b5cf6 0%, #6366f1 50%, #fbcfe8 100%)',
      gradient: 'linear-gradient(to top, rgba(99,102,241,0.45), transparent)',
    },
  },
];

function appendEmojiToField(prev: string | undefined, emoji: string): string {
  const p = prev ?? '';
  if (!p.trim()) return emoji;
  return /\s$/.test(p) ? p + emoji : `${p} ${emoji}`;
}

/** Quick-insert emoji sets — front cover: celebration / event; back cover: thanks / closing */
const TEXT_EMOJI_COVER = {
  headline: ['✨', '🎉', '💐', '🥳', '💒', '❤️', '📸', '🌟', '🎂', '🎁'],
  sub: ['📅', '📍', '☀️', '🌸', '💫', '🎀', '✨', '⭐', '🌍', '💍'],
  description: ['💫', '🌿', '📝', '★', '☀️', '🌙', '💝', '✨', '🎵', '👨‍👩‍👧'],
} as const;

const TEXT_EMOJI_BACK = {
  headline: ['🙏', '💌', '✨', '⭐', '💫', '🌙', '🕊️', '💝', '🤍', '🌟'],
  sub: ['📖', '🌿', '📝', '💌', '🌸', '🎀', '✨', '🌅', '💐', '🤗'],
  description: ['💫', '🌿', '📝', '🙏', '🌙', '⭐', '💌', '🌸', '✨', '💭'],
} as const;

const EmojiInsertRow: React.FC<{
  emojis: readonly string[];
  ariaLabel: string;
  accent: 'cyan' | 'rose';
  onPick: (emoji: string) => void;
}> = ({ emojis, ariaLabel, accent, onPick }) => {
  const hover =
    accent === 'cyan'
      ? 'hover:border-cyan-300 hover:bg-cyan-50/90 hover:shadow-md'
      : 'hover:border-rose-300 hover:bg-rose-50/90 hover:shadow-md';
  const focus = accent === 'cyan' ? 'focus:ring-cyan-400/40' : 'focus:ring-rose-400/40';
  return (
    <div className="flex flex-wrap gap-1 mt-1.5" role="group" aria-label={ariaLabel}>
      {emojis.map((em, i) => (
        <button
          key={`${ariaLabel}-${i}-${em}`}
          type="button"
          onClick={() => onPick(em)}
          className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-xl border border-slate-200/70 bg-white/95 text-base leading-none shadow-sm transition ${hover} focus:outline-none focus:ring-2 ${focus} active:scale-95`}
        >
          <span aria-hidden>{em}</span>
        </button>
      ))}
    </div>
  );
};

const defaultPageState: EditablePageState = {
  headline: '',
  subheadline: '',
  description: '',
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type EditorLayout = 'full' | 'canvas' | 'panel';
type CanvasViewMode = 'spread' | 'flipbook';

const PageEditorCard: React.FC<{
  kind: PageKind;
  state: EditablePageState;
  onChange: (next: EditablePageState) => void;
  filterImageIds?: number[];
  layout?: EditorLayout;
  canvasViewMode?: CanvasViewMode;
}> = ({ kind, state, onChange, filterImageIds, layout = 'full', canvasViewMode = 'spread' }) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeCategoryPage' });
  const isCover = kind === 'cover';
  const title = isCover ? t('frontCover') : t('backCover');
  const hint = isCover ? t('hintFrontCover') : t('hintBackCover');
  const [showAlbumPicker, setShowAlbumPicker] = React.useState(false);
  const [showLogoPicker, setShowLogoPicker] = React.useState(false);
  const [showTextLeafBgPicker, setShowTextLeafBgPicker] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'text' | 'photo'>('text');
  type Section = 'text' | 'textLeaf' | 'effects' | 'extras';
  type StudioTab = 'type' | 'effects' | 'layers';
  const [openSection, setOpenSection] = React.useState<Section | null>('text');
  const [studioRightTab, setStudioRightTab] = React.useState<StudioTab>('type');
  const [showStudioGrid, setShowStudioGrid] = React.useState(false);
  const [canvasZoom, setCanvasZoom] = React.useState(85);
  const spreadContainerRef = React.useRef<HTMLDivElement>(null);
  const [spreadTransform, setSpreadTransform] = React.useState('rotateX(8deg) rotateY(-12deg) rotateZ(2deg)');
  const showCanvas = layout === 'full' || layout === 'canvas';
  const showPanel = layout === 'full' || layout === 'panel';
  const toggle = (s: Section) => setOpenSection((v) => (v === s ? null : s));

  const handleSpreadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = spreadContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 50;
    const rotateY = (centerX - x) / 60;
    setSpreadTransform(`rotateX(${8 + rotateX}deg) rotateY(${-12 + rotateY}deg) rotateZ(2deg)`);
    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;
    el.style.setProperty('--mouse-x', `${lightX}%`);
    el.style.setProperty('--mouse-y', `${lightY}%`);
  };

  const handleSpreadPointerLeave = () => {
    setSpreadTransform('rotateX(8deg) rotateY(-12deg) rotateZ(2deg)');
  };

  const previewRef = React.useRef<HTMLDivElement>(null);
  const stateRef = React.useRef(state);
  const onChangeRef = React.useRef(onChange);
  stateRef.current = state;
  onChangeRef.current = onChange;

  const [logoDrag, setLogoDrag] = React.useState<{ startX: number; startY: number; startPX: number; startPY: number } | null>(null);
  const [overlayDrag, setOverlayDrag] = React.useState<{
    id: string;
    startX: number;
    startY: number;
    startPX: number;
    startPY: number;
  } | null>(null);

  const getLogoPreset = (pos?: 'top-left' | 'top-right' | 'top-center' | 'bottom-center') => {
    if (pos === 'top-right') return { x: 88, y: 12 };
    if (pos === 'top-center') return { x: 50, y: 12 };
    if (pos === 'bottom-center') return { x: 50, y: 88 };
    return { x: 12, y: 12 };
  };

  const logoX = state.style?.logoPositionX ?? getLogoPreset(state.style?.logoPosition).x;
  const logoY = state.style?.logoPositionY ?? getLogoPreset(state.style?.logoPosition).y;

  const startOverlayDrag = React.useCallback(
    (id: string, clientX: number, clientY: number, startPX: number, startPY: number) => {
      setOverlayDrag({ id, startX: clientX, startY: clientY, startPX, startPY });
    },
    [],
  );

  const startLogoDrag = React.useCallback(
    (clientX: number, clientY: number, startPX: number, startPY: number) => {
      setLogoDrag({ startX: clientX, startY: clientY, startPX, startPY });
    },
    [],
  );

  React.useEffect(() => {
    if (!logoDrag) return;
    const onMove = (e: PointerEvent) => {
      const el = previewRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaPx = ((e.clientX - logoDrag.startX) / rect.width) * 100;
      const deltaPy = ((e.clientY - logoDrag.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, logoDrag.startPX + deltaPx));
      const newY = Math.max(0, Math.min(100, logoDrag.startPY + deltaPy));
      const s = stateRef.current;
      onChangeRef.current({ ...s, style: { ...s.style, logoPositionX: newX, logoPositionY: newY } });
    };
    const onUp = () => setLogoDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [logoDrag]);

  React.useEffect(() => {
    if (!overlayDrag) return;
    const onMove = (e: PointerEvent) => {
      const el = previewRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaPx = ((e.clientX - overlayDrag.startX) / rect.width) * 100;
      const deltaPy = ((e.clientY - overlayDrag.startY) / rect.height) * 100;
      const newX = Math.max(4, Math.min(96, overlayDrag.startPX + deltaPx));
      const newY = Math.max(4, Math.min(96, overlayDrag.startPY + deltaPy));
      const s = stateRef.current;
      const list = s.style?.textSideOverlays ?? [];
      onChangeRef.current({
        ...s,
        style: {
          ...s.style,
          textSideOverlays: list.map((o) => (o.id === overlayDrag.id ? { ...o, x: newX, y: newY } : o)),
        },
      });
    };
    const onUp = () => setOverlayDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [overlayDrag]);

  const addTextSideOverlay = () => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const list = [...(state.style?.textSideOverlays ?? [])];
    list.push({
      id,
      text: '',
      x: 50,
      y: 72,
      fontSize: 13,
      color: '#f8fafc',
      fontWeight: 600,
      fontStyle: 'normal',
      textAlign: 'center',
      letterSpacing: 0,
      lineHeight: 1.25,
      textShadow: true,
    });
    onChange({ ...state, style: { ...state.style, textSideOverlays: list } });
  };

  const patchTextSideOverlay = (id: string, patch: Partial<TextSideOverlay>) => {
    const list = state.style?.textSideOverlays ?? [];
    onChange({
      ...state,
      style: {
        ...state.style,
        textSideOverlays: list.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      },
    });
  };

  const defaultTextLeafGradient = isCover
    ? 'linear-gradient(145deg, #0f172a 0%, #312e81 45%, #5b21b6 100%)'
    : 'linear-gradient(145deg, #1c1917 0%, #7c2d12 48%, #9a3412 100%)';
  const textLeafBgMode = state.style?.textLeafBgMode ?? 'gradient';
  const textLeafBgUrl = state.style?.textLeafBgImageUrl;
  const textPanelBlurPx = state.style?.textPanelBlurPx ?? 20;
  const textPanelGlassOpacity = (state.style?.textPanelGlassOpacity ?? 35) / 100;
  const textPanelGlassColor = state.style?.textPanelGlassColor ?? '#ffffff';
  const textLeafGlassBg = hexToRgba(textPanelGlassColor, textPanelGlassOpacity);

  const descriptionFieldStyle = getDescriptionTypographyStyle(state.style);

  return (
    <>
    {showCanvas && (
    <section className={`bg-white ${layout === 'canvas' ? 'flex flex-col min-h-[min(520px,55vh)]' : 'border-b border-slate-200/60 last:border-b-0'}`}>
      {layout !== 'canvas' && (
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${isCover ? 'bg-[#4648d4] quantum-pulse' : 'bg-[#ec4899]'}`}
        />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#0b1c30] tracking-tight">{title}</h3>
          <p className="text-[11px] text-[#464554] mt-0.5">{hint}</p>
        </div>
        <span className="ml-auto text-[10px] font-black uppercase tracking-[0.15em] text-[#4648d4] bg-[#4648d4]/10 px-2.5 py-1 rounded-md">
          {isCover ? t('frontCoverBadge') : t('backCoverBadge')}
        </span>
      </div>
      )}

      <div className={`flex flex-col min-h-0 ${layout === 'canvas' ? 'min-h-[min(480px,50vh)]' : 'xl:flex-row min-h-[min(520px,65vh)]'}`}>
        <main className="flex-1 flex flex-col min-w-0 studio-mesh-quantum">
          <div className="h-14 border-b border-slate-200/40 flex items-center justify-between px-4 sm:px-8 bg-white/40 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-full border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCanvasZoom((z) => Math.max(50, z - 10))}
                  className="p-1 text-slate-400 hover:text-[#4648d4] text-lg leading-none"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="text-[11px] font-black text-slate-500 min-w-[36px] text-center">{canvasZoom}%</span>
                <button
                  type="button"
                  onClick={() => setCanvasZoom((z) => Math.min(120, z + 10))}
                  className="p-1 text-slate-400 hover:text-[#4648d4] text-lg leading-none"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
              <div className="hidden sm:block h-5 w-px bg-slate-300/40" />
              <div className="inline-flex rounded-full border border-slate-200/90 bg-white/95 p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPreviewTab('text')}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                    previewTab === 'text' ? 'bg-[#4648d4] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('previewTextSide')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('photo')}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                    previewTab === 'photo' ? 'bg-[#4648d4] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('previewPhotoSide')}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStudioGrid((g) => !g)}
              className={`flex items-center gap-2 p-2 px-4 rounded-xl transition-all ${
                showStudioGrid ? 'text-[#4648d4] bg-[#4648d4]/10' : 'text-slate-500 hover:bg-white hover:text-[#4648d4]'
              }`}
            >
              <span className="text-lg leading-none">▦</span>
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{t('grid')}</span>
            </button>
          </div>

          <div
            ref={spreadContainerRef}
            className="flex-1 overflow-auto p-6 sm:p-10 flex flex-col items-center justify-center album-builder-perspective min-h-[320px]"
            onPointerMove={handleSpreadPointerMove}
            onPointerLeave={handleSpreadPointerLeave}
          >
            <p className="text-[10px] text-slate-500 text-center max-w-sm leading-relaxed mb-4">
              {canvasViewMode === 'flipbook' ? t('flipbookViewHint') : t('previewTabHint')}
            </p>
            {canvasViewMode === 'flipbook' ? (
              <div className="category-flipbook-spread flex items-stretch rounded-sm overflow-hidden border border-white/60 shadow-2xl mx-2">
                <div
                  className="relative w-[min(200px,38vw)] sm:w-[240px] aspect-[3/4] album-builder-paper-texture border-r border-slate-200/80 overflow-hidden shrink-0"
                  style={
                    textLeafBgMode === 'image' && textLeafBgUrl
                      ? { backgroundImage: `url(${textLeafBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: state.style?.textLeafBgGradient || defaultTextLeafGradient }
                  }
                >
                  <div className="absolute inset-0 bg-black/15 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center p-3">
                    <div
                      className="neo-glass-card w-full rounded-2xl px-3 py-3 text-center"
                      style={{
                        backdropFilter: `saturate(1.2) blur(${textPanelBlurPx}px)`,
                        WebkitBackdropFilter: `saturate(1.2) blur(${textPanelBlurPx}px)`,
                        background: textLeafGlassBg,
                      }}
                    >
                      <p
                        className="line-clamp-2 font-['Playfair_Display'] text-sm font-bold"
                        style={{ color: state.style?.headlineColor ?? '#0f172a', fontFamily: state.style?.fontFamily }}
                      >
                        {state.headline || t('previewPlaceholderTitle')}
                      </p>
                      <p
                        className="line-clamp-2 mt-1 text-[10px]"
                        style={{ color: state.style?.subheadlineColor ?? '#334155', fontFamily: state.style?.fontFamily }}
                      >
                        {state.subheadline || t('previewPlaceholderSubtitle')}
                      </p>
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                    {t('previewTextSide')}
                  </span>
                </div>
                <div className="w-3 sm:w-4 album-builder-book-spine shrink-0 self-stretch opacity-70" />
                <div className="relative w-[min(200px,38vw)] sm:w-[240px] aspect-[3/4] album-builder-paper-texture overflow-hidden shrink-0">
                  {state.imageDataUrl ? (
                    <img
                      src={state.imageDataUrl}
                      alt={`${title} preview`}
                      className={`absolute inset-0 w-full h-full object-cover ${state.style?.blurBackground ? 'blur-sm' : ''}`}
                      style={{ transform: `scale(${state.style?.imageScale ?? 1})`, transformOrigin: 'center center' }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-200/90 px-3 text-center">
                      <FaImages className="text-2xl text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-medium">{t('previewPhotoEmpty')}</span>
                    </div>
                  )}
                  {state.style?.gradient && (
                    <div className="absolute inset-0 pointer-events-none" style={{ background: state.style.gradient, opacity: (state.style?.overlayOpacity ?? 40) / 100 }} />
                  )}
                  <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest text-white/90 bg-black/35 px-2 py-0.5 rounded-full">
                    {t('previewPhotoSide')}
                  </span>
                </div>
              </div>
            ) : (
            <>
            <div
              className="album-builder-spread-3d quantum-3d-shadow relative"
              style={{ transform: spreadTransform, zoom: canvasZoom / 100 }}
            >
              <div
                ref={previewRef}
                className={`relative w-[min(300px,80vw)] sm:w-[340px] lg:w-[380px] aspect-[3/4] rounded-sm overflow-hidden flex items-center justify-center transition-all duration-500 album-builder-paper-texture border border-white/20 shadow-inner ${state.style?.subtleAnimation ? 'cover-fade-in' : ''} ${state.style?.darkModeCover ? 'brightness-90' : ''}`}
                style={state.style?.vignette && previewTab === 'photo' ? { boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)' } : undefined}
              >
                <div className={`absolute inset-0 z-40 grid-system-quantum pointer-events-none ${showStudioGrid ? 'active' : ''}`} />
                <div className="album-builder-dynamic-light pointer-events-none" />
            {previewTab === 'text' ? (
              <>
                <div
                  className="absolute inset-0"
                  style={
                    textLeafBgMode === 'image' && textLeafBgUrl
                      ? {
                          backgroundImage: `url(${textLeafBgUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : { background: state.style?.textLeafBgGradient || defaultTextLeafGradient }
                  }
                />
                <div className="absolute inset-0 bg-black/15 pointer-events-none" />
                <div
                  className={`absolute inset-0 flex px-4 py-5 z-[1] ${
                    state.style?.verticalAlign === 'top'
                      ? 'items-start'
                      : state.style?.verticalAlign === 'center'
                      ? 'items-center'
                      : 'items-end'
                  }`}
                >
                  <div
                    className={`neo-glass-card relative w-full max-w-[95%] mx-auto rounded-[3rem] px-5 py-5 overflow-hidden ${
                      state.style?.align === 'center'
                        ? 'text-center'
                        : state.style?.align === 'right'
                        ? 'text-right ml-auto'
                        : 'text-left'
                    }`}
                    style={{
                      backdropFilter: `saturate(1.2) blur(${textPanelBlurPx}px)`,
                      WebkitBackdropFilter: `saturate(1.2) blur(${textPanelBlurPx}px)`,
                      background: textLeafGlassBg,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                    }}
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                        isCover ? 'from-[#ec4899] via-[#4648d4] to-[#f43f5e]' : 'from-amber-400 via-rose-500 to-fuchsia-500'
                      }`}
                    />
                    <div
                      className="line-clamp-3 font-['Playfair_Display']"
                      style={{
                        fontSize: state.style?.fontSize ?? 20,
                        fontWeight: state.style?.fontWeight ?? 700,
                        color: state.style?.headlineColor ?? '#0f172a',
                        fontFamily: state.style?.fontFamily,
                        letterSpacing: state.style?.letterSpacing ?? 0,
                        lineHeight: state.style?.lineHeight ?? 1.2,
                        textShadow: state.style?.textShadow !== false ? '0 1px 2px rgba(255,255,255,0.4)' : 'none',
                      }}
                    >
                      {state.headline || t('previewPlaceholderTitle')}
                    </div>
                    {state.style?.dividerEnabled && (
                      <div
                        className="mt-2 h-px"
                        style={{
                          width: `${state.style?.dividerWidth ?? 60}%`,
                          backgroundColor: state.style?.dividerColor ?? '#64748b',
                          marginLeft: state.style?.align === 'center' || state.style?.align === 'right' ? 'auto' : 0,
                          marginRight: state.style?.align === 'center' || state.style?.align === 'left' ? 'auto' : 0,
                        }}
                      />
                    )}
                    <div
                      className="line-clamp-2 mt-1"
                      style={{
                        fontSize: (state.style?.fontSize ?? 20) - 4,
                        fontWeight: (state.style?.fontWeight ?? 700) - 200 || 400,
                        color: state.style?.subheadlineColor ?? '#334155',
                        fontFamily: state.style?.fontFamily,
                        letterSpacing: state.style?.letterSpacing ?? 0,
                        lineHeight: state.style?.lineHeight ?? 1.2,
                      }}
                    >
                      {state.subheadline || t('previewPlaceholderSubtitle')}
                    </div>
                    {state.description ? (
                      <p
                        className="mt-2 line-clamp-4 whitespace-pre-wrap opacity-95"
                        style={descriptionFieldStyle}
                      >
                        {state.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                {state.style?.logoDataUrl && (
                  <div
                    className="absolute z-50 select-none touch-none"
                    style={{
                      left: `${logoX}%`,
                      top: `${logoY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: state.style?.logoSize ?? 60,
                      height: state.style?.logoSize ?? 60,
                      cursor: logoDrag ? 'grabbing' : 'grab',
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      startLogoDrag(e.clientX, e.clientY, logoX, logoY);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                  >
                    <img
                      src={state.style.logoDataUrl}
                      alt={t('logoAlt')}
                      className="w-full h-full object-contain pointer-events-none drop-shadow-md"
                      draggable={false}
                    />
                  </div>
                )}
                {(state.style?.textSideOverlays ?? []).map((o) => (
                  <div
                    key={o.id}
                    className="absolute z-50 flex max-w-[min(92%,280px)] flex-col items-stretch gap-0.5 touch-none"
                    style={{
                      left: `${o.x}%`,
                      top: `${o.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: overlayDrag?.id === o.id ? 'grabbing' : 'grab',
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if ((e.target as HTMLElement).closest('textarea')) return;
                      e.preventDefault();
                      e.stopPropagation();
                      startOverlayDrag(o.id, e.clientX, e.clientY, o.x, o.y);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/40 bg-black/40 text-white/90 shadow backdrop-blur-sm ${
                          overlayDrag?.id === o.id ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                        aria-label={t('dragFloatingHint')}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.stopPropagation();
                          startOverlayDrag(o.id, e.clientX, e.clientY, o.x, o.y);
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                      >
                        <FaGripVertical className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <textarea
                        value={o.text}
                        onChange={(e) => {
                          const list = state.style?.textSideOverlays ?? [];
                          onChange({
                            ...state,
                            style: {
                              ...state.style,
                              textSideOverlays: list.map((x) =>
                                x.id === o.id ? { ...x, text: e.target.value } : x
                              ),
                            },
                          });
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="min-w-0 flex-1 rounded-lg border border-white/35 bg-black/30 px-2 py-1 text-[11px] text-white shadow-md backdrop-blur-sm placeholder:text-white/45 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/40 cursor-text"
                        style={{
                          fontSize: o.fontSize ?? 13,
                          color: o.color ?? '#f8fafc',
                          fontFamily: o.fontFamily?.trim() ? o.fontFamily : undefined,
                          fontWeight: o.fontWeight ?? 600,
                          fontStyle: o.fontStyle ?? 'normal',
                          textAlign: o.textAlign ?? 'center',
                          letterSpacing: o.letterSpacing ?? 0,
                          lineHeight: o.lineHeight ?? 1.25,
                          textShadow:
                            o.textShadow !== false
                              ? '0 1px 3px rgba(0,0,0,0.55), 0 0 12px rgba(0,0,0,0.25)'
                              : 'none',
                        }}
                        placeholder={t('floatingTextPlaceholder')}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {state.imageDataUrl ? (
                  <img
                    src={state.imageDataUrl}
                    alt={`${title} preview`}
                    role="button"
                    title={t('clickToZoom')}
                    className={`absolute inset-0 w-full h-full object-cover ${state.style?.blurBackground ? 'blur-sm' : ''} cursor-zoom-in`}
                    style={{
                      transform: `scale(${state.style?.imageScale ?? 1})`,
                      transformOrigin: 'center center',
                    }}
                    onClick={() => {
                      const next = Math.min(1.6, (state.style?.imageScale ?? 1) + 0.15);
                      onChange({ ...state, style: { ...state.style, imageScale: next } });
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200/90 to-slate-300/80 flex items-center justify-center shadow-inner border border-white/50">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('preview')}</span>
                    </div>
                    <span className="text-[11px] leading-snug text-slate-500 font-medium">{t('previewPhotoEmpty')}</span>
                  </div>
                )}
                {state.style?.logoDataUrl && (
                  <div
                    className="absolute z-50 select-none touch-none"
                    style={{
                      left: `${logoX}%`,
                      top: `${logoY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: state.style?.logoSize ?? 60,
                      height: state.style?.logoSize ?? 60,
                      cursor: logoDrag ? 'grabbing' : 'grab',
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      startLogoDrag(e.clientX, e.clientY, logoX, logoY);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                  >
                    <img
                      src={state.style.logoDataUrl}
                      alt={t('logoAlt')}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                )}
              </>
            )}
              </div>
            </div>
            {previewTab === 'text' && canvasViewMode === 'spread' && (
              <div className="w-full max-w-sm mt-4 rounded-2xl border border-[#4648d4]/20 bg-white/90 backdrop-blur px-3 py-3 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-[11px] text-slate-600 font-medium leading-snug">{t('floatingTextBarHint')}</p>
                <button
                  type="button"
                  onClick={addTextSideOverlay}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4648d4] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#3d3fc0] transition-all"
                >
                  + {t('floatingTextAdd')}
                </button>
              </div>
            )}
            </>
            )}
      </div>
        </main>
      </div>
    </section>
    )}

    {showPanel && (
        <div className={`category-editor-panel flex flex-col flex-1 min-h-0 h-full overflow-hidden border-slate-100 bg-white ${
          layout === 'panel' ? 'w-full' : 'w-full xl:w-[420px] shrink-0 border-t xl:border-t-0 xl:border-l max-h-[50vh] xl:max-h-none'
        }`}>
          <div className="flex border-b border-slate-100 h-14 shrink-0 p-1 gap-1 bg-slate-50/80">
            {(
              [
                ['layers', t('tabLayers')],
                ['type', t('tabType')],
                ['effects', t('tabEffects')],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStudioRightTab(tab);
                  if (tab === 'type') setOpenSection('text');
                  else if (tab === 'layers') setOpenSection('textLeaf');
                  else setOpenSection('effects');
                }}
                className={`flex-1 text-[10px] font-black tracking-[0.2em] uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  studioRightTab === tab
                    ? 'text-[#4648d4] bg-[#4648d4]/10 border border-[#4648d4]/20'
                    : 'text-slate-500 hover:text-slate-800 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="category-editor-panel-scroll flex-1 overflow-y-auto overscroll-y-contain p-5 sm:p-6 space-y-8 min-h-0">
        <section className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{t('canvasMastery')}</h4>
          </div>
          <div className="neo-glass rounded-2xl p-4 space-y-4 border border-slate-100">
        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="category-editor-label block text-[10px] font-black uppercase tracking-widest mb-1.5">
                {t('headline')}
              </label>
              <EmojiInsertRow
                emojis={isCover ? TEXT_EMOJI_COVER.headline : TEXT_EMOJI_BACK.headline}
                ariaLabel={t('emojiQuickInsertHeadline')}
                accent={isCover ? 'cyan' : 'rose'}
                onPick={(emoji) => onChange({ ...state, headline: appendEmojiToField(state.headline, emoji) })}
              />
              <input
                className="category-editor-field mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/30 focus:border-[#4648d4]/50 transition-all font-['Playfair_Display'] text-lg"
                placeholder={isCover ? t('placeholderHeadlineCover') : t('placeholderHeadlineBack')}
                value={state.headline}
                onChange={(e) => onChange({ ...state, headline: e.target.value })}
              />
            </div>

            <div>
              <label className="category-editor-label block text-[10px] font-black uppercase tracking-widest mb-1.5">
                {t('subheadline')}
              </label>
              <EmojiInsertRow
                emojis={isCover ? TEXT_EMOJI_COVER.sub : TEXT_EMOJI_BACK.sub}
                ariaLabel={t('emojiQuickInsertSub')}
                accent={isCover ? 'cyan' : 'rose'}
                onPick={(emoji) => onChange({ ...state, subheadline: appendEmojiToField(state.subheadline, emoji) })}
              />
              <input
                className="category-editor-field mt-2 w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4648d4]/30 focus:border-[#4648d4]/50 transition-all"
                placeholder={isCover ? t('placeholderSubCover') : t('placeholderSubBack')}
                value={state.subheadline}
                onChange={(e) => onChange({ ...state, subheadline: e.target.value })}
              />
            </div>

            <div>
              <label className="category-editor-label block text-[10px] font-black uppercase tracking-widest mb-1.5">
                {t('descriptionOptional')}
              </label>
              <EmojiInsertRow
                emojis={isCover ? TEXT_EMOJI_COVER.description : TEXT_EMOJI_BACK.description}
                ariaLabel={t('emojiQuickInsertDesc')}
                accent={isCover ? 'cyan' : 'rose'}
                onPick={(emoji) => onChange({ ...state, description: appendEmojiToField(state.description, emoji) })}
              />
              <textarea
                rows={3}
                className="category-editor-field mt-2 w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:ring-2 resize-none focus:ring-[#4648d4]/30 focus:border-[#4648d4]/50 transition-all"
                style={descriptionFieldStyle}
                placeholder={t('placeholderDescription')}
                value={state.description}
                onChange={(e) => onChange({ ...state, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('pageImage')}
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAlbumPicker(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2 text-[11px] font-bold text-cyan-800 hover:from-cyan-100 hover:to-indigo-100 hover:border-cyan-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer w-auto"
              >
                <FaImages className="h-3.5 w-3.5 shrink-0" />
                {t('useFromAlbumUpload')}
              </button>
            </div>

            <div className="hidden md:flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200/60 px-3.5 py-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-600">
                  {t('livePreviewHint')}
                </span>
              </div>
            </div>
          </div>

          {/* Settings accordion */}
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <>
                <button
                  type="button"
                  onClick={() => toggle('text')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-slate-50 transition-all"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('textLayout')}</span>
                  <span className="text-slate-400 text-[10px]">{openSection === 'text' ? '▼' : '▶'}</span>
                </button>
                {openSection === 'text' && (
                  <div className="p-4 pt-2 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('fontSize')}
                </label>
                <input
                  type="range"
                  min={14}
                  max={40}
                  value={state.style?.fontSize ?? 20}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, fontSize: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('weight')}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={state.style?.fontWeight ?? 700}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, fontWeight: Number(e.target.value) },
                    })
                  }
                >
                  <option value={400}>{t('weightRegular')}</option>
                  <option value={600}>{t('weightSemiBold')}</option>
                  <option value={700}>{t('weightBold')}</option>
                  <option value={800}>{t('weightExtraBold')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('align')}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={state.style?.align ?? 'center'}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: {
                        ...state.style,
                        align: e.target.value as 'left' | 'center' | 'right',
                      },
                    })
                  }
                >
                  <option value="left">{t('alignLeft')}</option>
                  <option value="center">{t('alignCenter')}</option>
                  <option value="right">{t('alignRight')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('verticalPosition')}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={state.style?.verticalAlign ?? (kind === 'cover' ? 'center' : 'bottom')}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: {
                        ...state.style,
                        verticalAlign: e.target.value as 'top' | 'center' | 'bottom',
                      },
                    })
                  }
                >
                  <option value="top">{t('posTop')}</option>
                  <option value="center">{t('posCenter')}</option>
                  <option value="bottom">{t('posBottom')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('fontFamily')}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={fontFamilyStoredToPreset(state.style?.fontFamily)}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: {
                        ...state.style,
                        fontFamily: fontPresetToStored(e.target.value as FontFamilyPreset),
                      },
                    })
                  }
                >
                  <option value="system">{t('fontSystem')}</option>
                  <option value="sans">{t('fontSans')}</option>
                  <option value="serif">{t('fontSerif')}</option>
                  <option value="mono">{t('fontMono')}</option>
                  <option value="rounded">{t('fontRounded')}</option>
                  <option value="display">{t('fontDisplay')}</option>
                  <option value="elegant">{t('fontElegant')}</option>
                  <option value="script">{t('fontScript')}</option>
                  <option value="slab">{t('fontSlab')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('headlineColor')}
                </label>
                <input
                  type="color"
                  className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white"
                  value={state.style?.headlineColor ?? '#ffffff'}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, headlineColor: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('subheadlineColor')}
                </label>
                <input
                  type="color"
                  className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white"
                  value={state.style?.subheadlineColor ?? '#e5e7eb'}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, subheadlineColor: e.target.value },
                    })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-4 mt-3 pt-3 border-t border-slate-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  {t('descriptionSectionTitle')}
                </p>
                <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                  {t('descriptionSectionHint')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('descriptionFontSize')}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={24}
                      value={state.style?.descriptionFontSize ?? Math.max(11, (state.style?.fontSize ?? 20) - 8)}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: { ...state.style, descriptionFontSize: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                      {state.style?.descriptionFontSize ?? Math.max(11, (state.style?.fontSize ?? 20) - 8)}px
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('weight')}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      value={
                        state.style?.descriptionFontWeight ??
                        Math.max(400, (state.style?.fontWeight ?? 700) - 250)
                      }
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: { ...state.style, descriptionFontWeight: Number(e.target.value) },
                        })
                      }
                    >
                      <option value={400}>{t('weightRegular')}</option>
                      <option value={600}>{t('weightSemiBold')}</option>
                      <option value={700}>{t('weightBold')}</option>
                      <option value={800}>{t('weightExtraBold')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('align')}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      value={state.style?.descriptionAlign ?? state.style?.align ?? 'center'}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: {
                            ...state.style,
                            descriptionAlign: e.target.value as 'left' | 'center' | 'right',
                          },
                        })
                      }
                    >
                      <option value="left">{t('alignLeft')}</option>
                      <option value="center">{t('alignCenter')}</option>
                      <option value="right">{t('alignRight')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('fontFamily')}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      value={fontFamilyStoredToPreset(
                        state.style?.descriptionFontFamily != null &&
                          String(state.style.descriptionFontFamily).trim() !== ''
                          ? state.style.descriptionFontFamily
                          : state.style?.fontFamily,
                      )}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: {
                            ...state.style,
                            descriptionFontFamily: fontPresetToStored(e.target.value as FontFamilyPreset),
                          },
                        })
                      }
                    >
                      <option value="system">{t('fontSystem')}</option>
                      <option value="sans">{t('fontSans')}</option>
                      <option value="serif">{t('fontSerif')}</option>
                      <option value="mono">{t('fontMono')}</option>
                      <option value="rounded">{t('fontRounded')}</option>
                      <option value="display">{t('fontDisplay')}</option>
                      <option value="elegant">{t('fontElegant')}</option>
                      <option value="script">{t('fontScript')}</option>
                      <option value="slab">{t('fontSlab')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('descriptionColor')}
                    </label>
                    <input
                      type="color"
                      className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white"
                      value={
                        state.style?.descriptionColor ??
                        state.style?.subheadlineColor ??
                        '#475569'
                      }
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: { ...state.style, descriptionColor: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('lineHeight')}
                    </label>
                    <input
                      type="range"
                      min={120}
                      max={200}
                      step={5}
                      value={Math.round((state.style?.descriptionLineHeight ?? state.style?.lineHeight ?? 1.55) * 100)}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: {
                            ...state.style,
                            descriptionLineHeight: Number(e.target.value) / 100,
                          },
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                      {(state.style?.descriptionLineHeight ?? state.style?.lineHeight ?? 1.55).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('letterSpacing')}
                    </label>
                    <input
                      type="range"
                      min={-2}
                      max={6}
                      step={0.5}
                      value={state.style?.descriptionLetterSpacing ?? state.style?.letterSpacing ?? 0}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          style: {
                            ...state.style,
                            descriptionLetterSpacing: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
                      {state.style?.descriptionLetterSpacing ?? state.style?.letterSpacing ?? 0}px
                    </div>
                  </div>
                  <div className="flex flex-col justify-end pb-0.5">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      onClick={() =>
                        onChange({
                          ...state,
                          style: {
                            ...state.style,
                            descriptionFontSize: undefined,
                            descriptionColor: undefined,
                            descriptionFontWeight: undefined,
                            descriptionLineHeight: undefined,
                            descriptionLetterSpacing: undefined,
                            descriptionFontFamily: undefined,
                            descriptionAlign: undefined,
                          },
                        })
                      }
                    >
                      {t('descriptionTypographyReset')}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('imageZoom')}
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={1.6}
                  step={0.05}
                  value={state.style?.imageScale ?? 1}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, imageScale: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('letterSpacing')}</label>
                <input
                  type="range"
                  min={-2}
                  max={8}
                  value={state.style?.letterSpacing ?? 0}
                  onChange={(e) =>
                    onChange({ ...state, style: { ...state.style, letterSpacing: Number(e.target.value) } })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('lineHeight')}</label>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.1}
                  value={state.style?.lineHeight ?? 1.2}
                  onChange={(e) =>
                    onChange({ ...state, style: { ...state.style, lineHeight: Number(e.target.value) } })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.style?.textShadow ?? true}
                    onChange={(e) =>
                      onChange({ ...state, style: { ...state.style, textShadow: e.target.checked } })
                    }
                    className="rounded border-slate-200 accent-cyan-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">{t('textShadow')}</span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.style?.dividerEnabled ?? false}
                    onChange={(e) =>
                      onChange({ ...state, style: { ...state.style, dividerEnabled: e.target.checked } })
                    }
                    className="rounded border-slate-200 accent-cyan-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-600">{t('decorativeDivider')}</span>
                </label>
              </div>
              {state.style?.dividerEnabled && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('dividerWidth')}</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={state.style?.dividerWidth ?? 60}
                      onChange={(e) =>
                        onChange({ ...state, style: { ...state.style, dividerWidth: Number(e.target.value) } })
                      }
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('dividerColor')}</label>
                    <input
                      type="color"
                      className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white"
                      value={state.style?.dividerColor ?? '#ffffff'}
                      onChange={(e) =>
                        onChange({ ...state, style: { ...state.style, dividerColor: e.target.value } })
                      }
                    />
                  </div>
                </>
              )}

              <div className="col-span-2 md:col-span-4 mt-1 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{t('floatingTextTitle')}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{t('floatingTextHint')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={addTextSideOverlay}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2 text-[11px] font-bold text-cyan-800 hover:from-cyan-100 hover:to-indigo-100 hover:border-cyan-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    + {t('floatingTextAdd')}
                  </button>
                </div>

                {(state.style?.textSideOverlays ?? []).length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {(state.style?.textSideOverlays ?? []).map((o) => (
                      <div key={o.id} className="rounded-xl border border-slate-200/70 bg-white/90 p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                          <input
                            value={o.text}
                            onChange={(e) => patchTextSideOverlay(o.id, { text: e.target.value })}
                            className="flex-1 min-w-0 rounded-xl border border-slate-200/80 px-3 py-2 text-[12px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            placeholder={t('floatingTextPlaceholder')}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = state.style?.textSideOverlays ?? [];
                              onChange({
                                ...state,
                                style: { ...state.style, textSideOverlays: list.filter((x) => x.id !== o.id) },
                              });
                            }}
                            className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
                          >
                            {t('remove')}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('fontFamily')}</label>
                            <select
                              className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                              value={fontFamilyStoredToPreset(o.fontFamily)}
                              onChange={(e) =>
                                patchTextSideOverlay(o.id, {
                                  fontFamily: fontPresetToStored(e.target.value as FontFamilyPreset),
                                })
                              }
                            >
                              <option value="system">{t('fontSystem')}</option>
                              <option value="sans">{t('fontSans')}</option>
                              <option value="serif">{t('fontSerif')}</option>
                              <option value="mono">{t('fontMono')}</option>
                              <option value="rounded">{t('fontRounded')}</option>
                              <option value="display">{t('fontDisplay')}</option>
                              <option value="elegant">{t('fontElegant')}</option>
                              <option value="script">{t('fontScript')}</option>
                              <option value="slab">{t('fontSlab')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('weight')}</label>
                            <select
                              className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                              value={o.fontWeight ?? 600}
                              onChange={(e) => patchTextSideOverlay(o.id, { fontWeight: Number(e.target.value) })}
                            >
                              <option value={400}>{t('weightRegular')}</option>
                              <option value={600}>{t('weightSemiBold')}</option>
                              <option value={700}>{t('weightBold')}</option>
                              <option value={800}>{t('weightExtraBold')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('floatingTextSize')}</label>
                            <input
                              type="range"
                              min={8}
                              max={40}
                              value={o.fontSize ?? 13}
                              onChange={(e) => patchTextSideOverlay(o.id, { fontSize: Number(e.target.value) })}
                              className="w-full accent-cyan-500"
                            />
                            <div className="text-[10px] text-slate-500 tabular-nums">{o.fontSize ?? 13}px</div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('floatingTextColor')}</label>
                            <input
                              type="color"
                              value={o.color ?? '#f8fafc'}
                              onChange={(e) => patchTextSideOverlay(o.id, { color: e.target.value })}
                              className="h-8 w-full rounded-xl border border-slate-200 p-0 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('align')}</label>
                            <select
                              className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                              value={o.textAlign ?? 'center'}
                              onChange={(e) =>
                                patchTextSideOverlay(o.id, {
                                  textAlign: e.target.value as 'left' | 'center' | 'right',
                                })
                              }
                            >
                              <option value="left">{t('alignLeft')}</option>
                              <option value="center">{t('alignCenter')}</option>
                              <option value="right">{t('alignRight')}</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(o.fontStyle ?? 'normal') === 'italic'}
                                onChange={(e) =>
                                  patchTextSideOverlay(o.id, { fontStyle: e.target.checked ? 'italic' : 'normal' })
                                }
                                className="rounded border-slate-200 accent-cyan-500"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">{t('floatingTextItalic')}</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('letterSpacing')}</label>
                            <input
                              type="range"
                              min={-2}
                              max={8}
                              step={0.5}
                              value={o.letterSpacing ?? 0}
                              onChange={(e) => patchTextSideOverlay(o.id, { letterSpacing: Number(e.target.value) })}
                              className="w-full accent-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t('lineHeight')}</label>
                            <input
                              type="range"
                              min={1}
                              max={2.5}
                              step={0.05}
                              value={o.lineHeight ?? 1.25}
                              onChange={(e) => patchTextSideOverlay(o.id, { lineHeight: Number(e.target.value) })}
                              className="w-full accent-cyan-500"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={o.textShadow !== false}
                            onChange={(e) => patchTextSideOverlay(o.id, { textShadow: e.target.checked })}
                            className="rounded border-slate-200 accent-cyan-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-600">{t('textShadow')}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-500">{t('floatingTextEmpty')}</div>
                )}
              </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggle('textLeaf')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-slate-50 transition-all"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('textLeafSection')}</span>
                  <span className="text-slate-400 text-[10px]">{openSection === 'textLeaf' ? '▼' : '▶'}</span>
                </button>
                {openSection === 'textLeaf' && (
                  <div className="p-4 pt-2 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white space-y-4">
                    <p className="text-[11px] text-slate-600 leading-relaxed">{t('textLeafSectionHint')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('textLeafBgMode')}</label>
                        <select
                          className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm"
                          value={textLeafBgMode}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: {
                                ...state.style,
                                textLeafBgMode: e.target.value as 'gradient' | 'image',
                              },
                            })
                          }
                        >
                          <option value="gradient">{t('textLeafBgGradient')}</option>
                          <option value="image">{t('textLeafBgImage')}</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTextLeafBgPicker(true)}
                          disabled={textLeafBgMode !== 'image'}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2 text-[11px] font-bold text-cyan-800 hover:from-cyan-100 hover:to-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FaImages className="h-3.5 w-3.5 shrink-0" />
                          {t('textLeafPickBgImage')}
                        </button>
                        {textLeafBgMode === 'image' && textLeafBgUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...state,
                                style: {
                                  ...state.style,
                                  textLeafBgImageUrl: undefined,
                                  textLeafBgImageId: undefined,
                                  textLeafBgMode: 'gradient',
                                },
                              })
                            }
                            className="text-[10px] font-semibold text-slate-500 hover:text-rose-600"
                          >
                            {t('textLeafClearBgImage')}
                          </button>
                        )}
                      </div>
                    </div>
                    {textLeafBgMode === 'gradient' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('textLeafGradientCss')}</label>
                        <textarea
                          rows={2}
                          className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-[11px] font-mono bg-white/90"
                          placeholder={defaultTextLeafGradient}
                          value={state.style?.textLeafBgGradient ?? ''}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: { ...state.style, textLeafBgGradient: e.target.value || undefined },
                            })
                          }
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('textPanelBlur')}</label>
                        <input
                          type="range"
                          min={4}
                          max={40}
                          value={textPanelBlurPx}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: { ...state.style, textPanelBlurPx: Number(e.target.value) },
                            })
                          }
                          className="w-full accent-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('textPanelGlassOpacity')}</label>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={state.style?.textPanelGlassOpacity ?? 35}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: { ...state.style, textPanelGlassOpacity: Number(e.target.value) },
                            })
                          }
                          className="w-full accent-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('textPanelGlassTint')}</label>
                        <input
                          type="color"
                          className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white"
                          value={textPanelGlassColor}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: { ...state.style, textPanelGlassColor: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggle('effects')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-slate-50 transition-all"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('pageEffects')}</span>
                  <span className="text-slate-400 text-[10px]">{openSection === 'effects' ? '▼' : '▶'}</span>
                </button>
                {openSection === 'effects' && (
                  <div className="p-4 pt-2 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('overlayOpacity')}</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={state.style?.overlayOpacity ?? 50}
                          onChange={(e) =>
                            onChange({ ...state, style: { ...state.style, overlayOpacity: Number(e.target.value) } })
                          }
                          className="w-full accent-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('gradient')}</label>
                        <select
                          className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          value={state.style?.overlayGradientDirection ?? 'top-bottom'}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              style: {
                                ...state.style,
                                overlayGradientDirection: e.target.value as 'top-bottom' | 'bottom-top' | 'radial',
                              },
                            })
                          }
                        >
                          <option value="top-bottom">{t('gradTopBottom')}</option>
                          <option value="bottom-top">{t('gradBottomTop')}</option>
                          <option value="radial">{t('gradRadial')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t('overlayColor')}</label>
                        <input
                          type="color"
                          className="w-full h-8 rounded-xl border border-slate-200 p-0 bg-white block"
                          value={state.style?.overlayColor ?? '#000000'}
                          onChange={(e) =>
                            onChange({ ...state, style: { ...state.style, overlayColor: e.target.value } })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggle('extras')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-slate-50 transition-all"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('backgroundLogo')}</span>
                  <span className="text-slate-400 text-[10px]">{openSection === 'extras' ? '▼' : '▶'}</span>
                </button>
                {openSection === 'extras' && (
                  <div className="p-4 pt-2 bg-gradient-to-b from-slate-50/80 to-white space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 mb-2">{t('backgroundSection')}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.style?.blurBackground ?? false}
                            onChange={(e) =>
                              onChange({ ...state, style: { ...state.style, blurBackground: e.target.checked } })
                            }
                            className="rounded border-slate-200 accent-cyan-500"
                          />
                          <span className="text-[11px] text-slate-600">{t('blur')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.style?.vignette ?? false}
                            onChange={(e) =>
                              onChange({ ...state, style: { ...state.style, vignette: e.target.checked } })
                            }
                            className="rounded border-slate-200 accent-cyan-500"
                          />
                          <span className="text-[11px] text-slate-600">{t('vignette')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.style?.darkModeCover ?? false}
                            onChange={(e) =>
                              onChange({ ...state, style: { ...state.style, darkModeCover: e.target.checked } })
                            }
                            className="rounded border-slate-200 accent-cyan-500"
                          />
                          <span className="text-[11px] text-slate-600">{t('darkMode')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.style?.subtleAnimation ?? false}
                            onChange={(e) =>
                              onChange({ ...state, style: { ...state.style, subtleAnimation: e.target.checked } })
                            }
                            className="rounded border-slate-200 accent-cyan-500"
                          />
                          <span className="text-[11px] text-slate-600">{t('animation')}</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 mb-2">{t('logoSection')}</p>
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2 text-[11px] font-bold text-cyan-800 hover:from-cyan-100 hover:to-indigo-100 hover:border-cyan-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer w-auto"
                          onClick={() => setShowLogoPicker(true)}
                        >
                          <FaImages className="h-3.5 w-3.5 shrink-0" />
                          {t('useFromAlbum')}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{t('position')}</label>
                            <select
                              className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                              value={state.style?.logoPosition ?? 'top-left'}
                              onChange={(e) => {
                                const pos = e.target.value as 'top-left' | 'top-right' | 'top-center' | 'bottom-center';
                                const preset = getLogoPreset(pos);
                                onChange({
                                  ...state,
                                  style: {
                                    ...state.style,
                                    logoPosition: pos,
                                    logoPositionX: preset.x,
                                    logoPositionY: preset.y,
                                  },
                                });
                              }}
                            >
                              <option value="top-left">{t('logoTopLeft')}</option>
                              <option value="top-center">{t('logoTopCenter')}</option>
                              <option value="top-right">{t('logoTopRight')}</option>
                              <option value="bottom-center">{t('logoBottomCenter')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">{t('size')}</label>
                            <input
                              type="range"
                              min={20}
                              max={120}
                              value={state.style?.logoSize ?? 60}
                              onChange={(e) =>
                                onChange({ ...state, style: { ...state.style, logoSize: Number(e.target.value) } })
                              }
                              className="w-full accent-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
          </div>
        </div>
          </div>
        </section>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('quantum')} v8.4.2</span>
            <button type="button" className="text-[9px] font-black text-[#4648d4] uppercase tracking-widest bg-[#4648d4]/10 px-3 py-1.5 rounded-lg">
              Logs
            </button>
          </div>
        </div>
    )}

    {showAlbumPicker && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowAlbumPicker(false)}
        onKeyDown={(e) => e.key === 'Escape' && setShowAlbumPicker(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="album-picker-title"
      >
        <div
          className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_25px_60px_-12px_rgba(15,23,42,0.25)] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <h3 id="album-picker-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {t('chooseImageTitle', { title })}
            </h3>
            <button
              type="button"
              onClick={() => setShowAlbumPicker(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              aria-label={t('close')}
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Upload from device
              </label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-[11px] text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white hover:file:bg-slate-800"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await fileToDataUrl(file);
                  onChange({ ...state, imageDataUrl: dataUrl });
                  setShowAlbumPicker(false);
                }}
              />
            </div> */}

            <div className="h-px w-full bg-slate-200 my-1" />

            <FileVaultImagePicker
              filterImageIds={filterImageIds}
              onPick={async (picked) => {
                const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
                onChange({ ...state, imageDataUrl: imgUrl, imageId: picked.imageId });
                setShowAlbumPicker(false);
              }}
            />
          </div>
        </div>
      </div>,
      document.body
    )}

    {showLogoPicker && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowLogoPicker(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_25px_60px_-12px_rgba(15,23,42,0.25)] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
            <h3 className="text-sm font-bold text-slate-800">
              {t('chooseLogoTitle', { title })}
            </h3>
            <button
              type="button"
              onClick={() => setShowLogoPicker(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              aria-label={t('close')}
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <FileVaultImagePicker
              filterImageIds={filterImageIds}
              onPick={async (picked) => {
                onChange({
                  ...state,
                  style: {
                    ...state.style,
                    logoDataUrl: picked.dataUrl,
                    logoImageId: picked.imageId,
                  },
                });
                setShowLogoPicker(false);
              }}
            />
          </div>
        </div>
      </div>,
      document.body
    )}

    {showTextLeafBgPicker && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowTextLeafBgPicker(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_25px_60px_-12px_rgba(15,23,42,0.25)] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
            <h3 className="text-sm font-bold text-slate-800">{t('textLeafPickBgTitle', { title })}</h3>
            <button
              type="button"
              onClick={() => setShowTextLeafBgPicker(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              aria-label={t('close')}
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <FileVaultImagePicker
              filterImageIds={filterImageIds}
              onPick={async (picked) => {
                const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
                onChange({
                  ...state,
                  style: {
                    ...state.style,
                    textLeafBgMode: 'image',
                    textLeafBgImageUrl: imgUrl,
                    textLeafBgImageId: picked.imageId,
                  },
                });
                setShowTextLeafBgPicker(false);
              }}
            />
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

const EDITOR_PANEL_WIDTH_KEY = 'photo-theme-category-editor-panel-width';
const EDITOR_PANEL_WIDTH_DEFAULT = 420;
const EDITOR_PANEL_WIDTH_MIN = 300;
const EDITOR_PANEL_WIDTH_MAX = 720;

function clampEditorPanelWidth(width: number): number {
  return Math.min(EDITOR_PANEL_WIDTH_MAX, Math.max(EDITOR_PANEL_WIDTH_MIN, width));
}

function readStoredEditorPanelWidth(): number {
  try {
    const stored = localStorage.getItem(EDITOR_PANEL_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) return clampEditorPanelWidth(parsed);
    }
  } catch {
    /* ignore */
  }
  return EDITOR_PANEL_WIDTH_DEFAULT;
}

const PhotoThemeCategoryPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { templateId?: number; photobookId?: number; albumImageIds?: number[]; albumName?: string };
  };
  const { user } = useAuth();
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeCategoryPage' });
  const themeMetaList = React.useMemo((): ThemeMeta[] => [
    {
      id: 'birthday',
      title: t('themeMetaBirthdayTitle'),
      subtitle: t('themeMetaBirthdaySubtitle'),
      icon: FaStar,
      color: 'from-pink-500 via-rose-500 to-pink-600',
    },
    {
      id: 'anniversary',
      title: t('themeMetaAnniversaryTitle'),
      subtitle: t('themeMetaAnniversarySubtitle'),
      icon: FaHeart,
      color: 'from-red-500 via-pink-500 to-red-600',
    },
    {
      id: 'wedding',
      title: t('themeMetaWeddingTitle'),
      subtitle: t('themeMetaWeddingSubtitle'),
      icon: FaStar,
      color: 'from-purple-500 via-indigo-500 to-purple-600',
    },
    {
      id: 'baby-kids',
      title: t('themeMetaBabyKidsTitle'),
      subtitle: t('themeMetaBabyKidsSubtitle'),
      icon: FaUsers,
      color: 'from-blue-500 via-cyan-500 to-blue-600',
    },
    {
      id: 'travel',
      title: t('themeMetaTravelTitle'),
      subtitle: t('themeMetaTravelSubtitle'),
      icon: FaCloud,
      color: 'from-teal-500 via-emerald-500 to-teal-600',
    },
    {
      id: 'family',
      title: t('themeMetaFamilyTitle'),
      subtitle: t('themeMetaFamilySubtitle'),
      icon: FaImages,
      color: 'from-amber-500 via-orange-500 to-amber-600',
    },
    {
      id: 'festival',
      title: t('themeMetaFestivalTitle'),
      subtitle: t('themeMetaFestivalSubtitle'),
      icon: FaCalendarAlt,
      color: 'from-violet-500 via-purple-500 to-violet-600',
    },
    {
      id: 'corporate',
      title: t('themeMetaCorporateTitle'),
      subtitle: t('themeMetaCorporateSubtitle'),
      icon: FaBriefcase,
      color: 'from-slate-500 via-gray-500 to-slate-600',
    },
    {
      id: 'minimal',
      title: t('themeMetaMinimalTitle'),
      subtitle: t('themeMetaMinimalSubtitle'),
      icon: FaFolderOpen,
      color: 'from-gray-400 via-gray-500 to-gray-600',
    },
    {
      id: 'custom',
      title: t('themeMetaCustomTitle'),
      subtitle: t('themeMetaCustomSubtitle'),
      icon: FaPalette,
      color: 'from-indigo-500 via-blue-500 to-indigo-600',
    },
  ], [t]);

  // Persist studio album state when arriving from studio/albums (so album builder can filter images)
  React.useEffect(() => {
    if (categorySlug && location.state?.albumImageIds) {
      sessionStorage.setItem(`studioAlbum_${categorySlug}`, JSON.stringify({
        imageIds: location.state.albumImageIds,
        albumName: location.state.albumName,
      }));
    }
  }, [categorySlug, location.state?.albumImageIds, location.state?.albumName]);

  // Read studio album image filter from sessionStorage (set when user comes from studio/albums)
  const studioAlbumImageIds = React.useMemo<number[] | undefined>(() => {
    if (location.state?.albumImageIds) return location.state.albumImageIds;
    try {
      const raw = sessionStorage.getItem(`studioAlbum_${categorySlug}`);
      if (raw) return JSON.parse(raw)?.imageIds ?? undefined;
    } catch { /* ignore */ }
    return undefined;
  }, [categorySlug, location.state?.albumImageIds]);

  const meta = themeMetaList.find((m) => m.id === categorySlug) ?? {
    id: categorySlug || 'unknown',
    title: t('customThemeTitle'),
    subtitle: t('customThemeSubtitle'),
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
  };

  const Icon = meta.icon;
  const initialTemplateId = location.state?.templateId;

  // Persist templateId in localStorage so it survives page refresh
  const PHOTOBOOK_KEY = `photobook_${categorySlug}`;
  const storedTemplateId = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(PHOTOBOOK_KEY);
      if (raw) return JSON.parse(raw) as { templateId: number; photobookId?: number };
    } catch { /* ignore */ }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  // When creating a brand-new album we want a blank cover/last page
  // (no default text or image). Saved albums will still load their
  // own content via loadSavedCovers / handleContinueAlbum.
  const [coverPage, setCoverPage] = React.useState<EditablePageState>({ ...defaultPageState });
  const [lastPage, setLastPage] = React.useState<EditablePageState>({ ...defaultPageState });

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isLoadingCovers, setIsLoadingCovers] = React.useState(false);
  const [userCoverThemes, setUserCoverThemes] = React.useState<ApiCoverRecord[]>([]);
  const [isLoadingUserThemes, setIsLoadingUserThemes] = React.useState(false);
  const [userThemesError, setUserThemesError] = React.useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = React.useState<number | null>(
    initialTemplateId ?? storedTemplateId?.templateId ?? null
  );
  const [photobookId, setPhotobookId] = React.useState<number | null>(
    location.state?.photobookId ?? storedTemplateId?.photobookId ?? null
  );
  const photobookIdRef = React.useRef(photobookId);
  photobookIdRef.current = photobookId;
  const activeTemplateIdRef = React.useRef(activeTemplateId);
  activeTemplateIdRef.current = activeTemplateId;

  const [isLoadingSelectedTheme, setIsLoadingSelectedTheme] = React.useState(false);

  type PhotobookListItem = {
    id: number; templateId: number; categorySlug: string; title: string;
    status: string; currentStep: string; pageCount: number;
    hasCovers: boolean; savedPagesCount: number;
    createdAt: string; updatedAt: string;
  };
  const [myAlbums, setMyAlbums] = React.useState<PhotobookListItem[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = React.useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = React.useState<number | null>(null);
  const [albumListVersion, setAlbumListVersion] = React.useState(0);
  const [activeEditSide, setActiveEditSide] = React.useState<'cover' | 'last'>('cover');
  const [canvasViewMode, setCanvasViewMode] = React.useState<'spread' | 'flipbook'>('spread');
  const [editorPanelWidth, setEditorPanelWidth] = React.useState(readStoredEditorPanelWidth);
  const [isResizingPanel, setIsResizingPanel] = React.useState(false);
  const panelResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const editorPanelWidthRef = React.useRef(editorPanelWidth);
  editorPanelWidthRef.current = editorPanelWidth;

  const handlePanelResizeStart = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    panelResizeRef.current = { startX: e.clientX, startWidth: editorPanelWidthRef.current };
    setIsResizingPanel(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePanelResizeMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelResizeRef.current) return;
    const delta = panelResizeRef.current.startX - e.clientX;
    setEditorPanelWidth(clampEditorPanelWidth(panelResizeRef.current.startWidth + delta));
  }, []);

  const finishPanelResize = React.useCallback((target: HTMLDivElement, pointerId: number) => {
    if (!panelResizeRef.current) return;
    panelResizeRef.current = null;
    setIsResizingPanel(false);
    try {
      localStorage.setItem(EDITOR_PANEL_WIDTH_KEY, String(editorPanelWidthRef.current));
    } catch {
      /* ignore */
    }
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  }, []);

  const handlePanelResizeEnd = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    finishPanelResize(e.currentTarget, e.pointerId);
  }, [finishPanelResize]);

  React.useEffect(() => {
    if (!isResizingPanel) return;
    document.body.classList.add('category-editor-panel-resizing');
    return () => document.body.classList.remove('category-editor-panel-resizing');
  }, [isResizingPanel]);

  const activePageState = activeEditSide === 'cover' ? coverPage : lastPage;
  const setActivePageState = activeEditSide === 'cover' ? setCoverPage : setLastPage;
  const [activeStylePreset, setActiveStylePreset] = React.useState<CoverStylePresetId | null>('editorial');
  const [activeSwatchId, setActiveSwatchId] = React.useState<string | null>(null);

  const mergeActivePageStyle = React.useCallback(
    (stylePatch: Partial<NonNullable<EditablePageState['style']>>) => {
      const merge = (prev: EditablePageState): EditablePageState => ({
        ...prev,
        style: {
          ...prev.style,
          ...stylePatch,
          textLeafBgMode: stylePatch.textLeafBgMode ?? 'gradient',
        },
      });
      if (activeEditSide === 'cover') setCoverPage(merge);
      else setLastPage(merge);
    },
    [activeEditSide],
  );

  const applyStylePreset = React.useCallback(
    (presetId: CoverStylePresetId) => {
      const preset = COVER_STYLE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setActiveStylePreset(presetId);
      setActiveSwatchId(null);
      mergeActivePageStyle(preset.stylePatch);
    },
    [mergeActivePageStyle],
  );

  const applyColorSwatch = React.useCallback(
    (swatchId: string) => {
      const swatch = COLOR_SWATCH_PRESETS.find((s) => s.id === swatchId);
      if (!swatch) return;
      setActiveSwatchId(swatchId);
      setActiveStylePreset(null);
      mergeActivePageStyle(swatch.stylePatch);
    },
    [mergeActivePageStyle],
  );

  React.useEffect(() => {
    setActiveStylePreset(null);
    setActiveSwatchId(null);
  }, [activeEditSide]);

  type WorkspaceSection = 'assets' | 'layouts' | 'albums';
  const presetGalleryRef = React.useRef<HTMLDivElement>(null);
  const albumsListRef = React.useRef<HTMLDivElement>(null);
  const [workspaceSection, setWorkspaceSection] = React.useState<WorkspaceSection>('layouts');
  const [showWorkspaceAssetsPicker, setShowWorkspaceAssetsPicker] = React.useState(false);
  const [projectAssetCount, setProjectAssetCount] = React.useState(0);

  React.useEffect(() => {
    if (studioAlbumImageIds?.length) {
      setProjectAssetCount(studioAlbumImageIds.length);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setProjectAssetCount(0);
      return;
    }
    api
      .get('/api/images/user/all', { params: { token } })
      .then((res) => setProjectAssetCount(res.data?.totalImages ?? res.data?.images?.length ?? 0))
      .catch(() => setProjectAssetCount(0));
  }, [studioAlbumImageIds, albumListVersion]);

  const workspaceNavClass = (section: WorkspaceSection) =>
    workspaceSection === section
      ? 'w-full flex items-center gap-4 p-4 bg-[#4648d4]/5 text-[#4648d4] rounded-xl font-bold border border-[#4648d4]/10 text-sm transition-colors'
      : 'w-full flex items-center gap-4 p-4 text-[#464554] hover:bg-slate-50 hover:text-[#4648d4] rounded-xl text-sm transition-colors';

  const handleWorkspaceAssets = () => {
    setWorkspaceSection('assets');
    setShowWorkspaceAssetsPicker(true);
  };

  const handleWorkspaceLayouts = () => {
    setWorkspaceSection('layouts');
    presetGalleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleWorkspaceAlbums = () => {
    setWorkspaceSection('albums');
    albumsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleWorkspaceAssetPick = async (picked: { name: string; dataUrl: string; imageId?: number }) => {
    const imgUrl = picked.imageId ? buildPreviewUrl(picked.imageId) : picked.dataUrl;
    const patch = { imageDataUrl: imgUrl, imageId: picked.imageId };
    if (activeEditSide === 'cover') {
      setCoverPage((prev) => ({ ...prev, ...patch }));
    } else {
      setLastPage((prev) => ({ ...prev, ...patch }));
    }
    setShowWorkspaceAssetsPicker(false);
  };

  // Fetch all albums for this category
  React.useEffect(() => {
    if (!user?.id || !categorySlug) return;
    const load = async () => {
      setIsLoadingAlbums(true);
      try {
        const token = getStoredToken();
        const res = await api.get(`/api/photobooks/by-category/${categorySlug}`, {
          headers: { ...(token ? { 'X-API-KEY': token } : {}) },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setMyAlbums(list);
        // Auto-recover templateId from the latest album if none set
        if (!activeTemplateId && list.length > 0) {
          const latest = list[0];
          if (latest?.templateId) setActiveTemplateId(latest.templateId);
        }
      } catch { setMyAlbums([]); }
      finally { setIsLoadingAlbums(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, categorySlug, albumListVersion]);

  const mapApiSideToEditableState = React.useCallback(
    async (side: ApiCoverSide | undefined | null, kind: PageKind): Promise<EditablePageState> => {
      if (!side) {
        return {
          ...defaultPageState,
          headline: kind === 'cover' ? meta.title : t('thankYou'),
          subheadline:
            kind === 'cover'
              ? meta.subtitle
              : t('gratefulSub'),
        };
      }

      const mapped: EditablePageState = {
        headline:
          side.headline ||
          (kind === 'cover' ? meta.title : t('thankYou')),
        subheadline:
          side.subheadline ||
          (kind === 'cover'
            ? meta.subtitle
            : t('gratefulSub')),
        description: side.description || '',
        style: {
          fontSize: side.fontSize ?? 20,
          fontWeight: side.fontWeight != null ? Number(side.fontWeight) : 700,
          align: (side.align as 'left' | 'center' | 'right') || 'center',
          verticalAlign:
            (side.position as 'top' | 'center' | 'bottom') ||
            (kind === 'cover' ? 'center' : 'bottom'),
          fontFamily: side.fontFamily || undefined,
          headlineColor: side.headlineColor || '#ffffff',
          subheadlineColor: side.subheadlineColor || '#e5e7eb',
          imageScale: side.imageZoom ?? 1,
          overlayOpacity: side.overlayOpacity,
          overlayColor: side.overlayColor,
          overlayGradientDirection: undefined,
          blurBackground: side.backgroundBlur,
          vignette: side.backgroundVignette,
          darkModeCover: side.backgroundDarkMode,
          subtleAnimation: side.backgroundAnimation,
          gradient: typeof side.gradient === 'string' ? side.gradient : undefined,
          logoPosition: normalizeLogoPosition(side.logoPosition) ?? (side.logoPosition as
            | 'top-left'
            | 'top-right'
            | 'top-center'
            | 'bottom-center'
            | undefined),
          logoSize: side.logoSize,
        },
      };

      // Capture existing imageId so we don't re-upload on save (use explicit > 0; 0 is falsy in JS)
      const imgId = side.imageId != null ? Number(side.imageId) : 0;
      if (imgId > 0) mapped.imageId = imgId;

      if (imgId > 0) {
        mapped.imageDataUrl = buildPreviewUrl(imgId);
      } else if (side.imageUrl) {
        mapped.imageDataUrl = resolveBackendImageUrl(side.imageUrl);
      }

      const logoId = side.logoImageId != null ? Number(side.logoImageId) : 0;
      if (logoId > 0) {
        mapped.style = { ...mapped.style, logoImageId: logoId, logoDataUrl: buildPreviewUrl(logoId) };
      } else if (side.logoImageUrl) {
        mapped.style = { ...mapped.style, logoDataUrl: resolveBackendImageUrl(side.logoImageUrl) };
      }
      const lp = normalizeLogoPosition(side.logoPosition) ?? mapped.style?.logoPosition;
      if (lp && mapped.style && mapped.style.logoPositionX == null && mapped.style.logoPositionY == null) {
        const pr = getLogoPresetCoords(lp);
        mapped.style = { ...mapped.style, logoPosition: lp, logoPositionX: pr.x, logoPositionY: pr.y };
      }
      let jsonExtras: Partial<NonNullable<EditablePageState['style']>> = {};
      const extrasRaw = side.coverStyleExtrasJson;
      if (typeof extrasRaw === 'string' && extrasRaw.trim()) {
        try {
          const parsed = JSON.parse(extrasRaw) as Partial<NonNullable<EditablePageState['style']>>;
          if (parsed && typeof parsed === 'object') jsonExtras = parsed;
        } catch {
          /* ignore */
        }
      }
      mapped.style = { ...mapped.style, ...coverLeafFieldsFromApi(side), ...jsonExtras };
      return mapped;
    },
    [meta.title, meta.subtitle, t]
  );

  // Load all themes (covers) created by the user
  React.useEffect(() => {
    const loadUserThemes = async () => {
      if (!user?.id) return;

      setIsLoadingUserThemes(true);
      setUserThemesError(null);

      try {
        const token = getStoredToken();
        const response = await api.get<ApiCoverRecord[]>('/api/covers', {
          params: { userId: user.id, ...(activeTemplateId ? { templateId: activeTemplateId.toString() } : {}) },
          headers: {
            ...(token ? { 'X-API-KEY': token } : {}),
          },
        });

        setUserCoverThemes(response.data || []);
      } catch (error: any) {
        console.error('Failed to load user themes /api/covers:', error);
        setUserThemesError(t('userThemesError'));
      } finally {
        setIsLoadingUserThemes(false);
      }
    };

    loadUserThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTemplateId]);

  // Load saved covers: photobook-scoped only when editing a book (no template fallback — avoids wrong book).
  // Without photobookId, legacy template-scoped /api/covers when a template is selected.
  React.useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setIsLoadingCovers(false);
      return;
    }
    if (photobookId == null && !activeTemplateId) {
      setIsLoadingCovers(false);
      return;
    }

    const pbAtStart = photobookId;
    const tplAtStart = activeTemplateId;

    const loadSavedCovers = async () => {
      setIsLoadingCovers(true);
      try {
        const token = getStoredToken();
        const headers = { ...(token ? { 'X-API-KEY': token } : {}) };
        let payload: { frontCover?: ApiCoverSide; backCover?: ApiCoverSide } | null = null;

        if (photobookId != null) {
          const res = await api
            .get(`/api/photobooks/${photobookId}/covers`, { headers })
            .catch(() => null);
          if (res?.data?.frontCover || res?.data?.backCover) {
            payload = { frontCover: res.data.frontCover, backCover: res.data.backCover };
          }
        } else if (activeTemplateId) {
          const res = await api
            .get<ApiCoverRecord[]>('/api/covers', {
              params: { userId: user.id, templateId: String(activeTemplateId) },
              headers,
            })
            .catch(() => null);
          if (res?.data) {
            const rec = Array.isArray(res.data) ? res.data[0] : res.data;
            if (rec && (rec.frontCover || rec.backCover)) {
              payload = { frontCover: rec.frontCover, backCover: rec.backCover };
            }
          }
        }

        if (
          payload &&
          isApiCoverSideEmpty(payload.frontCover) &&
          isApiCoverSideEmpty(payload.backCover)
        ) {
          payload = null;
        }

        if (
          cancelled ||
          photobookIdRef.current !== pbAtStart ||
          activeTemplateIdRef.current !== tplAtStart
        ) {
          return;
        }

        const extras = loadCoverLeafExtras(pbAtStart);

        if (payload) {
          const { frontCover, backCover } = payload;
          if (frontCover) {
            let mapped = await mapApiSideToEditableState(frontCover, 'cover');
            mapped = mergeLeafExtrasIntoPage(mapped, extras.front);
            setCoverPage(mapped);
          }
          if (backCover) {
            let mapped = await mapApiSideToEditableState(backCover, 'last');
            mapped = mergeLeafExtrasIntoPage(mapped, extras.back);
            setLastPage(mapped);
          }
        } else if (extras.front || extras.back) {
          if (extras.front) setCoverPage((prev) => mergeLeafExtrasIntoPage(prev, extras.front));
          if (extras.back) setLastPage((prev) => mergeLeafExtrasIntoPage(prev, extras.back));
        }
      } catch (error: any) {
        console.error('Failed to load saved covers:', error);
      } finally {
        if (
          photobookIdRef.current === pbAtStart &&
          activeTemplateIdRef.current === tplAtStart
        ) {
          setIsLoadingCovers(false);
        }
      }
    };

    loadSavedCovers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, photobookId, activeTemplateId, mapApiSideToEditableState]);

  const handleEditTheme = async (templateId: number) => {
    if (!user?.id) return;

    setIsLoadingSelectedTheme(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = getStoredToken();
      const response = await api.get<ApiCoverRecord[]>('/api/covers', {
        params: { userId: user.id, templateId : templateId.toString() },
        headers: {
          ...(token ? { 'X-API-KEY': token } : {}),
        },
      });

      const record = response.data?.[0];
      if (!record) {
        console.warn('No theme record found for templateId', templateId);
        return;
      }

      setActiveTemplateId(templateId);

      const mappedFront = await mapApiSideToEditableState(record.frontCover, 'cover');
      const mappedBack = await mapApiSideToEditableState(record.backCover, 'last');

      setCoverPage(mappedFront);
      setLastPage(mappedBack);
    } catch (error: any) {
      console.error('Failed to load theme for editing:', error);
      setSaveError(t('saveErrorLoadTheme'));
    } finally {
      setIsLoadingSelectedTheme(false);
    }
  };

  // Helper function to convert dataUrl to File
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Helper function to map EditablePageState to API format (all fields for frontCover/backCover payload)
  const mapPageStateToApiFormat = (
    pageState: EditablePageState,
    opts: { imageId?: number; logoImageId?: number } = {}
  ) => {
    const style = pageState.style;
    const overlayOpacity = style?.overlayOpacity ?? 50;
    // Empty overlayColor produced invalid CSS (`linear-gradient(..., 00, ...)`). Always anchor to a hex color for the gradient stop.
    const rawOc = (style?.overlayColor || '').trim();
    const overlayColorForGradient =
      rawOc.length >= 4 && (rawOc.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(rawOc) || /^[0-9a-fA-F]{3}$/.test(rawOc))
        ? rawOc.startsWith('#')
          ? rawOc
          : `#${rawOc}`
        : '#000000';
    const alphaHex = Math.round((overlayOpacity / 100) * 255)
      .toString(16)
      .padStart(2, '0');
    const gradient =
      style?.overlayGradientDirection === 'radial'
        ? `radial-gradient(circle, ${overlayColorForGradient}${alphaHex} 0%, transparent 70%)`
        : style?.overlayGradientDirection === 'bottom-top'
          ? `linear-gradient(to top, ${overlayColorForGradient}${alphaHex}, transparent 40%)`
          : `linear-gradient(to bottom, ${overlayColorForGradient}${alphaHex}, transparent 40%)`;
    const leaf = coverLeafFieldsToApi(style);
    const coverStyleExtrasJson =
      Object.keys(leaf).length > 0 ? JSON.stringify(leaf) : undefined;
    return {
      headline: pageState.headline || '',
      subheadline: pageState.subheadline || '',
      description: pageState.description || '',
      fontSize: style?.fontSize ?? 20,
      fontWeight: String(style?.fontWeight ?? 700),
      align: style?.align || 'center',
      position: style?.verticalAlign || 'center',
      fontFamily: style?.fontFamily || '',
      headlineColor: style?.headlineColor || '#ffffff',
      subheadlineColor: style?.subheadlineColor || '#e5e7eb',
      imageId: opts.imageId ?? 0,
      imageZoom: style?.imageScale ?? 1,
      overlayOpacity: style?.overlayOpacity ?? 0,
      gradient,
      overlayColor: style?.overlayColor || '',
      backgroundBlur: style?.blurBackground ?? false,
      backgroundVignette: style?.vignette ?? false,
      backgroundDarkMode: style?.darkModeCover ?? false,
      backgroundAnimation: style?.subtleAnimation ?? false,
      logoImageId: opts.logoImageId ?? 0,
      logoPosition: style?.logoPosition || '',
      logoSize: style?.logoSize || 60,
      ...leaf,
      ...(coverStyleExtrasJson ? { coverStyleExtrasJson } : {}),
    };
  };

  // Resolve image ID: use existing imageId from state, or upload data: URL, or extract from URL pattern
  const resolveImageId = async (dataUrl?: string, existingId?: number): Promise<number> => {
    if (existingId && existingId > 0) return existingId;
    if (!dataUrl) return 0;
    if (dataUrl.startsWith('data:')) {
      try {
        const file = dataUrlToFile(dataUrl, 'image.jpg');
        const res = await imageService.uploadImage(file);
        if (res.cloudUploads?.s3?.id) return res.cloudUploads.s3.id;
        if (res.image?.id) return Number(res.image.id);
      } catch (err) {
        console.warn('Image upload failed:', err);
      }
    }
    // Try to extract imageId from URL pattern /api/images/{id}/preview
    const match = dataUrl.match(/\/api\/images\/(\d+)\/(preview|download|thumbnail)/);
    if (match) return Number(match[1]);
    return 0;
  };

  // ── Album management handlers ──

  /** Select an existing album; saved covers load via the photobookId effect only (avoids duplicate requests and races with "Create new"). */
  const handleContinueAlbum = (album: PhotobookListItem) => {
    setPhotobookId(album.id);
    setActiveTemplateId(album.templateId);
    localStorage.setItem(PHOTOBOOK_KEY, JSON.stringify({ templateId: album.templateId, photobookId: album.id }));
  };

  const handleDeleteAlbum = async (albumId: number) => {
    if (!window.confirm(t('confirmDeleteAlbum'))) return;
    setIsDeletingAlbum(albumId);
    try {
      const token = getStoredToken();
      await api.delete(`/api/photobooks/${albumId}`, { headers: { ...(token ? { 'X-API-KEY': token } : {}) } });
      setMyAlbums(prev => prev.filter(a => a.id !== albumId));
      if (photobookId === albumId) {
        setPhotobookId(null);
        setCoverPage({ ...defaultPageState, headline: meta.title, subheadline: meta.subtitle });
        setLastPage({ ...defaultPageState, headline: t('thankYou'), subheadline: t('gratefulSub') });
        localStorage.removeItem(PHOTOBOOK_KEY);
      }
      try {
        localStorage.removeItem(COVER_LEAF_EXTRAS_KEY(albumId));
      } catch {
        /* ignore */
      }
    } catch { alert(t('deleteAlbumFailed')); }
    finally { setIsDeletingAlbum(null); }
  };

  const handleCreateNewAlbum = () => {
    setPhotobookId(null);
    // Clear to a completely blank state for a fresh album (edit flows must not leave stale cover loads applying)
    setCoverPage({ ...defaultPageState });
    setLastPage({ ...defaultPageState });
    localStorage.removeItem(PHOTOBOOK_KEY);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Save covers to backend API
  const handleSaveCovers = async () => {

    if (!activeTemplateId) {
      console.warn('Missing templateId, cannot save');
      setSaveError(t('templateIdMissing'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = getStoredToken();
      const headers = { ...(token ? { 'X-API-KEY': token } : {}), 'Content-Type': 'application/json' };

      // 1) Create photobook first (always new if no existing photobookId)
      let savedPhotobookId = photobookId;
      if (!savedPhotobookId) {
        const pbRes = await api.post('/api/photobooks', {
          templateId: Number(activeTemplateId),
          categorySlug: meta.id,
          title: coverPage.headline || meta.title,
        }, { headers });
        savedPhotobookId = pbRes.data?.id;
        if (savedPhotobookId) setPhotobookId(savedPhotobookId);
      }

      if (!savedPhotobookId) {
        setSaveError(t('createPhotobookFailed'));
        setIsSaving(false);
        return;
      }

      // 2) Upload images only if needed (skip for existing FileVault images)
      const frontCoverImageId = await resolveImageId(coverPage.imageDataUrl, coverPage.imageId);
      const backCoverImageId = await resolveImageId(lastPage.imageDataUrl, lastPage.imageId);
      const frontLogoImageId = await resolveImageId(coverPage.style?.logoDataUrl, coverPage.style?.logoImageId);
      const backLogoImageId = await resolveImageId(lastPage.style?.logoDataUrl, lastPage.style?.logoImageId);
      const frontTextLeafBgId = await resolveImageId(
        coverPage.style?.textLeafBgImageUrl,
        coverPage.style?.textLeafBgImageId
      );
      const backTextLeafBgId = await resolveImageId(
        lastPage.style?.textLeafBgImageUrl,
        lastPage.style?.textLeafBgImageId
      );

      const coverPageForExtras =
        frontTextLeafBgId > 0
          ? {
              ...coverPage,
              style: {
                ...coverPage.style,
                textLeafBgImageId: frontTextLeafBgId,
                textLeafBgImageUrl: buildPreviewUrl(frontTextLeafBgId),
              },
            }
          : coverPage;
      const lastPageForExtras =
        backTextLeafBgId > 0
          ? {
              ...lastPage,
              style: {
                ...lastPage.style,
                textLeafBgImageId: backTextLeafBgId,
                textLeafBgImageUrl: buildPreviewUrl(backTextLeafBgId),
              },
            }
          : lastPage;
      saveCoverLeafExtras(savedPhotobookId, coverPageForExtras.style, lastPageForExtras.style);
      setCoverPage(coverPageForExtras);
      setLastPage(lastPageForExtras);

      const frontCover = mapPageStateToApiFormat(coverPageForExtras, {
        imageId: frontCoverImageId,
        logoImageId: frontLogoImageId,
      });
      const backCover = mapPageStateToApiFormat(lastPageForExtras, {
        imageId: backCoverImageId,
        logoImageId: backLogoImageId,
      });

      // 3) Save covers — try photobook-scoped endpoint, fall back to old one
      try {
        await api.post(`/api/photobooks/${savedPhotobookId}/covers`, {
          frontCover, backCover,
        }, { headers });
      } catch {
        await api.post('/api/covers', {
          templateId: Number(activeTemplateId), frontCover, backCover,
        }, { headers: { ...headers, Authorization: token ?? '' } });
      }

      setSaveSuccess(true);
      setIsSaving(false);
      setAlbumListVersion(v => v + 1);

      // Persist to localStorage
      try {
        localStorage.setItem(PHOTOBOOK_KEY, JSON.stringify({
          templateId: Number(activeTemplateId),
          photobookId: savedPhotobookId,
        }));
      } catch { /* ignore */ }

      setTimeout(() => {
        navigate(`/photo-themes/${meta.id}/album`, {
          state: {
            coverPage: coverPageForExtras,
            lastPage: lastPageForExtras,
            dbTemplateId: activeTemplateId,
            photobookId: savedPhotobookId,
          },
        });
      }, 2000);
    } catch (error: any) {
      console.error('Failed to save covers:', error);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save covers. Continuing anyway...';

      setSaveError(errorMessage);
      setIsSaving(false);

      // Still navigate even if API save fails (after showing error)
      setTimeout(() => {
        console.log('Navigating despite error...');
        navigate(`/photo-themes/${meta.id}/album`, {
          state: { coverPage, lastPage, dbTemplateId: activeTemplateId },
        });
      }, 3000);
    }
  };

  const suiteGradientClass =
    categorySlug === 'birthday'
      ? 'bg-gradient-to-br from-[#ec4899] to-[#f43f5e]'
      : categorySlug === 'wedding'
        ? 'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]'
        : categorySlug === 'anniversary'
          ? 'bg-gradient-to-br from-[#ef4444] to-[#ec4899]'
          : `bg-gradient-to-br ${meta.color}`;

  return (
    <div className="photo-themes-category category-quantum-studio -m-2 lg:-m-3 flex flex-col min-h-[calc(100dvh-4.5rem)]">
      <header className="sticky top-0 z-30 flex justify-between items-center px-4 sm:px-8 h-16 bg-white/90 backdrop-blur-2xl border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-4 sm:gap-10 min-w-0">
          <button type="button" onClick={() => navigate('/photo-themes')} className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-[#4648d4] lg:hidden" aria-label={t('backToThemes')}>
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[#4648d4] tracking-tight">StudioPro</span>
            <span className="px-2 py-0.5 bg-[#4648d4] text-white text-[9px] font-black uppercase tracking-widest rounded leading-none">{t('quantum')}</span>
          </div>
          <nav className="hidden md:flex gap-8 ml-2">
            <button type="button" onClick={() => navigate('/photo-themes')} className="text-[#464554] text-sm font-semibold hover:text-[#4648d4]">{t('backToThemes')}</button>
            <span className="text-[#4648d4] text-sm font-bold">{t('editorNav')}</span>
          </nav>
          <div className="min-w-0 hidden lg:block">
            <h1 className="text-sm font-bold text-[#0b1c30] truncate">{meta.title}</h1>
            <p className="text-xs text-[#464554] truncate">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 quantum-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t('quantumSync')}</span>
          </div>
          <button type="button" onClick={handleSaveCovers} disabled={isSaving} className="px-4 sm:px-6 py-2.5 bg-[#4648d4] text-white font-bold rounded-xl shadow-lg shadow-[#4648d4]/20 text-sm flex items-center gap-2 disabled:opacity-50">
            {isSaving ? <FaSpinner className="animate-spin w-4 h-4" /> : null}
            {t('export')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <aside className="hidden lg:flex w-72 shrink-0 bg-white border-r border-slate-100 flex-col p-6 overflow-y-auto lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100dvh-9rem)]">
        <div className="flex items-center gap-4 p-5 mb-6 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
          <div className={`w-10 h-10 rounded-xl ${suiteGradientClass} flex items-center justify-center text-white shadow-lg shrink-0`}>
            <Icon className="text-lg" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#0b1c30] truncate">{meta.title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('projectVersion')}</p>
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">{t('workspace')}</p>
        <nav className="space-y-1 shrink-0">
          <button type="button" onClick={handleWorkspaceAssets} className={workspaceNavClass('assets')}>
            <FaFolderOpen className="text-[22px] shrink-0" />
            <span className="font-semibold">{t('projectAssets')}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-400">{projectAssetCount}</span>
          </button>
          <button type="button" onClick={handleWorkspaceLayouts} className={workspaceNavClass('layouts')}>
            <FaPalette className="text-[22px] shrink-0" />
            <span>{t('layoutsNav')}</span>
          </button>
          <button type="button" onClick={handleWorkspaceAlbums} className={workspaceNavClass('albums')}>
            <FaImages className="text-[22px] shrink-0" />
            <span className="font-semibold">{t('myProjects')}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-400">{myAlbums.length}</span>
          </button>
        </nav>
        <div ref={albumsListRef} className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('myAlbums')}</p>
            <button type="button" onClick={handleCreateNewAlbum} className="text-[10px] font-bold text-[#4648d4] hover:underline">
              + {t('newAlbum')}
            </button>
          </div>
          {isLoadingAlbums ? (
            <p className="text-xs text-slate-500 py-2 text-center">{t('loadingAlbums')}</p>
          ) : myAlbums.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 text-center">{t('startFirstAlbum')}</p>
          ) : (
            myAlbums.map((album) => (
            <button key={album.id} type="button" onClick={() => handleContinueAlbum(album)} className={`w-full text-left rounded-xl border p-3 text-xs ${photobookId === album.id ? 'border-[#4648d4]/40 bg-[#4648d4]/5' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className="font-bold text-slate-800 line-clamp-1 block">{album.title || t('untitledAlbum')}</span>
            </button>
          )))}
        </div>
        <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('cloudStorage')}</span>
              <span className="text-[10px] font-black text-[#4648d4]">84%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="w-[84%] h-full bg-[#4648d4] rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto pb-24 xl:pb-20 order-first lg:order-none">
        {isLoadingCovers && (
          <div className="mx-4 mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800 flex items-center gap-2 shrink-0">
            <FaSpinner className="animate-spin w-4 h-4" />{t('loadingSavedCovers')}
          </div>
        )}
        {(saveSuccess || saveError) && (
          <div className={`mx-4 mt-2 rounded-xl px-4 py-2 text-xs shrink-0 ${saveSuccess ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
            {saveSuccess ? t('coversSavedRedirect') : saveError}
          </div>
        )}
        {activeTemplateId && (
          <div className="px-4 sm:px-8 py-2 border-b border-slate-100/80 bg-white/50 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4648d4]">{photobookId ? t('editingAlbum', { id: photobookId }) : t('creatingNewAlbum')}</span>
          </div>
        )}
        <div className="h-14 border-b border-slate-200/40 flex items-center justify-between px-4 sm:px-8 bg-white/60 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
              <button type="button" onClick={() => setActiveEditSide('cover')} className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${activeEditSide === 'cover' ? 'bg-[#4648d4] text-white' : 'text-slate-500'}`}>{t('editFrontCover')}</button>
              <button type="button" onClick={() => setActiveEditSide('last')} className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${activeEditSide === 'last' ? 'bg-[#4648d4] text-white' : 'text-slate-500'}`}>{t('editBackCover')}</button>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <div className="hidden sm:flex items-center gap-6">
              <button type="button" onClick={() => setCanvasViewMode('spread')} className={`text-[11px] font-black uppercase tracking-widest ${canvasViewMode === 'spread' ? 'text-[#4648d4]' : 'text-slate-400'}`}>{t('spread')}</button>
              <button type="button" onClick={() => setCanvasViewMode('flipbook')} className={`text-[11px] font-black uppercase tracking-widest ${canvasViewMode === 'flipbook' ? 'text-[#4648d4]' : 'text-slate-400'}`}>{t('flipbook')}</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col studio-mesh-quantum relative">
          <PageEditorCard key={`canvas-${activeEditSide}`} layout="canvas" kind={activeEditSide} state={activePageState} onChange={setActivePageState} filterImageIds={studioAlbumImageIds} canvasViewMode={canvasViewMode} />
          <div ref={presetGalleryRef} className="px-4 sm:px-8 pb-4 pt-2 shrink-0 relative z-10">
            <div className="neo-glass p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col lg:flex-row gap-8 border-white">
              <div className="flex-[1.5] min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3"><FaStar className="text-[#4648d4]" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('presetGallery')}</h4></div>
                  <span className="text-[9px] font-black text-[#4648d4] bg-[#4648d4]/5 px-3 py-1 rounded-full">{t('aiCore')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {COVER_STYLE_PRESETS.map((preset) => {
                    const selected = activeStylePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyStylePreset(preset.id)}
                        aria-pressed={selected}
                        title={t('applyPresetHint', { name: t(preset.labelKey) })}
                        className={`aspect-video rounded-2xl border relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4648d4]/40 ${
                          selected ? 'border-2 border-[#4648d4] ring-4 ring-[#4648d4]/5' : 'border border-slate-100 hover:border-[#4648d4]/30'
                        }`}
                        style={{ background: preset.previewBg }}
                      >
                        <span className={`absolute bottom-2 left-3 text-[9px] font-black uppercase drop-shadow-sm ${preset.labelClass}`}>
                          {t(preset.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="hidden lg:block w-px bg-slate-100" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4"><FaPalette className="text-[#8127cf]" /><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('legendarySwatches')}</h4></div>
                <div className="flex gap-3">
                  {COLOR_SWATCH_PRESETS.map((swatch) => {
                    const selected = activeSwatchId === swatch.id;
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => applyColorSwatch(swatch.id)}
                        aria-pressed={selected}
                        title={t('applySwatchHint')}
                        className={`flex-1 h-14 rounded-2xl flex overflow-hidden border shadow-sm hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#4648d4]/40 ${
                          selected ? 'border-2 border-[#4648d4] ring-2 ring-[#4648d4]/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="w-1/2" style={{ background: swatch.colors[0] }} />
                        <div className="w-1/4" style={{ background: swatch.colors[1] }} />
                        <div className="flex-1" style={{ background: swatch.colors[2] }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside
        className="hidden xl:flex shrink-0 bg-white border-l border-slate-100 flex-col sticky top-16 self-start h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] overflow-hidden relative"
        style={{ width: editorPanelWidth }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('resizePanel')}
          aria-valuemin={EDITOR_PANEL_WIDTH_MIN}
          aria-valuemax={EDITOR_PANEL_WIDTH_MAX}
          aria-valuenow={editorPanelWidth}
          className={`category-editor-panel-resize-handle ${isResizingPanel ? 'is-dragging' : ''}`}
          onPointerDown={handlePanelResizeStart}
          onPointerMove={handlePanelResizeMove}
          onPointerUp={handlePanelResizeEnd}
          onPointerCancel={handlePanelResizeEnd}
        >
          {isResizingPanel ? (
            <span className="category-editor-panel-resize-tooltip" aria-hidden="true">
              {t('resizePanelWidth', { width: editorPanelWidth })}
            </span>
          ) : null}
        </div>
        <PageEditorCard key={activeEditSide} layout="panel" kind={activeEditSide} state={activePageState} onChange={setActivePageState} filterImageIds={studioAlbumImageIds} />
      </aside>
      </div>

      <aside className="xl:hidden border-t border-slate-200 bg-white max-h-[45vh] overflow-hidden flex flex-col shrink-0">
        <PageEditorCard key={`mobile-${activeEditSide}`} layout="panel" kind={activeEditSide} state={activePageState} onChange={setActivePageState} filterImageIds={studioAlbumImageIds} />
      </aside>

      {showWorkspaceAssetsPicker && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowWorkspaceAssetsPicker(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowWorkspaceAssetsPicker(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-assets-title"
        >
          <div
            className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_25px_60px_-12px_rgba(15,23,42,0.25)] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 id="workspace-assets-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {t('chooseProjectAssetsTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkspaceAssetsPicker(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
                aria-label={t('close')}
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 mb-4">{t('chooseProjectAssetsHint')}</p>
              <FileVaultImagePicker
                filterImageIds={studioAlbumImageIds}
                onPick={handleWorkspaceAssetPick}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className="sticky bottom-0 z-30 bg-white border-t border-slate-100 h-20 flex items-center justify-between px-6 sm:px-12 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 quantum-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hidden sm:inline">{t('legendaryActive')}</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button type="button" onClick={handleSaveCovers} disabled={isSaving} className="px-5 sm:px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 text-sm disabled:opacity-50">{t('saveDraft')}</button>
          <button type="button" onClick={handleSaveCovers} disabled={isSaving} className="px-6 sm:px-10 py-3 bg-[#4648d4] text-white font-black rounded-xl shadow-lg shadow-[#4648d4]/25 hover:scale-[1.02] transition-all flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50">
            {isSaving ? <FaSpinner className="animate-spin w-4 h-4" /> : null}
            {isSaving ? t('savingCovers') : t('confirmFinalize')}
            {!isSaving && <FaChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </footer>
    </div>
  );

};

export default PhotoThemeCategoryPage;

