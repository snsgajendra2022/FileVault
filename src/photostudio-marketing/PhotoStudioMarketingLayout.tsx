import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../photostudio-react-tailwind/src/components/Header';
import Footer from '../../photostudio-react-tailwind/src/components/Footer';

function scrollToSectionHash(hash: string) {
  const id = hash.replace(/^#/, '');
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

export default function PhotoStudioMarketingLayout() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const homePath = location.pathname === '/' || location.pathname === '';
    if (!homePath) return;

    let attempts = 0;
    let frameId = 0;

    const tryScroll = () => {
      if (scrollToSectionHash(location.hash)) return;
      if (attempts < 24) {
        attempts += 1;
        frameId = window.requestAnimationFrame(tryScroll);
      }
    };

    frameId = window.requestAnimationFrame(tryScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, location.hash]);

  return (
    <div className="photostudio-marketing flex min-h-screen w-full max-w-none flex-col overflow-x-hidden">
      <Header />
      <main className="w-full min-w-0 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
