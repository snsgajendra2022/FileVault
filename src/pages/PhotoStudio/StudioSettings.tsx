import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  FaCog, 
  FaUser, 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaCamera,
  FaSave,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaTimes,
  FaCheck,
  FaArrowLeft,
  FaShieldAlt,
  FaBell,
  FaPalette,
  FaGlobe,
  FaCreditCard,
  FaKey,
  FaTrash
} from 'react-icons/fa';
import './StudioSettings.css';

interface StudioProfile {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  logo?: string;
  coverImage?: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  currency: string;
  language: string;
  createdAt: string;
  lastUpdated: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  newClientAlerts: boolean;
  sessionReminders: boolean;
  paymentAlerts: boolean;
  systemUpdates: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  loginAlerts: boolean;
  apiAccess: boolean;
}

const StudioSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [studioProfile, setStudioProfile] = useState<StudioProfile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    newClientAlerts: true,
    sessionReminders: true,
    paymentAlerts: true,
    systemUpdates: true
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAlerts: true,
    apiAccess: false
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchStudioData();
  }, []);

  const fetchStudioData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockProfile: StudioProfile = {
        id: '1',
        name: 'Elite Photo Book',
        ownerName: 'John Smith',
        email: 'john@elitephoto.com',
        phone: '+1 (555) 123-4567',
        address: '123 Photography Lane, New York, NY 10001',
        website: 'https://elitephoto.com',
        description: 'Professional photo book specializing in portraits, weddings, and corporate events.',
        logo: '/api/logo/1',
        coverImage: '/api/cover/1',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        timezone: 'America/New_York',
        currency: 'USD',
        language: 'en',
        createdAt: '2024-01-15',
        lastUpdated: '2024-09-12'
      };

      setStudioProfile(mockProfile);
    } catch (error) {
      console.error('Error fetching studio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<StudioProfile>) => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStudioProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async (updatedSettings: Partial<NotificationSettings>) => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotificationSettings(prev => ({ ...prev, ...updatedSettings }));
    } catch (error) {
      console.error('Error updating notifications:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSecurityUpdate = async (updatedSettings: Partial<SecuritySettings>) => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSecuritySettings(prev => ({ ...prev, ...updatedSettings }));
    } catch (error) {
      console.error('Error updating security:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('studioSettings.alertPasswordMismatch'));
      return;
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert(t('studioSettings.alertPasswordUpdated'));
    } catch (error) {
      console.error('Error updating password:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudio = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Redirect to home or show success message
      alert(t('studioSettings.alertAccountDeleted'));
    } catch (error) {
      console.error('Error deleting studio:', error);
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'profile', label: t('studioSettings.tabProfile'), icon: FaUser },
      { id: 'notifications', label: t('studioSettings.tabNotifications'), icon: FaBell },
      { id: 'security', label: t('studioSettings.tabSecurity'), icon: FaShieldAlt },
      { id: 'appearance', label: t('studioSettings.tabAppearance'), icon: FaPalette },
      { id: 'billing', label: t('studioSettings.tabBilling'), icon: FaCreditCard },
      { id: 'danger', label: t('studioSettings.tabDanger'), icon: FaTrash },
    ],
    [t]
  );

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>{t('studioSettings.loading')}</p>
      </div>
    );
  }

  return (
    <div className="studio-settings">
      {/* Header */}
      <header className="settings-header">
        <div className="header-left">
          <Link to="/studio/dashboard" className="back-link">
            <FaArrowLeft />
            {t('studioSettings.dashboard')}
          </Link>
          <div className="page-title">
            <FaCog className="title-icon" />
            <h1>{t('studioSettings.pageTitle')}</h1>
          </div>
        </div>
        {saving && (
          <div className="saving-indicator">
            <div className="spinner"></div>
            <span>{t('studioSettings.saving')}</span>
          </div>
        )}
      </header>

      <div className="settings-container">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && studioProfile && (
            <div className="settings-section">
              <div className="section-header">
                <h2>{t('studioSettings.profileSectionTitle')}</h2>
                <p>{t('studioSettings.profileSectionSubtitle')}</p>
              </div>

              <div className="profile-form">
                <div className="form-section">
                  <h3>{t('studioSettings.basicInformation')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('studioSettings.photoBookName')}</label>
                      <input
                        type="text"
                        value={studioProfile.name}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.ownerName')}</label>
                      <input
                        type="text"
                        value={studioProfile.ownerName}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, ownerName: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.email')}</label>
                      <input
                        type="email"
                        value={studioProfile.email}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.phone')}</label>
                      <input
                        type="tel"
                        value={studioProfile.phone}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('studioSettings.address')}</label>
                      <input
                        type="text"
                        value={studioProfile.address}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.website')}</label>
                      <input
                        type="url"
                        value={studioProfile.website}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('studioSettings.description')}</label>
                      <textarea
                        value={studioProfile.description}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, description: e.target.value } : null)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>{t('studioSettings.branding')}</h3>
                  <div className="branding-section">
                    <div className="logo-upload">
                      <div className="logo-preview">
                        {studioProfile.logo ? (
                          <img src={studioProfile.logo} alt={t('studioSettings.logoAlt')} />
                        ) : (
                          <FaCamera />
                        )}
                      </div>
                      <button className="upload-btn">
                        <FaUpload />
                        {t('studioSettings.uploadLogo')}
                      </button>
                    </div>
                    <div className="color-settings">
                      <div className="color-group">
                        <label>{t('studioSettings.primaryColor')}</label>
                        <div className="color-input">
                          <input
                            type="color"
                            value={studioProfile.primaryColor}
                            onChange={(e) => setStudioProfile(prev => prev ? { ...prev, primaryColor: e.target.value } : null)}
                          />
                          <span>{studioProfile.primaryColor}</span>
                        </div>
                      </div>
                      <div className="color-group">
                        <label>{t('studioSettings.secondaryColor')}</label>
                        <div className="color-input">
                          <input
                            type="color"
                            value={studioProfile.secondaryColor}
                            onChange={(e) => setStudioProfile(prev => prev ? { ...prev, secondaryColor: e.target.value } : null)}
                          />
                          <span>{studioProfile.secondaryColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>{t('studioSettings.regionalSettings')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('studioSettings.timezone')}</label>
                      <select
                        value={studioProfile.timezone}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, timezone: e.target.value } : null)}
                      >
                        <option value="America/New_York">{t('studioSettings.easternTime')}</option>
                        <option value="America/Chicago">{t('studioSettings.centralTime')}</option>
                        <option value="America/Denver">{t('studioSettings.mountainTime')}</option>
                        <option value="America/Los_Angeles">{t('studioSettings.pacificTime')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.currency')}</label>
                      <select
                        value={studioProfile.currency}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, currency: e.target.value } : null)}
                      >
                        <option value="USD">{t('studioSettings.usd')}</option>
                        <option value="EUR">{t('studioSettings.eur')}</option>
                        <option value="GBP">{t('studioSettings.gbp')}</option>
                        <option value="CAD">{t('studioSettings.cad')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('studioSettings.language')}</label>
                      <select
                        value={studioProfile.language}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, language: e.target.value } : null)}
                      >
                        <option value="en">{t('studioSettings.english')}</option>
                        <option value="es">{t('studioSettings.spanish')}</option>
                        <option value="fr">{t('studioSettings.french')}</option>
                        <option value="de">{t('studioSettings.german')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="save-btn"
                    onClick={() => handleProfileUpdate(studioProfile)}
                    disabled={saving}
                  >
                    <FaSave />
                    {t('studioSettings.saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>{t('studioSettings.notificationSettings')}</h2>
                <p>{t('studioSettings.notificationSubtitle')}</p>
              </div>

              <div className="notification-settings">
                <div className="setting-group">
                  <h3>{t('studioSettings.communicationPreferences')}</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.emailNotifications')}</h4>
                      <p>{t('studioSettings.emailNotificationsDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => handleNotificationUpdate({ emailNotifications: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.smsNotifications')}</h4>
                      <p>{t('studioSettings.smsNotificationsDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.smsNotifications}
                        onChange={(e) => handleNotificationUpdate({ smsNotifications: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="setting-group">
                  <h3>{t('studioSettings.alertTypes')}</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.newClientAlerts')}</h4>
                      <p>{t('studioSettings.newClientAlertsDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.newClientAlerts}
                        onChange={(e) => handleNotificationUpdate({ newClientAlerts: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.sessionReminders')}</h4>
                      <p>{t('studioSettings.sessionRemindersDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.sessionReminders}
                        onChange={(e) => handleNotificationUpdate({ sessionReminders: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.paymentAlerts')}</h4>
                      <p>{t('studioSettings.paymentAlertsDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.paymentAlerts}
                        onChange={(e) => handleNotificationUpdate({ paymentAlerts: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.systemUpdates')}</h4>
                      <p>{t('studioSettings.systemUpdatesDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.systemUpdates}
                        onChange={(e) => handleNotificationUpdate({ systemUpdates: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>{t('studioSettings.securitySettings')}</h2>
                <p>{t('studioSettings.securitySubtitle')}</p>
              </div>

              <div className="security-settings">
                <div className="setting-group">
                  <h3>{t('studioSettings.authentication')}</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.twoFactor')}</h4>
                      <p>{t('studioSettings.twoFactorDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => handleSecurityUpdate({ twoFactorAuth: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.loginAlerts')}</h4>
                      <p>{t('studioSettings.loginAlertsDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.loginAlerts}
                        onChange={(e) => handleSecurityUpdate({ loginAlerts: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="setting-group">
                  <h3>{t('studioSettings.sessionManagement')}</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.sessionTimeout')}</h4>
                      <p>{t('studioSettings.sessionTimeoutDesc')}</p>
                    </div>
                    <select
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => handleSecurityUpdate({ sessionTimeout: parseInt(e.target.value) })}
                    >
                      <option value={15}>{t('studioSettings.min15')}</option>
                      <option value={30}>{t('studioSettings.min30')}</option>
                      <option value={60}>{t('studioSettings.hour1')}</option>
                      <option value={120}>{t('studioSettings.hours2')}</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.passwordExpiry')}</h4>
                      <p>{t('studioSettings.passwordExpiryDesc')}</p>
                    </div>
                    <select
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => handleSecurityUpdate({ passwordExpiry: parseInt(e.target.value) })}
                    >
                      <option value={30}>{t('studioSettings.days30')}</option>
                      <option value={60}>{t('studioSettings.days60')}</option>
                      <option value={90}>{t('studioSettings.days90')}</option>
                      <option value={180}>{t('studioSettings.days180')}</option>
                    </select>
                  </div>
                </div>

                <div className="setting-group">
                  <h3>{t('studioSettings.apiAccess')}</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>{t('studioSettings.apiAccess')}</h4>
                      <p>{t('studioSettings.apiAccessDesc')}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.apiAccess}
                        onChange={(e) => handleSecurityUpdate({ apiAccess: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                <div className="security-actions">
                  <button 
                    className="action-btn change-password"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <FaKey />
                    {t('studioSettings.changePassword')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>{t('studioSettings.dangerZone')}</h2>
                <p>{t('studioSettings.dangerSubtitle')}</p>
              </div>

              <div className="danger-zone">
                <div className="danger-item">
                  <div className="danger-info">
                    <h3>{t('studioSettings.deleteAccountTitle')}</h3>
                    <p>{t('studioSettings.deleteAccountDesc')}</p>
                  </div>
                  <button 
                    className="danger-btn"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <FaTrash />
                    {t('studioSettings.deleteAccount')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('studioSettings.changePasswordTitle')}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="password-form">
              <div className="form-group">
                <label>{t('studioSettings.currentPassword')}</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t('studioSettings.newPassword')}</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>{t('studioSettings.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowPasswordModal(false)}
                >
                  {t('studioSettings.cancel')}
                </button>
                <button 
                  className="save-btn"
                  onClick={handlePasswordChange}
                  disabled={saving}
                >
                  {saving ? t('studioSettings.updating') : t('studioSettings.updatePassword')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2>{t('studioSettings.deleteModalTitle')}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="delete-warning">
              <div className="warning-icon">
                <FaTrash />
              </div>
              <h3>{t('studioSettings.deleteConfirmTitle')}</h3>
              <p>{t('studioSettings.deleteConfirmBody')}</p>
              <div className="confirmation-input">
                <label>{t('studioSettings.typeDeleteConfirm')}</label>
                <input type="text" placeholder={t('studioSettings.deletePlaceholder')} />
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t('studioSettings.cancel')}
                </button>
                <button 
                  className="danger-btn"
                  onClick={handleDeleteStudio}
                  disabled={saving}
                >
                  {saving ? t('studioSettings.deleting') : t('studioSettings.deleteAccount')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioSettings;
