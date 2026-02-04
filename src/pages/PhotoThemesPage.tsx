import React from 'react';
import { useNavigate } from 'react-router-dom';
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

interface ThemeCategory {
  id: string; // used as categorySlug
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}

const themeCategories: ThemeCategory[] = [
  {
    id: 'birthday',
    title: 'Birthday Themes',
    subtitle: 'Celebrate special moments with vibrant birthday designs.',
    icon: FaStar,
    color: 'from-pink-500 via-rose-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-pink-50 to-rose-50',
  },
  {
    id: 'anniversary',
    title: 'Anniversary Themes',
    subtitle: 'Romantic designs for celebrating love and milestones.',
    icon: FaHeart,
    color: 'from-red-500 via-pink-500 to-red-600',
    gradient: 'bg-gradient-to-br from-red-50 to-pink-50',
  },
  {
    id: 'wedding',
    title: 'Wedding Themes',
    subtitle: 'Elegant and timeless designs for your special day.',
    icon: FaStar,
    color: 'from-purple-500 via-indigo-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-purple-50 to-indigo-50',
  },
  {
    id: 'baby-kids',
    title: 'Baby & Kids Themes',
    subtitle: 'Adorable themes for little ones and growing families.',
    icon: FaUsers,
    color: 'from-blue-500 via-cyan-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
  {
    id: 'travel',
    title: 'Travel Memories',
    subtitle: 'Capture your adventures with stunning travel layouts.',
    icon: FaCloud,
    color: 'from-teal-500 via-emerald-500 to-teal-600',
    gradient: 'bg-gradient-to-br from-teal-50 to-emerald-50',
  },
  {
    id: 'family',
    title: 'Family Album',
    subtitle: 'Cherish family moments with warm, classic designs.',
    icon: FaImages,
    color: 'from-amber-500 via-orange-500 to-amber-600',
    gradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
  },
  {
    id: 'festival',
    title: 'Festival & Events',
    subtitle: 'Vibrant themes for celebrations and special occasions.',
    icon: FaCalendarAlt,
    color: 'from-violet-500 via-purple-500 to-violet-600',
    gradient: 'bg-gradient-to-br from-violet-50 to-purple-50',
  },
  {
    id: 'corporate',
    title: 'Corporate / Office',
    subtitle: 'Professional layouts for business and corporate events.',
    icon: FaBriefcase,
    color: 'from-slate-500 via-gray-500 to-slate-600',
    gradient: 'bg-gradient-to-br from-slate-50 to-gray-50',
  },
  {
    id: 'minimal',
    title: 'Minimal / Classic',
    subtitle: 'Clean, elegant designs with timeless appeal.',
    icon: FaFolderOpen,
    color: 'from-gray-400 via-gray-500 to-gray-600',
    gradient: 'bg-gradient-to-br from-gray-50 to-gray-100',
  },
  {
    id: 'custom',
    title: 'Custom Themes',
    subtitle: 'Create your own unique theme or request a custom design.',
    icon: FaPalette,
    color: 'from-indigo-500 via-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-br from-indigo-50 to-blue-50',
  },
];

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
  const [loading] = React.useState(false);

  const handleThemeClick = (theme: ThemeCategory) => {
    // Sirf nayi category detail page par le jao (no redirect to existing editor)
    navigate(`/photo-themes/${theme.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading photo themes...</p>
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themeCategories.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} onClick={handleThemeClick} />
        ))}
      </div>

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

