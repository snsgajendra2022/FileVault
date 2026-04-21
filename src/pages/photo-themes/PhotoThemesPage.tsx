import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client/axiosInstance';
import axios from 'axios';
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
  FaSpinner,
} from 'react-icons/fa';
import { getStoredToken, getStoredUserData } from '../../utils/authUtils';
import { User } from '../../types/user';

interface ThemeCategory {
  id: string; // used as categorySlug
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  templateId?: number; // Backend template ID from API
}

// Local default metadata for mapping API templates -> UI cards.
// Codes come from /api/photobook-templates (e.g. ANNIVERSARY_THEMES).
// Icons / colors / gradients chosen with reasonable defaults.
const templateMetaByCode: Record<
  string,
  {
    id: string; // categorySlug used in routes
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    gradient: string;
  }
> = {
  BIRTHDAY_THEMES: {
    id: 'birthday',
    // Celebratory star icon + warm pink gradient
    icon: FaStar,
    color: 'from-pink-500 via-rose-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-pink-50 to-rose-50',
  },
  ANNIVERSARY_THEMES: {
    id: 'anniversary',
    // Heart icon + romantic red/pink gradient
    icon: FaHeart,
    color: 'from-red-500 via-pink-500 to-red-600',
    gradient: 'bg-gradient-to-br from-red-50 to-pink-50',
  },
  WEDDING_THEMES: {
    id: 'wedding',
    // Elegant star icon + royal purple gradient
    icon: FaStar,
    color: 'from-purple-500 via-indigo-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-purple-50 to-indigo-50',
  },
  BABY_KIDS_THEMES: {
    id: 'baby-kids',
    // People icon + soft blue/cyan gradient
    icon: FaUsers,
    color: 'from-blue-500 via-cyan-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
};

// Fallback static themes if API fails or is unavailable.
// NOTE: Icon / color / gradient are now derived dynamically from templateMetaByCode
//       instead of being hard-coded here.
const fallbackTemplates = [
  {
    code: 'BIRTHDAY_THEMES',
    name: 'Birthday Themes',
    description: 'Celebrate special moments with vibrant birthday designs.',
  },
  {
    code: 'ANNIVERSARY_THEMES',
    name: 'Anniversary Themes',
    description: 'Romantic designs for celebrating love and milestones.',
  },
  {
    code: 'WEDDING_THEMES',
    name: 'Wedding Themes',
    description: 'Elegant and timeless designs for your special day.',
  },
  {
    code: 'BABY_KIDS_THEMES',
    name: 'Baby & Kids Themes',
    description: 'Adorable themes for little ones and growing families.',
  },
];

const fallbackThemes: ThemeCategory[] = fallbackTemplates
  .filter((tpl) => templateMetaByCode[tpl.code])
  .map((tpl) => {
    const meta = templateMetaByCode[tpl.code];
    return {
      id: meta.id,
      title: tpl.name,
      subtitle: tpl.description,
      icon: meta.icon,
      color: meta.color,
      gradient: meta.gradient,
    };
  });

type PhotobookProgress = {
  id: number;
  categorySlug: string;
  status: string;
  currentStep: string;
  hasCovers: boolean;
  savedPagesCount: number;
  title?: string;
};

const ThemeCard: React.FC<{
  theme: ThemeCategory;
  onNewAlbum: (theme: ThemeCategory) => void;
  onResume: (theme: ThemeCategory, pb: PhotobookProgress) => void;
  progressList?: PhotobookProgress[];
}> = ({ theme, onNewAlbum, onResume, progressList }) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemesPage' });
  const stepLabel = (step?: string) =>
    step === 'ALBUM' ? t('stepAlbum')
    : step === 'PREVIEW' ? t('stepPreview')
    : step === 'DONE' ? t('stepDone')
    : t('stepCover');
  const Icon = theme.icon;
  const albumList = progressList ?? [];

  return (
    <div
      className="group relative bg-white/95 rounded-2xl p-5 shadow-[0_0_0_1px_rgba(148,163,184,0.08),0_18px_40px_-16px_rgba(15,23,42,0.35)] border border-slate-200/80 overflow-hidden backdrop-blur-sm"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.color} opacity-[0.03]`}
      ></div>

      <div className="relative z-10">
        <div
          className={`w-14 h-14 bg-gradient-to-br ${theme.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20`}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1.5">
          {theme.title}
        </h3>
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{theme.subtitle}</p>

        {/* Albums for this theme (from API by category) */}
        {albumList.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t('yourAlbums')}</div>
            {albumList.map((pb) => (
              <button
                key={pb.id}
                type="button"
                onClick={() => onResume(theme, pb)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-50 to-indigo-50 border border-cyan-200/60 hover:border-cyan-400 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate w-full">
                    {pb.title || t('albumNumber', { id: pb.id })}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] text-slate-500">{stepLabel(pb.currentStep)}</span>
                    {pb.hasCovers && <span className="text-[9px] rounded-full bg-green-100 text-green-700 px-1.5 py-0.5">{t('covers')}</span>}
                    {pb.savedPagesCount > 0 && <span className="text-[9px] rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5">{t('pages', { count: pb.savedPagesCount })}</span>}
                  </span>
                </div>
                <span className="text-xs font-bold text-cyan-600 shrink-0 flex items-center gap-1">
                  {t('continue')}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* New album button — always visible */}
        <button
          type="button"
          onClick={() => onNewAlbum(theme)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-semibold shadow-lg hover:from-cyan-600 hover:to-indigo-600 hover:shadow-xl transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {albumList.length > 0 ? t('createNewAlbum') : t('startAlbum')}
        </button>
      </div>

      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-300 transition-all duration-300" />
    </div>
  );
};

const PhotoThemesPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemesPage' });
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [themes, setThemes] = React.useState<ThemeCategory[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [photobookProgress, setPhotobookProgress] = React.useState<Record<string, PhotobookProgress[]>>({});
  const [lastPreview, setLastPreview] = React.useState<{
    templateId: number;
    categorySlug: string;
    title: string;
    subtitle: string;
    description?: string;
    coverHasImage?: boolean;
    backHasImage?: boolean;
  } | null>(null);

  // Load templates from backend API and map them to UI themes.
  React.useEffect(() => {
    let isMounted = true;
    const userData: any = getStoredUserData();
    const user = userData as User;
    async function loadTemplates() {
      try {
        setLoading(true);
        setError(null);
        console.log('🚀 useEffect: Starting template loading process...');

        // Get token dynamically
        const token = getStoredToken();
        console.log('🔑 Getting token:', token ? 'Token found' : 'No token found');

        if (!token) {
          console.warn('⚠️ No token found, API call may fail');
        }

        // Call API with dynamic token
        // Match curl example: X-API-KEY header only, onlyActive as boolean true
        // Use axios directly to avoid interceptor adding Authorization: Bearer header
        const baseURL = process.env.REACT_APP_API_URL || '';
        const apiUrl = `${baseURL}/api/photobook-templates`;

        console.log('📤 Making API request:', {
          url: apiUrl,
          params: {
            userId: user?.id || '',
            onlyActive: true
          },
          headers: {
            'X-API-KEY': token ? `${token.substring(0, 20)}...` : 'MISSING',
          },
        });

        console.log('📡 Starting to load templates from API...-------------------------------start');

        // Use axios directly (not api instance) to avoid interceptor adding Authorization header
        const response = await axios.get(apiUrl, {
          params: {
            userId: user?.id || '',
            onlyActive: true, // Boolean true (as shown in curl example URL)
          },
          headers: {
            // Use only X-API-KEY header (matching curl example)
            // No Authorization header - API doesn't want it
            'X-API-KEY': token || '',
            'accept': '*/*',
          },
        });
        console.log('📡 Starting to load templates from API...-------------------------------end///////////');

        // Store API response in result variable (exact structure you showed)
        const result: {
          templates: Array<{
            id: number;
            userId: number;
            name: string;
            code: string;
            description: string;
            basePrice: number;
            isActive: boolean;
          }>;
          total: number;
        } = response.data;

        const apiTemplates = result?.templates ?? [];

        // Map ALL active templates, including custom ones like SHU
        const mapped: ThemeCategory[] = apiTemplates
          .filter((tpl) => tpl.isActive)
          .map((tpl) => {
            const codeLower = (tpl.code || '').toLowerCase();
            const nameLower = (tpl.name || '').toLowerCase();

            const knownMeta = templateMetaByCode[tpl.code];

            // If we know this code, use the predefined meta (birthday, anniversary, etc.)
            if (knownMeta) {
              console.log(`✅ Mapping known template: ${tpl.name} (${tpl.code}) -> ${knownMeta.id}`);
              return {
                id: knownMeta.id,
                title: tpl.name,
                subtitle: tpl.description,
                icon: knownMeta.icon,
                color: knownMeta.color,
                gradient: knownMeta.gradient,
                templateId: tpl.id,
              };
            }

            // For custom templates (e.g. SHU, user-specific) choose icon/colors smartly
            let icon: React.ComponentType<{ className?: string }> = FaPalette;
            let color = 'from-indigo-500 via-blue-500 to-indigo-600';
            let gradient = 'bg-gradient-to-br from-indigo-50 to-blue-50';

            if (codeLower.includes('birthday') || nameLower.includes('birthday')) {
              icon = FaStar;
              color = 'from-pink-500 via-rose-500 to-pink-600';
              gradient = 'bg-gradient-to-br from-pink-50 to-rose-50';
            } else if (codeLower.includes('anniversary') || nameLower.includes('anniversary')) {
              icon = FaHeart;
              color = 'from-red-500 via-pink-500 to-red-600';
              gradient = 'bg-gradient-to-br from-red-50 to-pink-50';
            } else if (codeLower.includes('wedding') || nameLower.includes('wedding')) {
              icon = FaStar;
              color = 'from-purple-500 via-indigo-500 to-purple-600';
              gradient = 'bg-gradient-to-br from-purple-50 to-indigo-50';
            } else if (codeLower.includes('baby') || codeLower.includes('kids') || nameLower.includes('baby') || nameLower.includes('kids')) {
              icon = FaUsers;
              color = 'from-blue-500 via-cyan-500 to-blue-600';
              gradient = 'bg-gradient-to-br from-blue-50 to-cyan-50';
            }

            const generatedId = tpl.code?.toLowerCase() || `template-${tpl.id}`;
            console.log(`✨ Mapping custom template: ${tpl.name} (${tpl.code}) -> ${generatedId}`);

          return {
            id: generatedId, // Will be used in route: /photo-themes/{generatedId}
            title: tpl.name,
            subtitle: tpl.description,
            icon,
            color,
            gradient,
            templateId: tpl.id,
          };
          });

        console.log('🎨 Mapped themes:', mapped.length, 'themes ready');
        console.log('📝 Final mapped themes:', mapped);

        if (!isMounted) {
          console.log('⚠️ Component unmounted, skipping state update');
          return;
        }

        // If API didn't return anything mappable, use fallback so the 4 cards always show
        if (mapped.length > 0) {
          console.log('✅ Setting themes from API:', mapped.length, 'themes');
          setThemes(mapped);
        } else {
          console.warn('⚠️ No mapped themes from API, using fallback themes');
          setThemes(fallbackThemes);
        }

        // Load last saved preview (if any) from localStorage
        try {
          const raw = localStorage.getItem('lastPhotobookThemePreview');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.templateId && parsed.categorySlug) {
              setLastPreview({
                templateId: Number(parsed.templateId),
                categorySlug: String(parsed.categorySlug),
                title: String(
                  parsed.cover?.headline ||
                    parsed.themeTitle ||
                    t('lastDesignTitle')
                ),
                subtitle: String(
                  parsed.cover?.subheadline ||
                    parsed.back?.headline ||
                    parsed.themeSubtitle ||
                    t('lastDesignSubtitle')
                ),
                description: String(
                  parsed.cover?.description ||
                    parsed.back?.description ||
                    ''
                ),
                coverHasImage: !!parsed.cover?.hasImage,
                backHasImage: !!parsed.back?.hasImage,
              });
            }
          }
        } catch (e) {
          console.warn('Failed to read lastPhotobookThemePreview from localStorage', e);
        }
      } catch (err: any) {
        if (!isMounted) {
          console.log('⚠️ Component unmounted, skipping error handling');
          return;
        }
        console.error('❌ Error in loadTemplates:', err);

        // Log detailed error information
        const errorDetails = {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          responseData: err.response?.data,
          requestUrl: err.config?.url,
          requestMethod: err.config?.method,
          requestHeaders: err.config?.headers,
          requestParams: err.config?.params,
        };

        console.error('🔍 Detailed Error Info:', errorDetails);

        // Log the actual error response body if available
        if (err.response?.data) {
          console.error('📋 API Error Response Body:', JSON.stringify(err.response.data, null, 2));
          console.error('📋 API Error Message:', err.response.data?.message || err.response.data?.error || 'No error message');
        }

        setError(t('errorLoadTemplates'));
        setThemes(fallbackThemes);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('🏁 Template loading process completed');
        }
      }
    }

    loadTemplates();

    return () => {
      console.log('🧹 Cleaning up template loading effect');
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Load albums per theme from API (dynamic: each card gets its list by category)
  React.useEffect(() => {
    const token = getStoredToken();
    if (!token || themes.length === 0) return;
    let isMounted = true;
    const loadProgressByCategory = async () => {
      try {
        const map: Record<string, PhotobookProgress[]> = {};
        await Promise.all(
          themes.map(async (theme) => {
            try {
              const slug = encodeURIComponent(theme.id);
              const res = await api.get<PhotobookProgress[]>(`/api/photobooks/by-category/${slug}`, {
                headers: { 'X-API-KEY': token },
              });
              const list = Array.isArray(res.data) ? res.data : [];
              if (isMounted) map[theme.id] = list;
            } catch (e) {
              if (isMounted) map[theme.id] = [];
            }
          })
        );
        if (isMounted) setPhotobookProgress((prev) => ({ ...prev, ...map }));
      } catch (err) {
        console.warn('Failed to load photobook progress by category:', err);
      }
    };
    loadProgressByCategory();
    return () => { isMounted = false; };
  }, [themes]);

  const handleThemeClick = (theme: ThemeCategory) => {
    // When user clicks "Start Album" / "Create New Album", we want a truly
    // fresh album (no old covers or pages). Clear any stored photobook
    // progress for this theme before navigating.
    try {
      const key = `photobook_${theme.id}`;
      localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }

    // Always go to cover page to start a new album for this theme
    navigate(`/photo-themes/${theme.id}`, {
      state: { templateId: theme.templateId },
    });
  };

  const handleResumePhotobook = (theme: ThemeCategory, pb: PhotobookProgress) => {
    if (pb.currentStep === 'ALBUM' || pb.currentStep === 'PREVIEW') {
      navigate(`/photo-themes/${theme.id}/album`, {
        state: { dbTemplateId: theme.templateId, photobookId: pb.id },
      });
    } else {
      navigate(`/photo-themes/${theme.id}`, {
        state: { templateId: theme.templateId, photobookId: pb.id },
      });
    }
  };

  const handleLastPreviewClick = () => {
    if (!lastPreview) return;
    navigate(`/photo-themes/${lastPreview.categorySlug}`, {
      state: { templateId: lastPreview.templateId },
    });
  };

  if (loading) {
    return (
      <div className="space-y-8 w-full">
        {/* Header - Show even during loading */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 md:p-7 shadow-[0_0_0_1px_rgba(148,163,184,0.08),0_22px_60px_-20px_rgba(15,23,42,0.4)]">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 rounded-t-3xl" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-400/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/40">
              <FaPalette className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {t('title')}
              </h1>
              <p className="text-sm md:text-base text-slate-500 mt-1">
                {t('subtitleLoading')}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State – premium futuristic */}
        <div className="relative flex flex-col items-center justify-center min-h-[380px] rounded-2xl overflow-hidden border border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-[0_0_0_1px_rgba(148,163,184,0.08),0_20px_50px_-20px_rgba(15,23,42,0.15)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-col items-center">
            {/* Double ring + icon */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200/80" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-indigo-400 animate-spin" style={{ animationDuration: '0.9s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-300 border-b-violet-300 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="loader-glow-pulse absolute w-10 h-10 rounded-full bg-cyan-400/30" />
                <FaPalette className="relative h-8 w-8 text-cyan-500 drop-shadow-sm" />
              </div>
            </div>
            <p className="mt-6 text-base font-bold text-slate-800 tracking-tight">{t('loadingThemes')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('preparingTemplates')}</p>
            {/* Shimmer bar */}
            <div className="mt-5 w-32 h-1 rounded-full bg-slate-200/80 overflow-hidden">
              <div className="loader-shimmer h-full w-full rounded-full" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/40 animate-pulse" style={{ animationDelay: '250ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400/40 animate-pulse" style={{ animationDelay: '500ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 md:p-7 shadow-[0_0_0_1px_rgba(148,163,184,0.08),0_22px_60px_-20px_rgba(15,23,42,0.4)]">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 rounded-t-3xl" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-400/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/40">
            <FaPalette className="h-8 w-8 text-cyan-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {t('title')}
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 max-w-xl">
              {t('subtitleLoaded')}
            </p>
          </div>
          <Link
            to="/photo-book"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t('myPhotoBooks')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            onNewAlbum={handleThemeClick}
            onResume={handleResumePhotobook}
            progressList={photobookProgress[theme.id]}
          />
        ))}
      </div>

      {/* Info */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200/80">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-slate-900/30">
            <FaPalette className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">{t('aboutTitle')}</h3>
            <p className="text-xs text-slate-600">
              {t('aboutBody')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoThemesPage;

