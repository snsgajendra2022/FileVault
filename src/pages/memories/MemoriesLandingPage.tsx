import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaImages, FaQrcode, FaShieldAlt, FaStar } from 'react-icons/fa';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omBadge,
  omCtaSolid,
  omFeatureCard,
  omGradientBtn,
  omHeading,
  omHeroTitle,
  omLead,
  omMuted,
  omNavLink,
  omOutlineBtn,
} from '../../components/auth/publicMemoriesTheme';

/** Public marketing landing — no auth required. */
const MemoriesLandingPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });

  return (
    <PublicMemoriesShell
      mainClassName="relative z-10 mx-auto max-w-6xl px-4 pb-0 pt-16 sm:px-6 sm:pt-24"
      headerActions={
        <>
          <Link to="/login" state={{ from: '/memories/events' }} className={omNavLink}>
            {t('signIn')}
          </Link>
          <Link to="/register" className={omCtaSolid}>
            {t('getStarted')}
          </Link>
        </>
      }
    >
      <p className={`mb-4 ${omBadge}`}>
        <FaStar className="h-3 w-3 text-amber-500 dark:text-amber-300" />
        {t('badge')}
      </p>
      <h1 className={`max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl ${omHeroTitle}`}>
        {t('heroTitle')}
      </h1>
      <p className={`mt-6 max-w-xl text-lg leading-relaxed ${omLead}`}>{t('heroSubtitle')}</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link to="/login" state={{ from: '/memories/events' }} className={omGradientBtn}>
          {t('ctaPhotographer')} <FaArrowRight className="h-4 w-4" />
        </Link>
        <a href="#features" className={omOutlineBtn}>
          {t('ctaLearn')}
        </a>
      </div>

      <section id="features" className="mt-28 grid gap-6 sm:grid-cols-3">
        {[
          { icon: FaQrcode, title: t('featQrTitle'), body: t('featQrBody') },
          { icon: FaImages, title: t('featGalleryTitle'), body: t('featGalleryBody') },
          { icon: FaShieldAlt, title: t('featPrivacyTitle'), body: t('featPrivacyBody') },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className={omFeatureCard}>
            <Icon className="h-8 w-8 text-violet-600 dark:text-violet-400 mb-4" />
            <h3 className={`text-lg font-bold ${omHeading}`}>{title}</h3>
            <p className={`mt-2 text-sm leading-relaxed ${omLead}`}>{body}</p>
          </div>
        ))}
      </section>

      <p className={`mt-16 text-center text-xs max-w-2xl mx-auto leading-relaxed ${omMuted}`}>{t('demoNote')}</p>
    </PublicMemoriesShell>
  );
};

export default MemoriesLandingPage;
