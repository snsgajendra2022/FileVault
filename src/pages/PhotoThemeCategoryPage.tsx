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
} from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import imageService from '../services/imageService';
import { getStoredToken } from '../utils/authUtils';
import { FileVaultImagePicker } from '../components/PhotoBook/FileVaultImagePicker';

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
    logoDataUrl?: string;
    logoImageId?: number;
    logoPosition?: 'top-left' | 'top-right' | 'top-center' | 'bottom-center';
    logoPositionX?: number;
    logoPositionY?: number;
    logoSize?: number;
    /** First flip side: text on glass / gradient (not stored on server — see localStorage). */
    textLeafBgMode?: 'gradient' | 'image';
    textLeafBgGradient?: string;
    textLeafBgImageUrl?: string;
    textLeafBgImageId?: number;
    textPanelBlurPx?: number;
    /** 0–100 glass fill opacity (over blur) */
    textPanelGlassOpacity?: number;
    textPanelGlassColor?: string;
    /** Free-position labels on the text-side preview (not sent to cover API). */
    textSideOverlays?: TextSideOverlay[];
  };
};

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

const PageEditorCard: React.FC<{
  kind: PageKind;
  state: EditablePageState;
  onChange: (next: EditablePageState) => void;
  filterImageIds?: number[];
}> = ({ kind, state, onChange, filterImageIds }) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemeCategoryPage' });
  const isCover = kind === 'cover';
  const title = isCover ? t('frontCover') : t('backCover');
  const hint = isCover ? t('hintFrontCover') : t('hintBackCover');
  const [showAlbumPicker, setShowAlbumPicker] = React.useState(false);
  const [showLogoPicker, setShowLogoPicker] = React.useState(false);
  const [showTextLeafBgPicker, setShowTextLeafBgPicker] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'text' | 'photo'>('text');
  type Section = 'text' | 'textLeaf' | 'effects' | 'extras';
  const [openSection, setOpenSection] = React.useState<Section | null>(null);
  const toggle = (s: Section) => setOpenSection((v) => (v === s ? null : s));

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

  React.useEffect(() => {
    if (!logoDrag) return;
    const onMove = (e: MouseEvent) => {
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
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [logoDrag]);

  React.useEffect(() => {
    if (!overlayDrag) return;
    const onMove = (e: MouseEvent) => {
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
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
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
    });
    onChange({ ...state, style: { ...state.style, textSideOverlays: list } });
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

  return (
    <>
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_0_0_1px_rgba(148,163,184,0.06),0_20px_50px_-12px_rgba(15,23,42,0.12),0_0_80px_-20px_rgba(99,102,241,0.15)] backdrop-blur-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 shadow-[0_0_20px_-2px_rgba(99,102,241,0.4)] ${
          isCover
            ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500'
            : 'bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-500'
        }`}
      />
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-indigo-400/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-2 border border-white/60 shadow-sm ${
            isCover
              ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-violet-500/15'
              : 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-fuchsia-500/15'
          }`}>
            <span
              className={`w-2 h-2 rounded-full shadow-sm ${
                isCover ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-rose-400 shadow-rose-400/50'
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
              {isCover ? t('frontCoverBadge') : t('backCoverBadge')}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">{hint}</p>
        </div>
      </div>

      {/* Preview + forms: keep stacked to avoid narrow text columns (prevents 1-char-per-line wrapping). */}
      <div className="mt-5 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="inline-flex rounded-full border border-slate-200/90 bg-white/95 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setPreviewTab('text')}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                previewTab === 'text'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t('previewTextSide')}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('photo')}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                previewTab === 'photo'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t('previewPhotoSide')}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center max-w-sm leading-relaxed">{t('previewTabHint')}</p>

          <div
            ref={previewRef}
            className={`relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ring-2 ring-slate-200/80 ring-offset-2 ring-offset-slate-50 shadow-[0_8px_30px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 ${state.style?.subtleAnimation ? 'cover-fade-in' : ''} ${state.style?.darkModeCover ? 'brightness-90' : ''}`}
            style={state.style?.vignette && previewTab === 'photo' ? { boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35), 0 8px 30px rgba(15,23,42,0.12)' } : undefined}
          >
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
                    className={`w-full max-w-[95%] mx-auto rounded-2xl border border-white/25 px-4 py-4 shadow-lg ${
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
                      className="line-clamp-3"
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
                        className="mt-2 text-[11px] leading-relaxed text-slate-700/90 line-clamp-4 whitespace-pre-wrap"
                        style={{ fontFamily: state.style?.fontFamily }}
                      >
                        {state.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                {state.style?.logoDataUrl && (
                  <div
                    className="absolute z-10 select-none"
                    style={{
                      left: `${logoX}%`,
                      top: `${logoY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: state.style?.logoSize ?? 60,
                      height: state.style?.logoSize ?? 60,
                      cursor: logoDrag ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setLogoDrag({
                        startX: e.clientX,
                        startY: e.clientY,
                        startPX: logoX,
                        startPY: logoY,
                      });
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
                    className="absolute z-20 flex max-w-[min(85%,220px)] flex-col items-stretch gap-0.5"
                    style={{
                      left: `${o.x}%`,
                      top: `${o.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`flex h-6 shrink-0 items-center justify-center rounded-md border border-white/40 bg-black/30 text-white/90 shadow backdrop-blur-sm ${
                          overlayDrag?.id === o.id ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                        aria-label={t('dragFloatingHint')}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setOverlayDrag({
                            id: o.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            startPX: o.x,
                            startPY: o.y,
                          });
                        }}
                      >
                        <FaGripVertical className="h-3 w-3" aria-hidden />
                      </button>
                      <input
                        type="text"
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
                        onMouseDown={(e) => e.stopPropagation()}
                        className="min-w-0 flex-1 rounded-lg border border-white/35 bg-black/30 px-2 py-1 text-left text-[11px] text-white shadow-md backdrop-blur-sm placeholder:text-white/45 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/40"
                        style={{
                          fontSize: o.fontSize ?? 13,
                          color: o.color ?? '#f8fafc',
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
                    className="absolute z-10 select-none"
                    style={{
                      left: `${logoX}%`,
                      top: `${logoY}%`,
                      transform: 'translate(-50%, -50%)',
                      width: state.style?.logoSize ?? 60,
                      height: state.style?.logoSize ?? 60,
                      cursor: logoDrag ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setLogoDrag({
                        startX: e.clientX,
                        startY: e.clientY,
                        startPX: logoX,
                        startPY: logoY,
                      });
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

        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('headline')}
              </label>
              <EmojiInsertRow
                emojis={isCover ? TEXT_EMOJI_COVER.headline : TEXT_EMOJI_BACK.headline}
                ariaLabel={t('emojiQuickInsertHeadline')}
                accent={isCover ? 'cyan' : 'rose'}
                onPick={(emoji) => onChange({ ...state, headline: appendEmojiToField(state.headline, emoji) })}
              />
              <input
                className={`mt-2 w-full rounded-xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:ring-2 bg-white/80 shadow-sm transition-all ${
                  isCover ? 'focus:border-cyan-500 focus:ring-cyan-500/20' : 'focus:border-rose-500 focus:ring-rose-500/20'
                }`}
                placeholder={isCover ? t('placeholderHeadlineCover') : t('placeholderHeadlineBack')}
                value={state.headline}
                onChange={(e) => onChange({ ...state, headline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('subheadline')}
              </label>
              <EmojiInsertRow
                emojis={isCover ? TEXT_EMOJI_COVER.sub : TEXT_EMOJI_BACK.sub}
                ariaLabel={t('emojiQuickInsertSub')}
                accent={isCover ? 'cyan' : 'rose'}
                onPick={(emoji) => onChange({ ...state, subheadline: appendEmojiToField(state.subheadline, emoji) })}
              />
              <input
                className={`mt-2 w-full rounded-xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:ring-2 bg-white/80 shadow-sm transition-all ${
                  isCover ? 'focus:border-cyan-500 focus:ring-cyan-500/20' : 'focus:border-rose-500 focus:ring-rose-500/20'
                }`}
                placeholder={isCover ? t('placeholderSubCover') : t('placeholderSubBack')}
                value={state.subheadline}
                onChange={(e) => onChange({ ...state, subheadline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
                className={`mt-2 w-full rounded-xl border border-slate-200/80 px-3.5 py-2 text-sm outline-none focus:ring-2 resize-none bg-white/80 shadow-sm transition-all ${
                  isCover ? 'focus:border-cyan-500 focus:ring-cyan-500/20' : 'focus:border-rose-500 focus:ring-rose-500/20'
                }`}
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

          {/* Settings: same accordion for both front and back cover */}
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden backdrop-blur-sm">
            <>
                <button
                  type="button"
                  onClick={() => toggle('text')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-indigo-50/50 transition-all"
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
                  <div className="mt-3 space-y-2">
                    {(state.style?.textSideOverlays ?? []).map((o) => (
                      <div key={o.id} className="rounded-xl border border-slate-200/70 bg-white/90 p-2">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_auto] gap-2 items-center">
                          <input
                            value={o.text}
                            onChange={(e) => {
                              const list = state.style?.textSideOverlays ?? [];
                              onChange({
                                ...state,
                                style: {
                                  ...state.style,
                                  textSideOverlays: list.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)),
                                },
                              });
                            }}
                            className="w-full rounded-xl border border-slate-200/80 px-3 py-2 text-[12px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            placeholder={t('floatingTextPlaceholder')}
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{t('floatingTextSize')}</label>
                            <input
                              type="number"
                              min={8}
                              max={40}
                              value={o.fontSize ?? 13}
                              onChange={(e) => {
                                const list = state.style?.textSideOverlays ?? [];
                                const val = Number(e.target.value);
                                onChange({
                                  ...state,
                                  style: {
                                    ...state.style,
                                    textSideOverlays: list.map((x) => (x.id === o.id ? { ...x, fontSize: val } : x)),
                                  },
                                });
                              }}
                              className="w-full rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-[11px] bg-white shadow-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{t('floatingTextColor')}</label>
                            <input
                              type="color"
                              value={o.color ?? '#f8fafc'}
                              onChange={(e) => {
                                const list = state.style?.textSideOverlays ?? [];
                                onChange({
                                  ...state,
                                  style: {
                                    ...state.style,
                                    textSideOverlays: list.map((x) => (x.id === o.id ? { ...x, color: e.target.value } : x)),
                                  },
                                });
                              }}
                              className="h-8 w-full rounded-xl border border-slate-200 p-0 bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const list = state.style?.textSideOverlays ?? [];
                              onChange({
                                ...state,
                                style: { ...state.style, textSideOverlays: list.filter((x) => x.id !== o.id) },
                              });
                            }}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
                          >
                            {t('remove')}
                          </button>
                        </div>
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
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-indigo-50/50 transition-all"
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
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-indigo-50/50 transition-all"
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
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-100 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:to-indigo-50/50 transition-all"
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
    </div>

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

  // Load saved covers from API when editing an existing album (not when "Create new" with no photobookId).
  React.useEffect(() => {
    let cancelled = false;
    const loadId = photobookId;

    if (!user?.id || !loadId) {
      setIsLoadingCovers(false);
      return;
    }

    const loadSavedCovers = async () => {
      setIsLoadingCovers(true);
      try {
        const token = getStoredToken();
        const headers = { ...(token ? { 'X-API-KEY': token } : {}) };
        let payload: { frontCover?: ApiCoverSide; backCover?: ApiCoverSide } | null = null;

        const res = await api.get(`/api/photobooks/${loadId}/covers`, { headers }).catch(() => null);
        if (res?.data && (res.data.frontCover || res.data.backCover)) {
          payload = { frontCover: res.data.frontCover, backCover: res.data.backCover };
        }
        if (
          payload &&
          isApiCoverSideEmpty(payload.frontCover) &&
          isApiCoverSideEmpty(payload.backCover)
        ) {
          payload = null;
        }
        if (!payload && user?.id && activeTemplateId) {
          try {
            const r2 = await api.get<ApiCoverRecord[]>('/api/covers', {
              params: { userId: user.id, templateId: String(activeTemplateId) },
              headers,
            });
            const rec = r2.data?.[0];
            if (
              rec &&
              (!isApiCoverSideEmpty(rec.frontCover) || !isApiCoverSideEmpty(rec.backCover))
            ) {
              payload = { frontCover: rec.frontCover, backCover: rec.backCover };
            }
          } catch {
            /* ignore */
          }
        }

        if (cancelled || photobookIdRef.current !== loadId) return;

        const extras = loadCoverLeafExtras(loadId);

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
        if (photobookIdRef.current === loadId) setIsLoadingCovers(false);
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
    const overlayColor = style?.overlayColor ?? '#000000';
    const gradient =
      style?.overlayGradientDirection === 'radial'
        ? `radial-gradient(circle, ${overlayColor}${Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`
        : style?.overlayGradientDirection === 'bottom-top'
          ? `linear-gradient(to top, ${overlayColor}${Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0')}, transparent 40%)`
          : `linear-gradient(to bottom, ${overlayColor}${Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0')}, transparent 40%)`;
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

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {meta.title}
            </h1>
            <p className="text-sm md:text-base text-blue-100">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      {/* ── My Albums section ────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <FaImages className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{t('myAlbums')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('albumsCount', { count: myAlbums.length })} · <span className="capitalize">{categorySlug}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateNewAlbum}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            {t('newAlbum')}
          </button>
        </div>

        <div className="p-4">
          {isLoadingAlbums ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('loadingAlbums')}
            </div>
          ) : myAlbums.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-400 mb-3">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">{t('startFirstAlbum')}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{t('startFirstAlbumHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myAlbums.map((album) => {
                const isActive = photobookId === album.id;
                const isDeleting = isDeletingAlbum === album.id;
                const dateStr = album.updatedAt
                  ? new Date(album.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : '';
                const progressPct = album.pageCount > 0 ? Math.round((album.savedPagesCount / album.pageCount) * 100) : 0;
                return (
                  <div
                    key={album.id}
                    className={`group relative rounded-xl border p-4 transition-all ${
                      isActive
                        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/80 to-white ring-2 ring-indigo-200 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider bg-indigo-600 text-white rounded-full px-2.5 py-0.5 shadow-sm">
                        {t('active')}
                      </span>
                    )}
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {album.title || t('untitledAlbum')}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                          album.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          album.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {album.status?.replace('_', ' ') || t('draft')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {t('pagesLabel', { count: album.pageCount })}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">{progressPct}%</span>
                      </div>
                      {dateStr && (
                        <p className="text-[10px] text-slate-400 mt-1.5">{t('lastEdited', { date: dateStr })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleContinueAlbum(album)}
                        className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 hover:from-indigo-600 hover:to-indigo-700 transition-all"
                      >
                        {album.hasCovers ? t('continue') : t('editCovers')}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/photo-themes/${categorySlug}/album`, {
                          state: { dbTemplateId: album.templateId, photobookId: album.id },
                        })}
                        disabled={!album.hasCovers}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {t('open')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlbum(album.id)}
                        disabled={isDeleting}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition-all opacity-0 group-hover:opacity-100"
                        title={t('deleteAlbumTitle')}
                      >
                        {isDeleting ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Loading indicator */}
      {isLoadingCovers && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('loadingSavedCovers')}</span>
        </div>
      )}

      {/* Editors for first & last page */}
      <div className="space-y-6">
        {activeTemplateId && (
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-medium text-indigo-700">
                {photobookId ? t('editingAlbum', { id: photobookId }) : t('creatingNewAlbum')}
              </span>
              {isLoadingSelectedTheme && (
                <span className="ml-2 text-[10px] text-indigo-500">{t('loading')}</span>
              )}
            </div>
          </div>
        )}
        <PageEditorCard kind="cover" state={coverPage} onChange={setCoverPage} filterImageIds={studioAlbumImageIds} />
        <PageEditorCard kind="last" state={lastPage} onChange={setLastPage} filterImageIds={studioAlbumImageIds} />
      </div>

      {/* Save success message - Visible above button */}
      {saveSuccess && (
        <div className="rounded-xl border-2 border-green-400 bg-green-100 px-6 py-4 text-base font-semibold text-green-900 flex items-center gap-3 shadow-lg">
          <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>✅ {t('coversSavedRedirect')}</span>
        </div>
      )}

      {/* Save error message */}
      {saveError && (
        <div className="rounded-xl border-2 border-yellow-400 bg-yellow-100 px-6 py-4 text-base font-semibold text-yellow-900">
          ⚠️ {saveError}
        </div>
      )}

      {/* Next step: go to multi-page album builder */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveCovers}
          disabled={isSaving}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {t('savingCovers')}
            </>
          ) : (
            photobookId ? t('saveContinueAlbum') : t('saveCreateAlbum')
          )}
        </button>
      </div>
      {/* "Your saved themes" section removed as per request */}
    </div>
  );
};

export default PhotoThemeCategoryPage;

