import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Navigation from '../../components/layout/Navigation';
import Sidebar from '../../components/layout/Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Navigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
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