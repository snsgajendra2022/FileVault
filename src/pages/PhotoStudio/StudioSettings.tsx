import React, { useState, useEffect } from 'react';
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
        name: 'Elite Photography Studio',
        ownerName: 'John Smith',
        email: 'john@elitephoto.com',
        phone: '+1 (555) 123-4567',
        address: '123 Photography Lane, New York, NY 10001',
        website: 'https://elitephoto.com',
        description: 'Professional photography studio specializing in portraits, weddings, and corporate events.',
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
      alert('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password updated successfully');
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
      alert('Studio account deleted successfully');
    } catch (error) {
      console.error('Error deleting studio:', error);
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'appearance', label: 'Appearance', icon: FaPalette },
    { id: 'billing', label: 'Billing', icon: FaCreditCard },
    { id: 'danger', label: 'Danger Zone', icon: FaTrash }
  ];

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
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
            Dashboard
          </Link>
          <div className="page-title">
            <FaCog className="title-icon" />
            <h1>Studio Settings</h1>
          </div>
        </div>
        {saving && (
          <div className="saving-indicator">
            <div className="spinner"></div>
            <span>Saving...</span>
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
                <h2>Studio Profile</h2>
                <p>Manage your studio information and branding</p>
              </div>

              <div className="profile-form">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Studio Name</label>
                      <input
                        type="text"
                        value={studioProfile.name}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Owner Name</label>
                      <input
                        type="text"
                        value={studioProfile.ownerName}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, ownerName: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={studioProfile.email}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={studioProfile.phone}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <input
                        type="text"
                        value={studioProfile.address}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, address: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Website</label>
                      <input
                        type="url"
                        value={studioProfile.website}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={studioProfile.description}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, description: e.target.value } : null)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Branding</h3>
                  <div className="branding-section">
                    <div className="logo-upload">
                      <div className="logo-preview">
                        {studioProfile.logo ? (
                          <img src={studioProfile.logo} alt="Studio Logo" />
                        ) : (
                          <FaCamera />
                        )}
                      </div>
                      <button className="upload-btn">
                        <FaUpload />
                        Upload Logo
                      </button>
                    </div>
                    <div className="color-settings">
                      <div className="color-group">
                        <label>Primary Color</label>
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
                        <label>Secondary Color</label>
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
                  <h3>Regional Settings</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Timezone</label>
                      <select
                        value={studioProfile.timezone}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, timezone: e.target.value } : null)}
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Currency</label>
                      <select
                        value={studioProfile.currency}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, currency: e.target.value } : null)}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={studioProfile.language}
                        onChange={(e) => setStudioProfile(prev => prev ? { ...prev, language: e.target.value } : null)}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
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
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Settings</h2>
                <p>Configure how you receive notifications</p>
              </div>

              <div className="notification-settings">
                <div className="setting-group">
                  <h3>Communication Preferences</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Email Notifications</h4>
                      <p>Receive notifications via email</p>
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
                      <h4>SMS Notifications</h4>
                      <p>Receive notifications via text message</p>
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
                  <h3>Alert Types</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>New Client Alerts</h4>
                      <p>Get notified when new clients register</p>
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
                      <h4>Session Reminders</h4>
                      <p>Receive reminders for upcoming sessions</p>
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
                      <h4>Payment Alerts</h4>
                      <p>Get notified about payment status</p>
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
                      <h4>System Updates</h4>
                      <p>Receive updates about system maintenance</p>
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
                <h2>Security Settings</h2>
                <p>Manage your account security and privacy</p>
              </div>

              <div className="security-settings">
                <div className="setting-group">
                  <h3>Authentication</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account</p>
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
                      <h4>Login Alerts</h4>
                      <p>Get notified of new login attempts</p>
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
                  <h3>Session Management</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Session Timeout</h4>
                      <p>Automatically log out after inactivity (minutes)</p>
                    </div>
                    <select
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => handleSecurityUpdate({ sessionTimeout: parseInt(e.target.value) })}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Password Expiry</h4>
                      <p>Require password change after (days)</p>
                    </div>
                    <select
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => handleSecurityUpdate({ passwordExpiry: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                    </select>
                  </div>
                </div>

                <div className="setting-group">
                  <h3>API Access</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>API Access</h4>
                      <p>Allow third-party applications to access your data</p>
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
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Danger Zone</h2>
                <p>Irreversible and destructive actions</p>
              </div>

              <div className="danger-zone">
                <div className="danger-item">
                  <div className="danger-info">
                    <h3>Delete Studio Account</h3>
                    <p>Permanently delete your studio account and all associated data. This action cannot be undone.</p>
                  </div>
                  <button 
                    className="danger-btn"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <FaTrash />
                    Delete Account
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
              <h2>Change Password</h2>
              <button 
                className="close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="password-form">
              <div className="form-group">
                <label>Current Password</label>
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
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
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
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={handlePasswordChange}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update Password'}
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
              <h2>Delete Studio Account</h2>
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
              <h3>Are you absolutely sure?</h3>
              <p>This action cannot be undone. This will permanently delete your studio account and remove all data from our servers.</p>
              <div className="confirmation-input">
                <label>Type "DELETE" to confirm:</label>
                <input type="text" placeholder="DELETE" />
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="danger-btn"
                  onClick={handleDeleteStudio}
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : 'Delete Account'}
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
