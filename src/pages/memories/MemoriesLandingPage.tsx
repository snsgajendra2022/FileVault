import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaImages, FaQrcode, FaShieldAlt, FaStar } from 'react-icons/fa';

/** Public marketing landing — no auth required. */
const MemoriesLandingPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 selection:bg-violet-500/40">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[90px]" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-violet-300/90">Our Memories</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              state={{ from: '/memories/events' }}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              {t('signIn')}
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {t('getStarted')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-0 pt-16 sm:px-6 sm:pt-24">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200/90">
          <FaStar className="h-3 w-3 text-amber-300" />
          {t('badge')}
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {t('heroTitle')}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-400 leading-relaxed">{t('heroSubtitle')}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/login"
            state={{ from: '/memories/events' }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity"
          >
            {t('ctaPhotographer')} <FaArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            {t('ctaLearn')}
          </a>
        </div>

        <section id="features" className="mt-28 grid gap-6 sm:grid-cols-3">
          {[
            { icon: FaQrcode, title: t('featQrTitle'), body: t('featQrBody') },
            { icon: FaImages, title: t('featGalleryTitle'), body: t('featGalleryBody') },
            { icon: FaShieldAlt, title: t('featPrivacyTitle'), body: t('featPrivacyBody') },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm hover:border-violet-500/30 transition-colors"
            >
              <Icon className="h-8 w-8 text-violet-400 mb-4" />
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        <p className="mt-16 text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">{t('demoNote')}</p>
      </main>
    </div>
  );
};

export default MemoriesLandingPage;
