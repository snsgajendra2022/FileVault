import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../photostudio-react-tailwind/src/components/Header';
import Footer from '../../photostudio-react-tailwind/src/components/Footer';

export default function PhotoStudioMarketingLayout() {
  return (
    <div className="photostudio-marketing min-h-screen">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
