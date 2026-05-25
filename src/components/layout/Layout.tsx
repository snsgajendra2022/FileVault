import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Navigation from '../../components/layout/Navigation';
import Sidebar from '../../components/layout/Sidebar';
import { syncDocumentThemeFromStorage } from '../../utils/documentTheme';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    syncDocumentThemeFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'filevault-theme') syncDocumentThemeFromStorage();
    };
    const onTheme = () => {
      syncDocumentThemeFromStorage();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('filevault-theme', onTheme);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('filevault-theme', onTheme);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Navigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-[240px] min-h-screen flex flex-col">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 p-2 lg:p-3">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;