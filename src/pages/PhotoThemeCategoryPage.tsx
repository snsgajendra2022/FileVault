import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
} from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import imageService from '../services/imageService';
import { getStoredToken } from '../utils/authUtils';

type PageKind = 'cover' | 'last';

export type EditablePageState = {
  headline: string;
  subheadline: string;
  description: string;
  imageDataUrl?: string;
  style?: {
    fontSize?: number;
    fontWeight?: number;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    fontFamily?: string;
    headlineColor?: string;
    subheadlineColor?: string;
    imageScale?: number;
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
  id: number;
  userId: number;
  templateId: number;
  coverType: 'FRONT_COVER' | 'BACK_COVER';
  headline: string;
  subheadline: string;
  description: string;
  fontSize: number;
  fontWeight: string | number;
  align: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom';
  fontFamily: string;
  headlineColor: string;
  subheadlineColor: string;
  imageId: number | null;
  imageUrl: string | null;
  imageZoom: number;
};

type ApiCoverRecord = {
  userId: number;
  templateId: number;
  frontCover: ApiCoverSide;
  backCover: ApiCoverSide;
};

const THEME_META: ThemeMeta[] = [
  {
    id: 'birthday',
    title: 'Birthday Themes',
    subtitle: 'Celebrate special moments with vibrant birthday designs.',
    icon: FaStar,
    color: 'from-pink-500 via-rose-500 to-pink-600',
  },
  {
    id: 'anniversary',
    title: 'Anniversary Themes',
    subtitle: 'Romantic designs for celebrating love and milestones.',
    icon: FaHeart,
    color: 'from-red-500 via-pink-500 to-red-600',
  },
  {
    id: 'wedding',
    title: 'Wedding Themes',
    subtitle: 'Elegant and timeless designs for your special day.',
    icon: FaStar,
    color: 'from-purple-500 via-indigo-500 to-purple-600',
  },
  {
    id: 'baby-kids',
    title: 'Baby & Kids Themes',
    subtitle: 'Adorable themes for little ones and growing families.',
    icon: FaUsers,
    color: 'from-blue-500 via-cyan-500 to-blue-600',
  },
  {
    id: 'travel',
    title: 'Travel Memories',
    subtitle: 'Capture your adventures with stunning travel layouts.',
    icon: FaCloud,
    color: 'from-teal-500 via-emerald-500 to-teal-600',
  },
  {
    id: 'family',
    title: 'Family Album',
    subtitle: 'Cherish family moments with warm, classic designs.',
    icon: FaImages,
    color: 'from-amber-500 via-orange-500 to-amber-600',
  },
  {
    id: 'festival',
    title: 'Festival & Events',
    subtitle: 'Vibrant themes for celebrations and special occasions.',
    icon: FaCalendarAlt,
    color: 'from-violet-500 via-purple-500 to-violet-600',
  },
  {
    id: 'corporate',
    title: 'Corporate / Office',
    subtitle: 'Professional layouts for business and corporate events.',
    icon: FaBriefcase,
    color: 'from-slate-500 via-gray-500 to-slate-600',
  },
  {
    id: 'minimal',
    title: 'Minimal / Classic',
    subtitle: 'Clean, elegant designs with timeless appeal.',
    icon: FaFolderOpen,
    color: 'from-gray-400 via-gray-500 to-gray-600',
  },
  {
    id: 'custom',
    title: 'Custom Themes',
    subtitle: 'Create your own unique theme or request a custom design.',
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
  },
];

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
}> = ({ kind, state, onChange }) => {
  const isCover = kind === 'cover';
  const title = isCover ? 'Front Cover' : 'Back Cover';
  const hint = isCover
    ? 'Design the first page of your album.'
    : 'Design the closing page of your album.';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] border border-slate-100 relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          isCover
            ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-violet-500'
            : 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500'
        }`}
      />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-3 py-1 mb-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCover ? 'bg-indigo-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {isCover ? 'Cover page (first)' : 'Last page (back)'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6 items-start">
        <div className="relative w-full aspect-[3/4] rounded-2xl border border-slate-200/80 overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
          {state.imageDataUrl ? (
            <img
              src={state.imageDataUrl}
              alt={`${title} preview`}
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${state.style?.imageScale ?? 1})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400">Preview</span>
              </div>
              <span className="text-[11px] leading-snug text-slate-400">
                Upload a photo and type your headline to see a live preview of this page.
              </span>
            </div>
          )}
          {/* Text overlay with adjustable font & position */}
          {(state.headline || state.subheadline) && (
            <div
              className={`absolute inset-0 flex px-4 py-4 bg-gradient-to-t from-black/75 via-black/15 to-transparent ${
                state.style?.verticalAlign === 'top'
                  ? 'items-start justify-start'
                  : state.style?.verticalAlign === 'center'
                  ? 'items-center justify-center'
                  : 'items-end justify-end'
              } transition-all duration-200`}
            >
              <div
                className={`w-full max-w-full ${
                  state.style?.align === 'center'
                    ? 'text-center'
                    : state.style?.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {state.headline && (
                  <div
                    className="truncate drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
                    style={{
                      fontSize: state.style?.fontSize ?? 20,
                      fontWeight: state.style?.fontWeight ?? 700,
                      color: state.style?.headlineColor ?? '#ffffff',
                      fontFamily: state.style?.fontFamily,
                    }}
                  >
                    {state.headline}
                  </div>
                )}
                {state.subheadline && (
                  <div
                    className="truncate mt-1 drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)]"
                    style={{
                      fontSize: (state.style?.fontSize ?? 20) - 4,
                      fontWeight: (state.style?.fontWeight ?? 700) - 200 || 400,
                      color: state.style?.subheadlineColor ?? '#e5e7eb',
                      fontFamily: state.style?.fontFamily,
                    }}
                  >
                    {state.subheadline}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Headline
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 bg-slate-50/40"
                placeholder={
                  isCover ? 'e.g. Our Wedding Day' : 'e.g. Thank you for being here'
                }
                value={state.headline}
                onChange={(e) => onChange({ ...state, headline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Subheadline
              </label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 bg-slate-50/40"
                placeholder={
                  isCover
                    ? 'e.g. 5th June 2026 • Mumbai'
                    : 'e.g. Grateful for every moment captured here.'
                }
                value={state.subheadline}
                onChange={(e) => onChange({ ...state, subheadline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Description (optional)
              </label>
              <textarea
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 resize-none bg-slate-50/40"
                placeholder="Add a short story or note about this album."
                value={state.description}
                onChange={(e) => onChange({ ...state, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Page image
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-[11px] text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white hover:file:bg-slate-800"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await fileToDataUrl(file);
                    onChange({ ...state, imageDataUrl: dataUrl });
                  }}
                />
              </div>
            </div>

            <div className="hidden md:flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-slate-500">
                  Live preview updates automatically as you type.
                </span>
              </div>
            </div>
          </div>

          {/* Text style controls */}
          <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-600">Text & layout</p>
              <span className="text-[10px] text-slate-400">
                Fine‑tune how your cover looks
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Font size
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
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Weight
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
                  value={state.style?.fontWeight ?? 700}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: { ...state.style, fontWeight: Number(e.target.value) },
                    })
                  }
                >
                  <option value={400}>Regular</option>
                  <option value={600}>Semi‑bold</option>
                  <option value={700}>Bold</option>
                  <option value={800}>Extra bold</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Align
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
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
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vertical position
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
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
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Font family
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
                  value={state.style?.fontFamily ?? 'system'}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      style: {
                        ...state.style,
                        fontFamily:
                          e.target.value === 'system'
                            ? undefined
                            : e.target.value === 'serif'
                            ? 'Georgia, Cambria, "Times New Roman", serif'
                            : e.target.value === 'mono'
                            ? '"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                            : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      },
                    })
                  }
                >
                  <option value="system">System</option>
                  <option value="sans">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Headline color
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
                  Subheadline color
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
                  Image zoom
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
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhotoThemeCategoryPage: React.FC = () => {
  const { categorySlug = '' } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { templateId?: number } };
  const { user } = useAuth();

  const meta = THEME_META.find((m) => m.id === categorySlug) ?? {
    id: categorySlug || 'unknown',
    title: 'Custom Theme',
    subtitle: 'Design a custom cover and last page for your photo album.',
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
  };

  const Icon = meta.icon;
  const initialTemplateId = location.state?.templateId;

  const [coverPage, setCoverPage] = React.useState<EditablePageState>({
    ...defaultPageState,
    headline: meta.title,
    subheadline: meta.subtitle,
  });

  const [lastPage, setLastPage] = React.useState<EditablePageState>({
    ...defaultPageState,
    headline: 'Thank you',
    subheadline: 'Grateful for every moment captured here.',
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isLoadingCovers, setIsLoadingCovers] = React.useState(false);
  const [userCoverThemes, setUserCoverThemes] = React.useState<ApiCoverRecord[]>([]);
  const [isLoadingUserThemes, setIsLoadingUserThemes] = React.useState(false);
  const [userThemesError, setUserThemesError] = React.useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = React.useState<number | null>(
    initialTemplateId ?? null
  );
  const [isLoadingSelectedTheme, setIsLoadingSelectedTheme] = React.useState(false);

  const mapApiSideToEditableState = React.useCallback(
    async (side: ApiCoverSide | undefined | null, kind: PageKind): Promise<EditablePageState> => {
      if (!side) {
        return {
          ...defaultPageState,
          headline: kind === 'cover' ? meta.title : 'Thank you',
          subheadline:
            kind === 'cover'
              ? meta.subtitle
              : 'Grateful for every moment captured here.',
        };
      }

      const mapped: EditablePageState = {
        headline:
          side.headline ||
          (kind === 'cover' ? meta.title : 'Thank you'),
        subheadline:
          side.subheadline ||
          (kind === 'cover'
            ? meta.subtitle
            : 'Grateful for every moment captured here.'),
        description: side.description || '',
        style: {
          fontSize: side.fontSize || 20,
          fontWeight: side.fontWeight ? Number(side.fontWeight) : 700,
          align: (side.align as 'left' | 'center' | 'right') || 'center',
          verticalAlign:
            (side.position as 'top' | 'center' | 'bottom') ||
            (kind === 'cover' ? 'center' : 'bottom'),
          fontFamily: side.fontFamily || undefined,
          headlineColor: side.headlineColor || '#ffffff',
          subheadlineColor: side.subheadlineColor || '#e5e7eb',
          imageScale: side.imageZoom || 1,
        },
      };

      // Prefer direct imageUrl if provided, fallback to imageId lookup
      if (side.imageUrl) {
        mapped.imageDataUrl = side.imageUrl;
      } else if (side.imageId) {
        try {
          const imageDetails = await imageService.getImageDetails(String(side.imageId));
          if (imageDetails.downloadUrl || imageDetails.thumbnailUrl) {
            mapped.imageDataUrl = imageDetails.downloadUrl || imageDetails.thumbnailUrl;
          }
        } catch (imgError) {
          console.warn('Failed to load cover image:', imgError);
        }
      }

      return mapped;
    },
    [meta.title, meta.subtitle]
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
          params: { userId: user.id },
          headers: {
            ...(token ? { 'X-API-KEY': token } : {}),
          },
        });

        setUserCoverThemes(response.data || []);
      } catch (error: any) {
        console.error('Failed to load user themes /api/covers:', error);
        setUserThemesError('Unable to load your saved themes.');
      } finally {
        setIsLoadingUserThemes(false);
      }
    };

    loadUserThemes();
  }, [user?.id]);

  // Load saved covers from API when page loads
  React.useEffect(() => {
    const loadSavedCovers = async () => {
      if (!user?.id || !initialTemplateId) {
        console.log('Skipping load - missing userId or templateId', {
          userId: user?.id,
          templateId: initialTemplateId,
        });
        return;
      }

      setIsLoadingCovers(true);
      try {
        console.log('Loading saved covers...', { userId: user.id, templateId: initialTemplateId });

        const response = await api.get(
          `/api/users/${user.id}/photobook-templates/${initialTemplateId}/covers`,
          {
            headers: {
              // Use same dynamic token as other APIs
              'X-API-KEY': getStoredToken(),
            },
          }
        ).catch((error: any) => {
          // If 404, no saved covers exist yet - this is fine
          if (error.response?.status === 404) {
            console.log('No saved covers found (404) - using defaults');
            return null;
          }
          throw error;
        });

        if (response?.data) {
          console.log('✅ Loaded saved covers:', response.data);

          const { frontCover, backCover } = response.data;

          // Map API response to EditablePageState format
          if (frontCover) {
            const mappedCover = await mapApiSideToEditableState(frontCover, 'cover');
            setCoverPage(mappedCover);
          }

          if (backCover) {
            const mappedBack = await mapApiSideToEditableState(backCover, 'last');
            setLastPage(mappedBack);
          }
        }
      } catch (error: any) {
        console.error('Failed to load saved covers:', error);
        // Don't show error to user - just use defaults
      } finally {
        setIsLoadingCovers(false);
      }
    };

    loadSavedCovers();
  }, [user?.id, initialTemplateId, mapApiSideToEditableState]);

  const handleEditTheme = async (templateId: number) => {
    if (!user?.id) return;

    setIsLoadingSelectedTheme(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = getStoredToken();
      const response = await api.get<ApiCoverRecord[]>('/api/covers', {
        params: { userId: user.id, templateId },
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
      setSaveError('Unable to load theme for editing.');
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

  // Helper function to map EditablePageState to API format
  const mapPageStateToApiFormat = (pageState: EditablePageState) => {
    return {
      headline: pageState.headline || '',
      subheadline: pageState.subheadline || '',
      description: pageState.description || '',
      fontSize: pageState.style?.fontSize || 20,
      fontWeight: String(pageState.style?.fontWeight || 700),
      align: pageState.style?.align || 'center',
      position: pageState.style?.verticalAlign || 'center',
      fontFamily: pageState.style?.fontFamily || '',
      headlineColor: pageState.style?.headlineColor || '#ffffff',
      subheadlineColor: pageState.style?.subheadlineColor || '#e5e7eb',
      imageId: 0, // Will be set after image upload
      imageZoom: pageState.style?.imageScale || 1,
    };
  };

  // Save covers to backend API
  const handleSaveCovers = async () => {
    console.log('handleSaveCovers called', { templateId: activeTemplateId });

    if (!activeTemplateId) {
      console.warn('Missing templateId, skipping API save', { templateId: activeTemplateId });
      setSaveError('Template ID missing. Please refresh and try again.');
      // Still navigate even if API save fails
      setTimeout(() => {
        navigate(`/photo-themes/${meta.id}/album`, {
          state: { coverPage, lastPage },
        });
      }, 2000);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      console.log('Starting save process...');
      // Upload images if they exist
      let frontCoverImageId = 0;
      let backCoverImageId = 0;

      if (coverPage.imageDataUrl) {
        try {
          const file = dataUrlToFile(coverPage.imageDataUrl, 'cover-image.jpg');
          const uploadResponse = await imageService.uploadImage(file);
          if (uploadResponse.cloudUploads?.s3?.id) {
            frontCoverImageId = uploadResponse.cloudUploads.s3.id;
          } else if (uploadResponse.image?.id) {
            frontCoverImageId = Number(uploadResponse.image.id);
          }
        } catch (err) {
          console.warn('Failed to upload cover image:', err);
        }
      }

      if (lastPage.imageDataUrl) {
        try {
          const file = dataUrlToFile(lastPage.imageDataUrl, 'back-cover-image.jpg');
          const uploadResponse = await imageService.uploadImage(file);
          if (uploadResponse.cloudUploads?.s3?.id) {
            backCoverImageId = uploadResponse.cloudUploads.s3.id;
          } else if (uploadResponse.image?.id) {
            backCoverImageId = Number(uploadResponse.image.id);
          }
        } catch (err) {
          console.warn('Failed to upload back cover image:', err);
        }
      }

      // Map page states to API format
      const frontCover = mapPageStateToApiFormat(coverPage);
      frontCover.imageId = frontCoverImageId;

      const backCover = mapPageStateToApiFormat(lastPage);
      backCover.imageId = backCoverImageId;

      // Call API to save covers - New endpoint: POST /api/covers
      const token = getStoredToken();
      const requestBody = {
        templateId: Number(activeTemplateId),
        frontCover,
        backCover,
      };

      // Log BEFORE making the API call
      console.log('🚀 ===== API CALL STARTING =====');
      console.log('📤 Request URL:', `${process.env.REACT_APP_API_URL || ''}/api/covers`);
      console.log('📤 Request Method:', 'POST');
      console.log('📤 Request Headers:', {
        'Content-Type': 'application/json',
        'Authorization': token || 'MISSING TOKEN',
      });
      console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('📤 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

      // Make the API call
      const response = await api.post(
        '/api/covers',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            // Match your curl: Authorization: <token> (without Bearer prefix)
            // Set Authorization explicitly to override interceptor's Bearer prefix
            ...(token ? { Authorization: token } : {}),
          },
        }
      ).catch((apiError: any) => {
        // Log error details
        console.error('❌ API CALL FAILED:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          message: apiError.message,
          config: {
            url: apiError.config?.url,
            method: apiError.config?.method,
            headers: apiError.config?.headers,
          },
        });

        // If API endpoint doesn't exist (404), handle gracefully
        if (apiError.response?.status === 404) {
          console.warn('⚠️ API endpoint not found (404). This is okay - continuing without backend save.');
          // Return a mock success response so flow continues
          return { data: { success: true, message: 'Local save only (API endpoint not available)' } };
        }
        // Re-throw other errors
        throw apiError;
      });

      const responseData = response?.data || response;
      // Log AFTER getting response
      console.log('✅ ===== API CALL SUCCESSFUL =====');
      console.log('📥 Response Status:', responseData?.status);
      console.log('📥 Response Headers:', responseData?.headers);
      console.log('📥 Response Data:', JSON.stringify(responseData.data, null, 2));
      console.log('✅ ===== API CALL COMPLETE =====');

      // Show success message immediately after API call succeeds (or graceful 404 handling)
      setSaveSuccess(true);
      setIsSaving(false);

      console.log('✅ Covers processed successfully! Showing success message...');

      // Save a detailed preview marker in localStorage so it can show under themes list
      try {
        const preview = {
          templateId: Number(activeTemplateId),
          categorySlug: meta.id,
          themeTitle: meta.title,
          themeSubtitle: meta.subtitle,
          cover: {
            headline: coverPage.headline,
            subheadline: coverPage.subheadline,
            description: coverPage.description,
            hasImage: !!coverPage.imageDataUrl || !!frontCoverImageId,
          },
          back: {
            headline: lastPage.headline,
            subheadline: lastPage.subheadline,
            description: lastPage.description,
            hasImage: !!lastPage.imageDataUrl || !!backCoverImageId,
          },
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('lastPhotobookThemePreview', JSON.stringify(preview));
        console.log('💾 Saved lastPhotobookThemePreview to localStorage', preview);
      } catch (storageError) {
        console.warn('Failed to save theme preview to localStorage:', storageError);
      }

      // Navigate to album builder after showing success message (2 seconds delay to see message)
      setTimeout(() => {
        console.log('Navigating to album builder...');
        navigate(`/photo-themes/${meta.id}/album`, {
          state: { coverPage, lastPage },
        });
      }, 2000);
    } catch (error: any) {
      console.error('❌ Failed to save covers:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

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
          state: { coverPage, lastPage },
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

      {/* Loading indicator */}
      {isLoadingCovers && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading saved covers...</span>
        </div>
      )}

      {/* Editors for first & last page */}
      <div className="space-y-6">
        {activeTemplateId && (
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-medium text-indigo-700">
                Editing theme for template #{activeTemplateId}
              </span>
              {isLoadingSelectedTheme && (
                <span className="ml-2 text-[10px] text-indigo-500">Loading...</span>
              )}
            </div>
          </div>
        )}
        <PageEditorCard kind="cover" state={coverPage} onChange={setCoverPage} />
        <PageEditorCard kind="last" state={lastPage} onChange={setLastPage} />
      </div>

      {/* Save success message - Visible above button */}
      {saveSuccess && (
        <div className="rounded-xl border-2 border-green-400 bg-green-100 px-6 py-4 text-base font-semibold text-green-900 flex items-center gap-3 shadow-lg">
          <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>✅ Covers saved successfully! Redirecting to album builder...</span>
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
              Saving covers...
            </>
          ) : (
            'Next: Build album'
          )}
        </button>
      </div>

      {/* Your saved themes – redesigned section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white shadow-lg shadow-slate-200/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />
        <div className="relative px-6 py-6 md:px-8 md:py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                <FaFolderOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Your saved themes
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Pick a theme to edit or continue building your album
                </p>
              </div>
            </div>
            {isLoadingUserThemes && (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading themes…
              </span>
            )}
          </div>

          {userThemesError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                !
              </span>
              {userThemesError}
            </div>
          )}

          {userCoverThemes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {userCoverThemes.map((theme) => (
                <button
                  type="button"
                  key={theme.templateId}
                  onClick={() => handleEditTheme(theme.templateId)}
                  className="group text-left rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-300/80 hover:ring-2 hover:ring-indigo-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">
                      Template #{theme.templateId}
                    </span>
                    <span className="text-slate-400 group-hover:text-indigo-500 transition-colors text-xs font-medium">
                      Open →
                    </span>
                  </div>
                  {/* Mini book spread: front + back */}
                  <div className="grid grid-cols-2 gap-px bg-slate-100 min-h-[120px]">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 flex flex-col justify-end">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Front</p>
                      <p className="font-semibold text-sm line-clamp-2 text-white">
                        {theme.frontCover?.headline || 'Untitled'}
                      </p>
                      <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                        {theme.frontCover?.subheadline || '—'}
                      </p>
                    </div>
                    <div className="bg-slate-100 text-slate-800 p-4 flex flex-col justify-end border-l border-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Back</p>
                      <p className="font-semibold text-sm line-clamp-2 text-slate-900">
                        {theme.backCover?.headline || '—'}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {theme.backCover?.subheadline || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-500 group-hover:bg-indigo-50/50 group-hover:text-indigo-700 transition-colors">
                    Click to edit or continue building
                  </div>
                </button>
              ))}
            </div>
          ) : !isLoadingUserThemes ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-8 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <FaFolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No saved themes yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Create your cover and last page above, then click &quot;Next: Build album&quot;. Your theme will be saved and show up here.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default PhotoThemeCategoryPage;

