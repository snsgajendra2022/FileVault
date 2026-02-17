import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Navigation from '../../components/layout/Navigation';
import Sidebar from '../../components/layout/Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation - Only visible on mobile */}
      <div className="lg:hidden">
        <Navigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop Sidebar - Only visible on desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 py-6 px-6 lg:px-8 xl:px-8 2xl:px-4">
          <div className="w-full max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
