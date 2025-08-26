// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaBars, FaBell, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const { user, logout, isAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    // Navigate to login page after logout
    navigate('/login', { replace: true });
  };

  // Debug: Log user data
  console.log('Header - User data:', user);
  console.log('Header - Is admin:', isAdmin);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6 lg:px-8 xl:px-12">
        {/* Left side - Mobile menu button only */}
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars className="h-5 w-5" />
          </button>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <FaBell className="h-4 w-4" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-blue-900">Welcome to ImageSecurity Portal!</p>
                      <p className="text-xs text-blue-600 mt-1">2 minutes ago</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md border-l-4 border-gray-400">
                      <p className="text-sm font-medium text-gray-900">Your account has been verified</p>
                      <p className="text-xs text-gray-600 mt-1">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-2 p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <p className="text-xs text-blue-600">{user?.accountType}</p>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3">
                  <div className="flex items-center space-x-3 p-1 bg-gray-50 rounded-md mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-600">{user?.email}</p>
                      <p className="text-xs text-blue-600 font-medium">{user?.accountType}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                      <FaUser className="mr-3 h-4 w-4" />
                      Profile
                    </button>
                    
                    <button
                        onClick={() => {
                          navigate('/settings');
                          setUserMenuOpen(false);
                        }}
                      className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <FaCog className="mr-3 h-4 w-4" />
                      Settings
                    </button>
                    
                    <hr className="my-2 border-gray-200" />
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <FaSignOutAlt className="mr-3 h-4 w-4" />
                      Sign out
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
