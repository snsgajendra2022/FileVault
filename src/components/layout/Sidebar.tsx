import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FaCog, FaCrown } from 'react-icons/fa';
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
} from './navConfig';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  const navigationItems = regularNavigation;
  const studioNavigationItems = studioNavigation;
  const adminNavigationItems = adminNavigation;

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

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white via-gray-50 to-gray-100 border-r border-gray-200 shadow-2xl">
        {/* Stunning Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-20 px-4 border-b border-purple-300">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className=" relative z-10 flex items-center h-full">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-gray-100 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-inner">
                    <span className="text-sm font-bold text-white">OM</span>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 blur-sm"></div>
              </div>
              <div className="ml-4">
                {menuFlags.regular === true && navigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.imageSecurity')}</h1>
                )}
                {user?.accountType == 'FREE' && menuFlags.studio === true && studioNavigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.ourMemories')}</h1>
                )}
                {user.accountType == 'ADMIN' && menuFlags.admin === true && adminNavigationItems.active === true && (
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('brand.adminPanel')}</h1>
                )}
                <div className="flex items-center space-x-1">
                  <p className="text-xs text-blue-100 font-medium">{user?.firstName} {user?.lastName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-[#2731db]">
                  <FaCamera className="h-4 w-4 text-[#2731db] mr-2" />
                  <h3 className="text-xs font-bold text-[#2731db] uppercase tracking-wider">
                  Our Memories Pro
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
                        ? 'bg-gradient-to-r from-[#2731db] to-[#2731db] text-white shadow-xl border-r-4 border-[#2731db]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 border-r-4 border-transparent hover:border-[#2731db]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-[#2731db]'}`}>
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

        {/* Footer removed (user chip at bottom of desktop sidebar) */}
      </div>
    </div>
  );
};

export default Sidebar;
