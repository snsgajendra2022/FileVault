import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FaBars, FaBell, FaUser, FaSignOutAlt, FaCrown, FaGlobe } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    toast.success(t('header.loggedOut'));
    // Navigate to login page after logout
    navigate('/login', { replace: true });
  };

  // Debug: Log user data
  // console.log('Header - User data:', user);
  // console.log('Header - Is admin:', isAdmin);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Mobile menu button only */}
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden group relative p-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars className="h-5 w-5" />
          </button>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Language (next to notifications) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
            <FaGlobe className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block" aria-hidden />
            <label htmlFor="header-language" className="sr-only">
              {t('header.language')}
            </label>
            <select
              id="header-language"
              value={i18n.language?.startsWith('hi') ? 'hi' : 'en'}
              onChange={(e) => {
                void i18n.changeLanguage(e.target.value);
              }}
              className="text-sm font-semibold text-slate-200 bg-transparent border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 rounded-md max-w-[7.5rem] sm:max-w-none py-0.5 pr-6 pl-1"
              aria-label={t('header.language')}
            >
              <option value="en">{t('header.english')}</option>
              <option value="hi">{t('header.hindi')}</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="group relative p-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <FaBell className="h-5 w-5" />
              <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 shadow-lg animate-pulse"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl z-50">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FaBell className="h-5 w-5 text-violet-300" />
                      <h3 className="font-bold text-white text-lg">{t('header.notifications')}</h3>
                    </div>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="flex items-start space-x-3">
                        {/* <FaStar className="h-4 w-4 text-blue-600 mt-0.5" /> */}
                        <div>
                          <p className="text-sm font-semibold text-white">{t('header.welcomeTitle')}</p>
                          <p className="text-xs text-slate-400 mt-1">{t('header.welcomeTime')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="flex items-start space-x-3">
                        <FaCrown className="h-4 w-4 text-emerald-300 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-white">{t('header.verifiedTitle')}</p>
                          <p className="text-xs text-slate-400 mt-1">{t('header.verifiedTime')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced User menu */}
          <div className="relative">
            <button
              type="button"
              className="group flex items-center space-x-3 p-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <span className="text-white font-bold text-sm">
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </span>
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black shadow-sm"></div>
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  {isAdmin && <FaCrown className="h-3 w-3 text-violet-300" />}
                </div>
                <p className="text-xs text-slate-400">{user?.email}</p>
                <div className="flex items-center space-x-1">
                  {/* <FaStar className="w-3 h-3 text-blue-500" /> */}
                  <p className="text-xs text-violet-300 font-semibold">{user?.accountType}</p>
                </div>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-[31rem] rounded-2xl shadow-2xl border border-white/10 bg-black/70 backdrop-blur-xl z-50">
                <div className="p-6">
                  <div className="flex items-center space-x-4 p-4 rounded-xl mb-4 border border-white/10 bg-white/5">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white font-bold text-sm">
                          {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black shadow-sm"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-white text-sm">{user?.firstName} {user?.lastName}</p>
                        {isAdmin && <FaCrown className="h-4 w-4 text-violet-300" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-1" style={{ wordBreak: 'break-all' }}>{user?.email}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        {/* <FaStar className="w-3 h-3 text-blue-500" /> */}
                        <p className="text-xs text-violet-300 font-semibold">{user?.accountType}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuOpen(false);
                      }}
                      className="group flex items-center w-full px-4 py-3 text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
                    >
                      <FaUser className="mr-3 h-4 w-4 text-violet-300 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-semibold">{t('header.profile')}</span>
                    </button>
                    
                    {/* <button
                      onClick={() => {
                        navigate('/settings');
                        setUserMenuOpen(false);
                      }}
                      className="group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300 border border-transparent hover:border-blue-200"
                    >
                      <FaCog className="mr-3 h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-semibold">Settings</span>
                    </button> */}
                    
                    <hr className="my-3 border-white/10" />
                    
                    <button
                      onClick={handleLogout}
                      className="group flex items-center w-full px-4 py-3 text-sm text-rose-200 hover:text-white hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                    >
                      <FaSignOutAlt className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-semibold">{t('header.signOut')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
