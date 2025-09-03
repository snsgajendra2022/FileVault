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
  FaTimes,
  FaUser
} from 'react-icons/fa';

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navigation = ({ isOpen, onClose }: NavigationProps) => {
  const { user, isAdmin } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FaHome },
    { name: 'Upload', href: '/upload', icon: FaUpload },
    { name: 'My Images', href: '/images', icon: FaUpload },
    { name: 'Services', href: '/services', icon: FaCloud },
    { name: 'Plans', href: '/plans', icon: FaPlus },
    { name: 'Usage', href: '/usage', icon: FaChartBar },
    { name: 'Billing', href: '/billing', icon: FaPlus },
    { name: 'Analytics', href: '/analytics', icon: FaChartBar },
    { name: 'Profile', href: '/profile', icon: FaUser },
    { name: 'Settings', href: '/settings', icon: FaCog },
  ];

  const adminNavigationItems = [
    { name: 'Admin Dashboard', href: '/admin', icon: FaShieldAlt },
    { name: 'User Management', href: '/admin?tab=users', icon: FaUsers },
    { name: 'Service Config', href: '/admin?tab=services', icon: FaCloud },
    { name: 'Plan Management', href: '/admin?tab=plans', icon: FaPlus },
    { name: 'Usage Analytics', href: '/admin?tab=analytics', icon: FaChartBar },
    { name: 'System Health', href: '/admin?tab=health', icon: FaShieldAlt },
  ];

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
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">IS</span>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">ImageSecurity</h1>
              <p className="text-xs text-gray-500">Portal</p>
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
          {/* Regular Navigation - Show for all users */}
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.name}
            </NavLink>
          ))}

          {/* Admin Navigation - Only show for ADMIN users */}
          {isAdmin && (
            <>
              <div className="pt-6 pb-2">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin Panel
                </h3>
              </div>
              {adminNavigationItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 border-r-2 border-purple-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-gray-300 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-700">
                {user?.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-900">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.accountType || 'User'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
