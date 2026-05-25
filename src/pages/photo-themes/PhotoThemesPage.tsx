import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client/axiosInstance';
import axios from 'axios';
import {
  FaStar,
  FaHeart,
  FaUsers,
  FaPalette,
  FaImages,
  FaCloud,
} from 'react-icons/fa';
import { ThemeCardSkeleton } from '../../components/common/skeletons';
import { getStoredToken, getStoredUserData } from '../../utils/authUtils';
import { User } from '../../types/user';

interface ThemeCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  templateId?: number;
}

const FEATURED_THEME_IDS = ['wedding', 'baby-kids'] as const;

const FEATURED_WEDDING_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBO1LU2aMGOy2EtV3afHLsbSTf6CN7uQj5_tlFSbELIUkiZFIUwM4IhgYdZrsPBMO1OsZjRg6uzKXuR5ZnfiqBPrcN_g1PwOY7mIdePIqokcTuI9QZE-CXpBp44iwZzR1R25shyu5ZskEs3UDiskmqqAescb3itcoQIESrX_CDBRDXhtPFU0KEOEGNT96qaGJdzsj3bF94u613-QUGqbZiAgJx-LHMvVFs8yUQufcJd1XgwJuuJpFg_T7zI0KSov2zK0Slgn2twPg5B';

const FEATURED_BABY_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB3L8HSRWIURonY42oRVLcnZA3hQI3zparzpNQisI0gFZia3Nsmq_LhMA5S6fb3_UG9VsFPcWrQfK6nUGXxmE76WqGOccfB2zd_y5wBrKO2jFnsnkspmym5hybAVlT53YHIaLIxUgBDqsndEAk9E33Qr-QyU8dx9ctrqmrGH3i6eB1PNS0-gV6fJtUWLwdkoxPSQsmC6_OykN-GxER2G6zNAvmSKkjABo_r5tsMGARjB7GkWn7ri-KLPxoMEIr_PV23lJnoInwKu2QM';

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const LAYOUT_COUNTS: Record<string, number> = {
  birthday: 18,
  anniversary: 16,
  wedding: 24,
  'baby-kids': 20,
  vacation: 14,
  portfolio: 12,
};

const templateMetaByCode: Record<
  string,
  {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    gradient: string;
  }
> = {
  BIRTHDAY_THEMES: {
    id: 'birthday',
    icon: FaStar,
    color: 'from-pink-500 via-rose-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-pink-50 to-rose-50',
  },
  ANNIVERSARY_THEMES: {
    id: 'anniversary',
    icon: FaHeart,
    color: 'from-red-500 via-pink-500 to-red-600',
    gradient: 'bg-gradient-to-br from-red-50 to-pink-50',
  },
  WEDDING_THEMES: {
    id: 'wedding',
    icon: FaStar,
    color: 'from-amber-600 via-rose-500 to-amber-700',
    gradient: 'bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50',
  },
  BABY_KIDS_THEMES: {
    id: 'baby-kids',
    icon: FaUsers,
    color: 'from-sky-400 via-blue-400 to-indigo-400',
    gradient: 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50',
  },
};

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

function layoutCountForTheme(themeId: string): number {
  return LAYOUT_COUNTS[themeId] ?? 12;
}

function categoryShortTitle(theme: ThemeCategory): string {
  const labels: Record<string, string> = {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    wedding: 'Wedding',
    'baby-kids': 'Baby & Kids',
    vacation: 'Vacation',
    portfolio: 'Portfolio',
  };
  if (labels[theme.id]) return labels[theme.id];
  return theme.title.replace(/\s*themes?\s*/i, '').trim() || theme.title;
}

function categoryGridStyle(theme: ThemeCategory): {
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  const presets: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }> }> = {
    birthday: { gradient: 'from-[#ec4899] to-[#f43f5e]', icon: FaStar },
    anniversary: { gradient: 'from-[#ef4444] to-[#ec4899]', icon: FaHeart },
    wedding: { gradient: 'from-[#8b5cf6] to-[#6366f1]', icon: FaStar },
    'baby-kids': { gradient: 'from-[#06b6d4] to-[#8b5cf6]', icon: FaUsers },
    vacation: { gradient: 'from-[#06b6d4] to-[#8b5cf6]', icon: FaCloud },
    portfolio: { gradient: 'from-slate-900 to-slate-800', icon: FaImages },
  };
  return presets[theme.id] ?? { gradient: theme.color, icon: theme.icon };
}

function projectStepProgress(
  step: string | undefined,
  t: (key: string) => string
): { percent: number; stepNum: number; label: string } {
  if (step === 'ALBUM') {
    return { percent: 66, stepNum: 2, label: t('stepLayouts') };
  }
  if (step === 'PREVIEW') {
    return { percent: 90, stepNum: 3, label: t('stepOrdering') };
  }
  if (step === 'DONE') {
    return { percent: 100, stepNum: 3, label: t('stepDone') };
  }
  return { percent: 33, stepNum: 1, label: t('stepPhotos') };
}

const ProgressRing: React.FC<{ percent: number }> = ({ percent }) => {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          className="text-slate-100"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          className="text-[#4648d4]"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide text-[#4648d4]">
        {percent}%
      </span>
    </div>
  );
};

const ResumeProjectCard: React.FC<{
  title: string;
  stepText: string;
  percent: number;
  onResume: () => void;
}> = ({ title, stepText, percent, onResume }) => (
  <button type="button" onClick={onResume} className="photo-themes-glass-card p-4 flex items-center gap-4 text-left w-full">
    <ProgressRing percent={percent} />
    <div className="min-w-0">
      <h3 className="text-sm font-medium text-[#0b1c30] truncate">{title}</h3>
      <p className="text-[#464554] text-xs font-medium mt-0.5">{stepText}</p>
    </div>
  </button>
);

const FeaturedThemeCard: React.FC<{
  theme: ThemeCategory;
  onStart: () => void;
}> = ({ theme, onStart }) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemesPage' });
  const isWedding = theme.id === 'wedding';
  const isBaby = theme.id === 'baby-kids';
  const imageSrc = isWedding ? FEATURED_WEDDING_IMAGE : isBaby ? FEATURED_BABY_IMAGE : undefined;

  const badge = isWedding
    ? t('featuredMatrimonyBadge')
    : isBaby
      ? t('featuredNewbornBadge')
      : t('featuredDefaultEyebrow');
  const headline = isWedding
    ? t('featuredMatrimonySubtitle')
    : isBaby
      ? t('featuredNewbornSubtitle')
      : theme.title;
  const description = isWedding
    ? t('featuredMatrimonyDesc')
    : isBaby
      ? t('featuredNewbornDesc')
      : theme.subtitle;
  const cta = isWedding ? t('featuredWeddingCta') : isBaby ? t('featuredBabyCta') : t('startNewAlbum');

  return (
    <article className="photo-themes-glass-card overflow-hidden flex flex-col md:flex-row group">
      <div className="md:w-1/2 h-64 md:h-auto min-h-[16rem] overflow-hidden bg-slate-100">
        {imageSrc ? (
          <img
            alt={headline}
            src={imageSrc}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${theme.color}`} />
        )}
      </div>
      <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide mb-4 inline-block ${
              isBaby ? 'bg-[#8127cf]/10 text-[#8127cf]' : 'bg-[#4648d4]/10 text-[#4648d4]'
            }`}
          >
            {badge}
          </span>
          <h3 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-semibold text-slate-900 mb-2 leading-tight">
            {headline}
          </h3>
          <p className="text-[#464554] text-base leading-relaxed mb-6">{description}</p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className={
            isBaby
              ? 'w-full py-4 rounded-xl border-2 border-[#4648d4] text-[#4648d4] text-sm font-medium hover:bg-[#4648d4] hover:text-white transition-all'
              : 'w-full py-4 rounded-xl bg-[#4648d4] text-white text-sm font-medium shadow-lg hover:shadow-[#4648d4]/30 transition-all'
          }
        >
          {cta}
        </button>
      </div>
    </article>
  );
};

const CategoryBrowseCard: React.FC<{
  theme: ThemeCategory;
  onStart: () => void;
}> = ({ theme, onStart }) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'photoThemesPage' });
  const style = categoryGridStyle(theme);
  const Icon = style.icon;
  const layouts = layoutCountForTheme(theme.id);

  return (
    <button
      type="button"
      onClick={onStart}
      className="photo-themes-glass-card p-6 sm:p-8 flex flex-col items-center text-center group w-full"
    >
      <div
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
      >
        <Icon className="h-8 w-8 text-white" />
      </div>
      <h4 className="text-sm font-medium text-[#0b1c30]">{categoryShortTitle(theme)}</h4>
      <p className="text-[#464554] text-xs font-medium mt-1">{t('layoutCountShort', { count: layouts })}</p>
    </button>
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

  React.useEffect(() => {
    let isMounted = true;
    const userData: any = getStoredUserData();
    const user = userData as User;
    async function loadTemplates() {
      try {
        setLoading(true);
        setError(null);
        console.log('🚀 useEffect: Starting template loading process...');

        const token = getStoredToken();
        console.log('🔑 Getting token:', token ? 'Token found' : 'No token found');

        if (!token) {
          console.warn('⚠️ No token found, API call may fail');
        }

        const baseURL = process.env.REACT_APP_API_URL || '';
        const apiUrl = `${baseURL}/api/photobook-templates`;

        console.log('📤 Making API request:', {
          url: apiUrl,
          params: {
            userId: user?.id || '',
            onlyActive: true,
          },
          headers: {
            'X-API-KEY': token ? `${token.substring(0, 20)}...` : 'MISSING',
          },
        });

        console.log('📡 Starting to load templates from API...-------------------------------start');

        const response = await axios.get(apiUrl, {
          params: {
            userId: user?.id || '',
            onlyActive: true,
          },
          headers: {
            'X-API-KEY': token || '',
            accept: '*/*',
          },
        });
        console.log('📡 Starting to load templates from API...-------------------------------end///////////');

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

        const mapped: ThemeCategory[] = apiTemplates
          .filter((tpl) => tpl.isActive)
          .map((tpl) => {
            const codeLower = (tpl.code || '').toLowerCase();
            const nameLower = (tpl.name || '').toLowerCase();

            const knownMeta = templateMetaByCode[tpl.code];

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
              color = 'from-amber-600 via-rose-500 to-amber-700';
              gradient = 'bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50';
            } else if (
              codeLower.includes('baby') ||
              codeLower.includes('kids') ||
              nameLower.includes('baby') ||
              nameLower.includes('kids')
            ) {
              icon = FaUsers;
              color = 'from-sky-400 via-blue-400 to-indigo-400';
              gradient = 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50';
            }

            const generatedId = tpl.code?.toLowerCase() || `template-${tpl.id}`;
            console.log(`✨ Mapping custom template: ${tpl.name} (${tpl.code}) -> ${generatedId}`);

            return {
              id: generatedId,
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

        if (mapped.length > 0) {
          console.log('✅ Setting themes from API:', mapped.length, 'themes');
          setThemes(mapped);
        } else {
          console.warn('⚠️ No mapped themes from API, using fallback themes');
          setThemes(fallbackThemes);
        }

        try {
          const raw = localStorage.getItem('lastPhotobookThemePreview');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.templateId && parsed.categorySlug) {
              setLastPreview({
                templateId: Number(parsed.templateId),
                categorySlug: String(parsed.categorySlug),
                title: String(parsed.cover?.headline || parsed.themeTitle || t('lastDesignTitle')),
                subtitle: String(
                  parsed.cover?.subheadline ||
                    parsed.back?.headline ||
                    parsed.themeSubtitle ||
                    t('lastDesignSubtitle')
                ),
                description: String(parsed.cover?.description || parsed.back?.description || ''),
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

        if (err.response?.data) {
          console.error('📋 API Error Response Body:', JSON.stringify(err.response.data, null, 2));
          console.error(
            '📋 API Error Message:',
            err.response.data?.message || err.response.data?.error || 'No error message'
          );
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
  }, []);

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
            } catch {
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
    return () => {
      isMounted = false;
    };
  }, [themes]);

  const displayFeatured = React.useMemo(() => {
    const prioritized = FEATURED_THEME_IDS.map((id) => themes.find((th) => th.id === id)).filter(
      Boolean
    ) as ThemeCategory[];
    if (prioritized.length >= 2) return prioritized.slice(0, 2);
    const used = new Set(prioritized.map((th) => th.id));
    const rest = themes.filter((th) => !used.has(th.id));
    return [...prioritized, ...rest].slice(0, 2);
  }, [themes]);

  const displayCategories = React.useMemo(() => {
    const featIds = new Set(displayFeatured.map((th) => th.id));
    return themes.filter((th) => !featIds.has(th.id));
  }, [themes, displayFeatured]);

  const resumeProjects = React.useMemo(() => {
    const items: { theme: ThemeCategory; pb: PhotobookProgress }[] = [];
    for (const theme of themes) {
      for (const pb of photobookProgress[theme.id] ?? []) {
        if (pb.currentStep !== 'DONE') {
          items.push({ theme, pb });
        }
      }
    }
    return items.sort((a, b) => b.pb.id - a.pb.id);
  }, [themes, photobookProgress]);

  const handleThemeClick = (theme: ThemeCategory) => {
    try {
      const key = `photobook_${theme.id}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
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

  const showResumeSection = resumeProjects.length > 0 || !!lastPreview;

  if (loading) {
    return (
      <div className="photo-themes-hub w-full max-w-[1280px] mx-auto pb-16 px-5 sm:px-12">
        <section className="text-center mb-16 pt-4">
          <div className="h-12 w-64 mx-auto bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-5 w-96 max-w-full mx-auto mt-4 bg-slate-100 rounded animate-pulse" />
        </section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-white/60 animate-pulse border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">
          <div className="h-80 rounded-3xl bg-white/60 animate-pulse border border-slate-200" />
          <div className="h-80 rounded-3xl bg-white/60 animate-pulse border border-slate-200" />
        </div>
        <ThemeCardSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="photo-themes-hub w-full mx-auto pb-20 px-5 sm:px-12">
      {/* Hero */}
      <section className="relative text-center mb-16 pt-2">
        <Link
          to="/photo-book"
          className="absolute right-0 top-0 hidden sm:inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 px-6 py-2 text-sm font-medium text-[#0b1c30] dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          {t('myPhotoBooks')}
        </Link>
        <h1 className="font-['Playfair_Display'] text-4xl sm:text-5xl lg:text-[3rem] font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-[#464554] dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">{t('subtitleLoaded')}</p>
        <Link
          to="/photo-book"
          className="sm:hidden mt-6 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 px-6 py-2 text-sm font-medium text-[#0b1c30] dark:text-slate-100"
        >
          {t('myPhotoBooks')}
        </Link>
      </section>

      {error && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {/* Resume projects */}
      {showResumeSection && (
        <section className="mb-20" aria-labelledby="resume-projects-heading">
          <div className="flex items-center justify-between mb-8">
            <h2 id="resume-projects-heading" className="pt-section-title text-[1.875rem] font-semibold tracking-tight">
              {t('resumeProjects')}
            </h2>
            <Link to="/photo-book" className="text-[#4648d4] text-sm font-medium hover:underline">
              {t('viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lastPreview && (
              <ResumeProjectCard
                title={lastPreview.title}
                percent={50}
                stepText={t('stepOf3', { step: 2, label: t('stepLayouts') })}
                onResume={handleLastPreviewClick}
              />
            )}
            {resumeProjects.map(({ theme, pb }) => {
              const prog = projectStepProgress(pb.currentStep, t);
              return (
                <ResumeProjectCard
                  key={`${theme.id}-${pb.id}`}
                  title={pb.title || t('albumNumber', { id: pb.id })}
                  percent={prog.percent}
                  stepText={t('stepOf3', { step: prog.stepNum, label: prog.label })}
                  onResume={() => handleResumePhotobook(theme, pb)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Featured themes */}
      {displayFeatured.length > 0 && (
        <section className="mb-20" aria-labelledby="featured-themes-heading">
          <h2 id="featured-themes-heading" className="pt-section-title text-[1.875rem] font-semibold tracking-tight mb-8">
            {t('featuredThemes')}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayFeatured.map((theme) => (
              <FeaturedThemeCard key={theme.id} theme={theme} onStart={() => handleThemeClick(theme)} />
            ))}
          </div>
        </section>
      )}

      {/* Browse categories */}
      {displayCategories.length > 0 && (
        <section className="mb-20" aria-labelledby="browse-categories-heading">
          <h2 id="browse-categories-heading" className="pt-section-title text-[1.875rem] font-semibold tracking-tight mb-8">
            {t('browseCategories')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {displayCategories.map((theme) => (
              <CategoryBrowseCard key={theme.id} theme={theme} onStart={() => handleThemeClick(theme)} />
            ))}
          </div>
        </section>
      )}

      {/* Stats banner */}
      <section className="mb-8" aria-labelledby="excellence-heading">
        <div className="photo-themes-glass-card p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,#4648d4,transparent_70%)] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
            <div>
              <p className="font-['Playfair_Display'] text-4xl font-bold text-[#4648d4]">{t('statThemesValue')}</p>
              <p className="pt-muted text-sm font-medium mt-1">{t('statThemesLabel')}</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-600" aria-hidden />
            <div>
              <p className="font-['Playfair_Display'] text-4xl font-bold text-[#4648d4]">{t('statBooksValue')}</p>
              <p className="pt-muted text-sm font-medium mt-1">{t('statBooksLabel')}</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-600" aria-hidden />
            <div className="max-w-xs">
              <p className="pt-section-title text-sm font-bold mb-2">{t('craftedForExcellence')}</p>
              <p className="pt-muted text-base leading-relaxed">{t('craftedForExcellenceDesc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PhotoThemesPage;
