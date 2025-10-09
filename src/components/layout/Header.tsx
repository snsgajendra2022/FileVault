// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaBars, FaBell, FaUser, FaCog, FaSignOutAlt, FaStar, FaCrown } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FaRocket } from 'react-icons/fa';

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
  // console.log('Header - User data:', user);
  // console.log('Header - Is admin:', isAdmin);

  return (
    <header className="relative bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200 shadow-xl">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-30"></div>
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-200 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-purple-200 rounded-full opacity-10 blur-3xl"></div>
      
      <div className="relative z-10 flex items-center justify-between h-16 px-6 lg:px-8 xl:px-12">
        {/* Left side - Mobile menu button only */}
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden group relative p-3 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-gray-200 hover:border-blue-300"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="group relative p-3 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-gray-200 hover:border-blue-300"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <FaBell className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 shadow-lg animate-pulse"></span>
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 transform transition-all duration-300 scale-100 opacity-100">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FaBell className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
                    </div>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-300"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-l-4 border-blue-500 shadow-sm">
                      <div className="flex items-start space-x-3">
                        {/* <FaStar className="h-4 w-4 text-blue-600 mt-0.5" /> */}
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Welcome to Portal!</p>
                          <p className="text-xs text-blue-600 mt-1">2 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-l-4 border-green-500 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <FaCrown className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-900">Your account has been verified</p>
                          <p className="text-xs text-green-600 mt-1">1 hour ago</p>
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
              className="group flex items-center space-x-3 p-3 rounded-xl text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-gray-200 hover:border-blue-300"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </span>
                </div>
                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  {isAdmin && <FaCrown className="h-3 w-3 text-purple-600" />}
                </div>
                <p className="text-xs text-gray-600">{user?.email}</p>
                <div className="flex items-center space-x-1">
                  {/* <FaStar className="w-3 h-3 text-blue-500" /> */}
                  <p className="text-xs text-blue-600 font-semibold">{user?.accountType}</p>
                </div>
              </div>
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-[31rem] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 transform transition-all duration-300 scale-100 opacity-100">
                <div className="p-6">
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl mb-4 border border-blue-200">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">
                          {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                        {isAdmin && <FaCrown className="h-4 w-4 text-purple-600" />}
                      </div>
                      <p className="text-xs text-gray-600 mt-1" style={{ wordBreak: 'break-all' }}>{user?.email}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        {/* <FaStar className="w-3 h-3 text-blue-500" /> */}
                        <p className="text-xs text-blue-600 font-semibold">{user?.accountType}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setUserMenuOpen(false);
                      }}
                      className="group flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300 cursor-pointer border border-transparent hover:border-blue-200"
                    >
                      <FaUser className="mr-3 h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-semibold">Profile</span>
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
                    
                    <hr className="my-3 border-gray-200" />
                    
                    <button
                      onClick={handleLogout}
                      className="group flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 rounded-xl transition-all duration-300 border border-transparent hover:border-red-200"
                    >
                      <FaSignOutAlt className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-semibold">Sign out</span>
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
