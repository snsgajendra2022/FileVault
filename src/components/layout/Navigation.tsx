import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FaTimes, FaCrown } from 'react-icons/fa';
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
} from './navConfig';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navigation = ({ isOpen, onClose }: NavigationProps) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  // Runtime menu visibility flags
  // Priority order: window.__MENU_FLAGS__ > localStorage('MENU_FLAGS') > defaults
  const menuFlags = React.useMemo(() => {
    const defaults = { regular: true, studio: true, admin: isAdmin } as {
      regular: boolean; studio: boolean; admin: boolean;
    };
    try {
      // @ts-ignore - allow external runtime flags
      const winFlags = typeof window !== 'undefined' ? (window.__MENU_FLAGS__ as any) : undefined;
      if (winFlags && typeof winFlags === 'object') {
        return { ...defaults, ...winFlags };
      }
      const raw = typeof window !== 'undefined' ? localStorage.getItem('MENU_FLAGS') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return { ...defaults, ...parsed };
      }
    } catch (_) {
      // ignore parsing errors and fall back to defaults
    }
    return defaults;
  }, [isAdmin]);

  const navigationItems = regularNavigation;
  const studioNavigationItems = studioNavigation;
  const adminNavigationItems = adminNavigation;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Navigation Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="bg-gradient-to-r from-indigo-600  to-pink-600 via-purple-600 flex items-center justify-between h-16 px-4 border-b border-gray-200">
       
          <div className=" flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-gray-100 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-inner">
                    <span className="text-sm font-bold text-white">PS</span>
                  </div>
                </div>
            <div className="ml-4">
                {menuFlags.regular === true && navigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.imageSecurity')}</h1>
                )}
                {user?.accountType == 'FREE' && menuFlags.studio === true && studioNavigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.photoBook')}</h1>
                )}
                {user.accountType == 'ADMIN' && menuFlags.admin === true && adminNavigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.adminPanel')}</h1>
                )}
                <div className="flex items-center space-x-1">
                  <p className="text-xs text-blue-100 font-medium">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {/* Regular Navigation - Show for non-admin users (controlled by flags) */}
          {!isAdmin && menuFlags.regular  && (
            <>
              {navigationItems.active === true && navigationItems.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                    isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl border-r-4 border-blue-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-r-4 border-transparent hover:border-gray-200'
                  }`
                }
                >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                    )}
                    
                    <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="font-semibold">{t(item.labelKey)}</span>
                    
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                  </>
                )}
              </NavLink>
                ))}
              
              {/* Photo Book Section */}
              {/* {menuFlags.studio === true && studioNavigationItems.active === true
               &&  
              <div className=" pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                  <FaCamera className="h-4 w-4 text-pink-600 mr-2" />
                  <h3 className="text-xs font-bold text-pink-700 uppercase tracking-wider">
                    Photo Book Pro
                  </h3>
                </div>
              </div>
              } */}
              
              {menuFlags.studio === true && studioNavigationItems.active === true
               && 
               studioNavigationItems.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-xl border-r-4 border-pink-400'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 border-r-4 border-transparent hover:border-pink-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-pink-700'}`}>
                        <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="font-semibold">{t(item.labelKey)}</span>
                      
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {/* Admin Navigation - Only show for ADMIN users (controlled by flags) */}
          { isAdmin && menuFlags.admin && (
            <>
              <div className="pt-4 pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <FaCrown className="h-4 w-4 text-purple-600 mr-2" />
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                    {t('brand.adminSection')}
                  </h3>
                </div>
              </div>
              {adminNavigationItems.active === true && adminNavigationItems.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl border-r-4 border-purple-400'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 border-r-4 border-transparent hover:border-purple-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-purple-700'}`}>
                        <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="font-semibold">{t(item.labelKey)}</span>
                      
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer removed (user chip at bottom of mobile nav) */}
      </div>
    </>
  );
};

export default Navigation;
