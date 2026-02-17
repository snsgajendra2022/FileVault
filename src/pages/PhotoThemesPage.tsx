import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
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
import { getStoredToken, getStoredUserData } from '../utils/authUtils';
import { User } from '../types/user';

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

const ThemeCard: React.FC<{ theme: ThemeCategory; onClick: (theme: ThemeCategory) => void }> = ({
  theme,
  onClick,
}) => {
  const Icon = theme.icon;

  return (
    <div
      onClick={() => onClick(theme)}
      className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden cursor-pointer"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      ></div>

      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-60 animate-pulse" />
      <div className="absolute top-4 right-4 w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-40 animate-ping" />

      <div className="relative z-10">
        <div
          className={`w-16 h-16 bg-gradient-to-br ${theme.color} rounded-2xl flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}
        >
          <Icon className="h-8 w-8 text-white" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300">
          {theme.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{theme.subtitle}</p>

        <div className="flex items-center text-indigo-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span>Explore themes</span>
          <svg
            className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-300 transition-all duration-300" />
    </div>
  );
};

const PhotoThemesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [themes, setThemes] = React.useState<ThemeCategory[]>([]);
  const [error, setError] = React.useState<string | null>(null);
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

        // If API didn't return anything mappable, fall back to static.
        if (mapped.length > 0) {
          console.log('✅ Setting themes from API:', mapped.length, 'themes');
          setThemes(mapped);
        } else {
          console.warn('⚠️ No mapped themes, using fallback');
          // setThemes(fallbackThemes);
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
                    'Your last design'
                ),
                subtitle: String(
                  parsed.cover?.subheadline ||
                    parsed.back?.headline ||
                    parsed.themeSubtitle ||
                    'Recently saved cover & last page design.'
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

        setError('Unable to load templates from server. Showing default themes.');
        // setThemes(fallbackThemes);
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

  const handleThemeClick = (theme: ThemeCategory) => {
    // Directly go to theme category builder page (original behavior)
    navigate(`/photo-themes/${theme.id}`, {
      state: { templateId: theme.templateId },
    });
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
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24" />

          <div className="relative z-10 flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FaPalette className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Photo Themes
              </h1>
              <p className="text-base md:text-lg text-blue-100">
                Browse beautiful, ready-made themes for your photo books and albums.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center">
            <FaSpinner className="h-16 w-16 text-indigo-600 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Photo Themes</h3>
            <p className="text-gray-600 mb-4">Fetching templates from server...</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <FaPalette className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Photo Themes
            </h1>
            <p className="text-base md:text-lg text-blue-100">
              Browse beautiful, ready-made themes for your photo books and albums.
            </p>
          </div>
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
          <ThemeCard key={theme.id} theme={theme} onClick={handleThemeClick} />
        ))}
      </div>

      {/* Last saved theme preview (local only) */}
      {lastPreview && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            Your last saved theme
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              onClick={handleLastPreviewClick}
              className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 border border-indigo-100 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-5 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <FaPalette className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                      Last saved
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                  {lastPreview.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                  {lastPreview.subtitle}
                </p>
                {lastPreview.description && (
                  <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                    {lastPreview.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {lastPreview.coverHasImage && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-[10px] font-medium text-green-700 border border-green-100">
                      Cover image saved
                    </span>
                  )}
                  {lastPreview.backHasImage && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-medium text-blue-700 border border-blue-100">
                      Last page image saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-600 font-medium">
                  View & edit this design →
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FaPalette className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">About Photo Themes</h3>
            <p className="text-sm text-gray-600">
              Use Photo Themes as a central place to explore different photo book styles. Each
              category groups templates and layouts tailored for a specific occasion such as
              birthdays, weddings, family albums, and more. Pick a theme to continue into a
              detailed template or editor flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoThemesPage;

