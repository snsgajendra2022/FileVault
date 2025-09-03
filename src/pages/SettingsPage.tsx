import React, { useState } from 'react';
import { FaBell, FaShieldAlt, FaSave, FaCog, FaLock, FaEye, FaEyeSlash, FaUpload, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'light',
    fontSize: 'medium',
    language: 'en',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    marketingEmails: true,
    
    // Privacy
    profileVisibility: 'public',
    dataSharing: false,
    analytics: true,
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    
    // File Upload
    maxFileSize: 10,
    allowedFileTypes: 'jpg,png,pdf,doc',
    autoCompress: true
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      // Here you would typically save to API
      console.log('Saving settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Settings saved successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    setSettings({
      theme: 'light',
      fontSize: 'medium',
      language: 'en',
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      marketingEmails: true,
      profileVisibility: 'public',
      dataSharing: false,
      analytics: true,
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      maxFileSize: 10,
      allowedFileTypes: 'jpg,png,pdf,doc',
      autoCompress: true
    });
    toast.success('Settings reset to default');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Settings
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Configure your application preferences and customize your experience
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-6 mb-8">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
        >
          <FaCog className="h-5 w-5" />
          <span>{isEditing ? 'Cancel Editing' : 'Edit Settings'}</span>
        </button>
        
        {isEditing && (
          <>
            <button
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
            >
              <FaSave className="h-5 w-5" />
              <span>Save Settings</span>
            </button>
            
            <button
              onClick={handleResetSettings}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
            >
              <FaCog className="h-5 w-5" />
              <span>Reset to Default</span>
            </button>
          </>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Appearance Settings */}
        <div className="bg-white rounded-3xl shadow-xl border border-blue-100 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaCog className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Appearance</h2>
          </div>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="bg-gray-50 rounded-xl p-6 border border-blue-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Theme</label>
              <select
                disabled={!isEditing}
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 text-base"
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="bg-gray-50 rounded-xl p-6 border border-blue-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Font Size</label>
              <select
                disabled={!isEditing}
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 text-base"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>

            {/* Language */}
            <div className="bg-gray-50 rounded-xl p-6 border border-blue-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Language</label>
              <select
                disabled={!isEditing}
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 text-base"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-3xl shadow-xl border border-green-100 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaBell className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive push notifications' },
              { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Receive SMS notifications' },
              { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Receive marketing updates' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="bg-gray-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-800 font-medium">{label}</h3>
                    <p className="text-gray-600 text-sm">{desc}</p>
                  </div>
                  <button
                    disabled={!isEditing}
                    onClick={() => handleSettingChange(key, !settings[key as keyof typeof settings])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[key as keyof typeof settings] ? 'bg-green-600' : 'bg-gray-400'
                    } ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaLock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Privacy</h2>
          </div>
          
          <div className="space-y-6">
            {/* Profile Visibility */}
            <div className="bg-gray-50 rounded-xl p-6 border border-purple-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Profile Visibility</label>
              <select
                disabled={!isEditing}
                value={settings.profileVisibility}
                onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-base"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>

            {/* Data Sharing */}
            <div className="bg-gray-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-800 font-medium">Data Sharing</h3>
                  <p className="text-gray-600 text-sm">Allow data sharing with third parties</p>
                </div>
                <button
                  disabled={!isEditing}
                  onClick={() => handleSettingChange('dataSharing', !settings.dataSharing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.dataSharing ? 'bg-green-600' : 'bg-gray-400'
                  } ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.dataSharing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-gray-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-800 font-medium">Analytics</h3>
                  <p className="text-gray-600 text-sm">Help improve the app with analytics</p>
                </div>
                <button
                  disabled={!isEditing}
                  onClick={() => handleSettingChange('analytics', !settings.analytics)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.analytics ? 'bg-green-600' : 'bg-gray-400'
                  } ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.analytics ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaShieldAlt className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Security</h2>
          </div>
          
          <div className="space-y-6">
            {/* Two Factor Authentication */}
            <div className="bg-gray-50 rounded-xl p-6 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-800 font-medium">Two-Factor Authentication</h3>
                  <p className="text-gray-600 text-sm">Add an extra layer of security</p>
                </div>
                <button
                  disabled={!isEditing}
                  onClick={() => handleSettingChange('twoFactorAuth', !settings.twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.twoFactorAuth ? 'bg-green-600' : 'bg-gray-400'
                  } ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="bg-gray-50 rounded-xl p-6 border border-red-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Session Timeout (minutes)</label>
              <input
                type="range"
                min="5"
                max="120"
                disabled={!isEditing}
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>5 min</span>
                <span className="font-medium">{settings.sessionTimeout} min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Password Expiry */}
            <div className="bg-gray-50 rounded-xl p-6 border border-red-100">
              <label className="block text-base font-semibold text-gray-800 mb-3">Password Expiry (days)</label>
              <input
                type="range"
                min="30"
                max="365"
                disabled={!isEditing}
                value={settings.passwordExpiry}
                onChange={(e) => handleSettingChange('passwordExpiry', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>30 days</span>
                <span className="font-medium">{settings.passwordExpiry} days</span>
                <span>365 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Settings */}
      <div className="bg-white rounded-3xl shadow-xl border border-yellow-100 p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaUpload className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">File Upload Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Max File Size */}
          <div className="bg-gray-50 rounded-xl p-6 border border-yellow-100">
            <label className="block text-base font-semibold text-gray-800 mb-3">Max File Size (MB)</label>
            <input
              type="number"
              disabled={!isEditing}
              value={settings.maxFileSize}
              onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 text-base"
              min="1"
              max="100"
            />
          </div>

          {/* Allowed File Types */}
          <div className="bg-gray-50 rounded-xl p-6 border border-yellow-100">
            <label className="block text-base font-semibold text-gray-800 mb-3">Allowed File Types</label>
            <input
              type="text"
              disabled={!isEditing}
              value={settings.allowedFileTypes}
              onChange={(e) => handleSettingChange('allowedFileTypes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 text-base"
              placeholder="jpg,png,pdf,doc"
            />
            <p className="text-sm text-gray-500 mt-2">Comma-separated list of file extensions</p>
          </div>

          {/* Auto Compress */}
          <div className="bg-gray-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-800 font-medium">Auto Compress</h3>
                <p className="text-gray-600 text-sm">Automatically compress large files</p>
              </div>
              <button
                disabled={!isEditing}
                onClick={() => handleSettingChange('autoCompress', !settings.autoCompress)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoCompress ? 'bg-green-600' : 'bg-gray-400'
                } ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoCompress ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
