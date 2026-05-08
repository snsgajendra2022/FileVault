import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ViewImagePage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const getImageUrl = (): string | null => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('u');
    if (!encoded) return null;
    try {
      const decoded = atob(decodeURIComponent(encoded));
      return decoded;
    } catch {
      return null;
    }
  };

  const url = getImageUrl();

  if (!url) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>{t('viewImagePage.invalidLink')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: 16
    }}>
      <img
        src={url}
        alt={t('viewImagePage.imgAlt')}
        style={{
          maxWidth: '100%', maxHeight: '90vh', borderRadius: 12,
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)', background: '#f7fafc'
        }}
      />
    </div>
  );
};

export default ViewImagePage;
