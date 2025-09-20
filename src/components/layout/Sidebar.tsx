import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, 
  FaUpload, 
  FaCog, 
  FaUsers, 
  FaCloud, 
  FaChartBar, 
  FaShieldAlt,
  FaPlus,
  FaUser,
  FaStar,
  FaCrown,
  FaCamera,
  FaImages,
  FaQrcode
} from 'react-icons/fa';

const Sidebar = () => {
  const { user, isAdmin } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FaHome },
    { name: 'Upload', href: '/upload', icon: FaUpload },
    { name: 'My Images', href: '/images', icon: FaUpload },
    { name: 'Services', href: '/services', icon: FaCloud },
    { name: 'Plans', href: '/plans', icon: FaPlus },
    { name: 'Usage', href: '/usage', icon: FaChartBar },
    // { name: 'Billing', href: '/billing', icon: FaPlus },
    // { name: 'Analytics', href: '/analytics', icon: FaPlus },
    { name: 'Invitations', href: '/invitations', icon: FaUsers },
    { name: 'Profile', href: '/profile', icon: FaUser },
    // { name: 'Settings', href: '/settings', icon: FaCog },
  ];

  const studioNavigationItems = [
    { name: 'Studio Dashboard', href: '/studio/dashboard', icon: FaCamera },
    { name: 'Studio Clients', href: '/studio/clients', icon: FaUsers },
    { name: 'Photo Gallery', href: '/studio/gallery', icon: FaImages },
    { name: 'Barcode System', href: '/studio/barcodes', icon: FaQrcode },
    { name: 'Studio Settings', href: '/studio/settings', icon: FaCog },
  ];

  const adminNavigationItems = [
    { name: 'Admin Dashboard', href: '/admin?tab=dashboard', icon: FaShieldAlt },
    { name: 'User Management', href: '/admin?tab=users', icon: FaUsers },
    { name: 'Service Config', href: '/admin?tab=services', icon: FaCloud },
    { name: 'Plan Management', href: '/admin?tab=plans', icon: FaPlus },
    { name: 'Usage Analytics', href: '/admin?tab=analytics', icon: FaChartBar },
    { name: 'System Health', href: '/admin?tab=health', icon: FaShieldAlt },
  ];

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white via-gray-50 to-gray-100 border-r border-gray-200 shadow-2xl">
        {/* Stunning Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-20 px-4 border-b border-purple-300">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10 flex items-center h-full">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-gray-100 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-inner">
                    <span className="text-sm font-bold text-white">IS</span>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 opacity-20 blur-sm"></div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-white drop-shadow-lg">ImageSecurity</h1>
                <div className="flex items-center space-x-1">
                  <FaStar className="w-3 h-3 text-yellow-300" />
                  <p className="text-xs text-blue-100 font-medium">Premium Portal</p>
                  <FaStar className="w-3 h-3 text-yellow-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* Regular Navigation - Show for all users */}
          {!isAdmin && (
            <>
              {navigationItems.map((item) => (
            <NavLink
              key={item.name}
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
                  <span className="font-semibold">{item.name}</span>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                </>
              )}
            </NavLink>
              ))}
              
              {/* Studio Section */}
              <div className="pt-6 pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                  <FaCamera className="h-4 w-4 text-pink-600 mr-2" />
                  <h3 className="text-xs font-bold text-pink-700 uppercase tracking-wider">
                    PhotoStudio Pro
                  </h3>
                </div>
              </div>
              
              {studioNavigationItems.map((item) => (
                <NavLink
                  key={item.name}
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
                      <span className="font-semibold">{item.name}</span>
                      
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {/* Admin Navigation - Only show for ADMIN users */}
          { isAdmin && (
            <>
              <div className="pt-4 pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <FaCrown className="h-4 w-4 text-purple-600 mr-2" />
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Admin Panel
                  </h3>
                </div>
              </div>
              {adminNavigationItems.map((item) => (
                <NavLink
                  key={item.name}
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
                      <span className="font-semibold">{item.name}</span>
                      
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Enhanced Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-200">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {user?.username?.charAt(0) || 'U'}
                  </span>
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
                              <div className="flex items-center space-x-1">
                <FaStar className="w-3 h-3 text-blue-500" />
                <p className="text-xs text-blue-600 font-medium">{user?.accountType || 'User'}</p>
              </div>
              </div>
              {/* <div className="flex items-center space-x-1">
                <FaStar className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-500 font-medium">Online</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
