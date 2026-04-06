import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCamera,
  FaUsers,
  FaImages,
  FaQrcode,
  FaArrowRight,
  FaStar,
  FaCheck
} from 'react-icons/fa';
import './StudioLanding.css';

const StudioLanding: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    { icon: FaUsers, titleKey: 'studioLanding.featClientsTitle' as const, descKey: 'studioLanding.featClientsDesc' as const },
    { icon: FaImages, titleKey: 'studioLanding.featGalleryTitle' as const, descKey: 'studioLanding.featGalleryDesc' as const },
    { icon: FaQrcode, titleKey: 'studioLanding.featBarcodeTitle' as const, descKey: 'studioLanding.featBarcodeDesc' as const },
    { icon: FaCamera, titleKey: 'studioLanding.featPortalTitle' as const, descKey: 'studioLanding.featPortalDesc' as const },
  ];

  const benefitKeys = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const;

  return (
    <div className="studio-landing">
      <div className="landing-container">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <FaStar />
              <span>{t('studioLanding.badge')}</span>
            </div>
            <h1 className="hero-title">
              {t('studioLanding.heroTitle')} <span className="gradient-text">{t('studioLanding.heroPro')}</span>
            </h1>
            <p className="hero-description">
              {t('studioLanding.heroDesc')}
            </p>
            <div className="hero-actions">
              <Link to="/studio/auth" className="cta-btn primary">
                {t('studioLanding.getStarted')}
                <FaArrowRight />
              </Link>
              <Link to="/studio/dashboard" className="cta-btn secondary">
                {t('studioLanding.viewDemo')}
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="image-placeholder">
              <FaCamera />
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="section-header">
            <h2>{t('studioLanding.featuresTitle')}</h2>
            <p>{t('studioLanding.featuresSub')}</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <Icon />
                  </div>
                  <h3>{t(feature.titleKey)}</h3>
                  <p>{t(feature.descKey)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="benefits-section">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>{t('studioLanding.benefitsTitle')}</h2>
              <p>
                {t('studioLanding.benefitsBody')}
              </p>
              <ul className="benefits-list">
                {benefitKeys.map((k) => (
                  <li key={k}>
                    <FaCheck />
                    <span>{t(`studioLanding.${k}`)}</span>
                  </li>
                ))}
              </ul>
              <Link to="/studio/auth" className="cta-btn primary">
                {t('studioLanding.trialCta')}
                <FaArrowRight />
              </Link>
            </div>
            <div className="benefits-image">
              <div className="image-placeholder">
                <FaImages />
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-content">
            <h2>{t('studioLanding.ctaTitle')}</h2>
            <p>{t('studioLanding.ctaSub')}</p>
            <div className="cta-actions">
              <Link to="/studio/auth" className="cta-btn primary large">
                {t('studioLanding.ctaAccount')}
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudioLanding;
