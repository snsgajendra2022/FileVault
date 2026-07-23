import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import { FaBars, FaBell, FaUser, FaSignOutAlt, FaCrown, FaGlobe } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ThemeToggleButton from '../auth/ThemeToggleButton';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userMenuOpen && !notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, notificationsOpen]);

  const handleLogout = () => {
    logout();
    toast.success(t('header.loggedOut'));
    navigate('/login', { replace: true });
  };

  const initials = user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U';

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-[rgba(20,18,16,0.1)] bg-[#fffcf8]/95 dark:border-white/10 dark:bg-[#1c1a18]/95 backdrop-blur-sm transition-colors duration-200">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden group relative rounded-full p-2.5 text-[#5c574f] transition-colors hover:bg-[#eceae4] hover:text-[#141210] dark:text-[#a8a399] dark:hover:bg-white/10 dark:hover:text-[#fffcf8]"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <FaBars className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <ThemeToggleButton />

          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(20,18,16,0.12)] bg-[#f7f6f3] px-2.5 py-1.5 transition-colors hover:bg-[#eceae4] dark:border-white/10 dark:bg-[#151412] dark:hover:bg-white/5">
            <FaGlobe className="hidden h-3.5 w-3.5 shrink-0 text-[#8a847a] sm:block" aria-hidden />
            <label htmlFor="header-language" className="sr-only">
              {t('header.language')}
            </label>
            <select
              id="header-language"
              value={i18n.language?.startsWith('hi') ? 'hi' : 'en'}
              onChange={(e) => {
                void i18n.changeLanguage(e.target.value);
              }}
              className="max-w-[7.5rem] cursor-pointer border-0 bg-transparent py-0.5 pl-1 pr-5 text-sm font-semibold text-[#141210] focus:outline-none focus:ring-2 focus:ring-[#1f3a34]/30 rounded-md dark:text-[#fffcf8] sm:max-w-none"
              aria-label={t('header.language')}
            >
              <option value="en">{t('header.english')}</option>
              <option value="hi">{t('header.hindi')}</option>
            </select>
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="group relative rounded-full p-2.5 text-[#5c574f] transition-colors hover:bg-[#eceae4] hover:text-[#141210] dark:text-[#a8a399] dark:hover:bg-white/10 dark:hover:text-[#fffcf8]"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={t('header.notifications')}
            >
              <FaBell className="h-5 w-5" />
              <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-[#1f3a34] ring-2 ring-[#fffcf8] dark:ring-[#1c1a18]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-[rgba(20,18,16,0.1)] bg-[#fffcf8] shadow-[0_16px_40px_rgba(20,18,16,0.08)] dark:border-white/10 dark:bg-[#1c1a18]">
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FaBell className="h-4 w-4 text-[#1f3a34] dark:text-[#c5c0b6]" />
                      <h3
                        className="text-lg text-[#141210] dark:text-[#fffcf8]"
                        style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600 }}
                      >
                        {t('header.notifications')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-full p-2 text-[#8a847a] transition-colors hover:bg-[#eceae4] hover:text-[#141210] dark:hover:bg-white/10 dark:hover:text-[#fffcf8]"
                    >
                      ×
                    </button>
                  </div>
                  <div className="max-h-48 space-y-3 overflow-y-auto">
                    <div className="rounded-xl border border-[rgba(20,18,16,0.1)] bg-[#f7f6f3] p-4 dark:border-white/10 dark:bg-[#151412]">
                      <p className="text-sm font-semibold text-[#141210] dark:text-[#fffcf8]">{t('header.welcomeTitle')}</p>
                      <p className="mt-1 text-xs text-[#8a847a]">{t('header.welcomeTime')}</p>
                    </div>
                    <div className="rounded-xl border border-[rgba(20,18,16,0.1)] bg-[#f7f6f3] p-4 dark:border-white/10 dark:bg-[#151412]">
                      <div className="flex items-start space-x-3">
                        <FaCrown className="mt-0.5 h-4 w-4 text-[#1f3a34] dark:text-[#c5c0b6]" />
                        <div>
                          <p className="text-sm font-semibold text-[#141210] dark:text-[#fffcf8]">{t('header.verifiedTitle')}</p>
                          <p className="mt-1 text-xs text-[#8a847a]">{t('header.verifiedTime')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="group flex items-center space-x-3 rounded-full p-1.5 pr-2.5 text-[#5c574f] transition-colors hover:bg-[#eceae4] hover:text-[#141210] dark:text-[#a8a399] dark:hover:bg-white/10 dark:hover:text-[#fffcf8] md:pr-3"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141210] text-[#fffcf8] shadow-sm dark:bg-[#fffcf8] dark:text-[#141210]">
                  <span className="text-sm font-semibold">{initials}</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fffcf8] bg-[#1f3a34] dark:border-[#1c1a18]" />
              </div>
              <div className="hidden text-left md:block">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-[#141210] dark:text-[#fffcf8]">
                    {user?.firstName} {user?.lastName}
                  </p>
                  {isAdmin && <FaCrown className="h-3 w-3 text-[#1f3a34] dark:text-[#c5c0b6]" />}
                </div>
                <p className="text-xs text-[#8a847a]">{user?.email}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5c574f] dark:text-[#a8a399]">
                  {user?.accountType}
                </p>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-3 w-[min(31rem,calc(100vw-2rem))] rounded-2xl border border-[rgba(20,18,16,0.1)] bg-[#fffcf8] shadow-[0_16px_40px_rgba(20,18,16,0.08)] dark:border-white/10 dark:bg-[#1c1a18]">
                <div className="p-5">
                  <div className="mb-4 flex items-center space-x-4 rounded-xl border border-[rgba(20,18,16,0.1)] bg-[#f7f6f3] p-4 dark:border-white/10 dark:bg-[#151412]">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#141210] text-[#fffcf8] dark:bg-[#fffcf8] dark:text-[#141210]">
                        <span className="text-sm font-semibold">{initials}</span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#f7f6f3] bg-[#1f3a34] dark:border-[#151412]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="truncate text-sm font-semibold text-[#141210] dark:text-[#fffcf8]">
                          {user?.firstName} {user?.lastName}
                        </p>
                        {isAdmin && <FaCrown className="h-4 w-4 shrink-0 text-[#1f3a34] dark:text-[#c5c0b6]" />}
                      </div>
                      <p className="mt-1 text-xs text-[#8a847a]" style={{ wordBreak: 'break-all' }}>
                        {user?.email}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5c574f] dark:text-[#a8a399]">
                        {user?.accountType}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuOpen(false);
                      }}
                      className="group flex w-full items-center rounded-xl border border-transparent px-4 py-3 text-sm text-[#141210] transition-colors hover:border-[rgba(20,18,16,0.1)] hover:bg-[#eceae4] dark:text-[#fffcf8] dark:hover:bg-white/5"
                    >
                      <FaUser className="mr-3 h-4 w-4 text-[#1f3a34] dark:text-[#c5c0b6]" />
                      <span className="font-semibold">{t('header.profile')}</span>
                    </button>

                    <hr className="my-3 border-[rgba(20,18,16,0.1)] dark:border-white/10" />

                    <button
                      onClick={handleLogout}
                      className="group flex w-full items-center rounded-xl border border-transparent px-4 py-3 text-sm text-[#8a5a2b] transition-colors hover:border-[#8a5a2b]/20 hover:bg-[#8a5a2b]/10 hover:text-[#141210] dark:text-[#c5a07a]"
                    >
                      <FaSignOutAlt className="mr-3 h-4 w-4" />
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
