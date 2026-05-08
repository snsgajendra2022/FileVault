import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaBuilding } from 'react-icons/fa';
import './StudioAuthPage.css';

const StudioAuthPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    studioName: '',
    ownerName: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isLogin) {
        // Login logic
        console.log('Login:', formData.email, formData.password);
        navigate('/studio/dashboard');
      } else {
        // Register logic
        console.log('Register:', formData);
        navigate('/studio/dashboard');
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="studio-auth-container">
      <div className="auth-background">
        <div className="auth-pattern"></div>
      </div>
      
      <div className="auth-content">
        {/* <div className="auth-header">
          <div className="logo">
            <FaCamera className="logo-icon" />
            <h1>Photo Book Pro</h1>
          </div>
          <p className="tagline">Professional Photo Book Management</p>
        </div> */}

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              {t('studioAuth.signIn')}
            </button>
            <button 
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              {t('studioAuth.createPhotoBook')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label htmlFor="studioName">{t('studioAuth.photoBookName')}</label>
                  <div className="input-group">
                    <FaBuilding className="input-icon" />
                    <input
                      type="text"
                      id="studioName"
                      name="studioName"
                      value={formData.studioName}
                      onChange={handleInputChange}
                      placeholder={t('studioAuth.placeholderPhotoBookName')}
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ownerName">{t('studioAuth.ownerName')}</label>
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder={t('studioAuth.placeholderOwnerName')}
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">{t('studioAuth.phoneNumber')}</label>
                  <div className="input-group">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('studioAuth.placeholderPhone')}
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">{t('studioAuth.photoBookAddress')}</label>
                  <div className="input-group">
                    <FaBuilding className="input-icon" />
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('studioAuth.placeholderAddress')}
                      required={!isLogin}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">{t('studioAuth.emailAddress')}</label>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('studioAuth.placeholderEmail')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('studioAuth.password')}</label>
              <div className="input-group">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('studioAuth.placeholderPassword')}
                  required
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

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">{t('studioAuth.confirmPassword')}</label>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={t('studioAuth.placeholderConfirmPassword')}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  {t('studioAuth.rememberMe')}
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  {t('studioAuth.forgotPassword')}
                </Link>
              </div>
            )}

            <button 
              type="submit" 
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                isLogin ? t('studioAuth.signInSubmit') : t('studioAuth.createSubmit')
              )}
            </button>

            {isLogin && (
              <div className="auth-footer">
                <p>
                  {t('studioAuth.noAccount')}{' '}
                  <button 
                    type="button" 
                    className="link-btn"
                    onClick={() => setIsLogin(false)}
                  >
                    {t('studioAuth.createOne')}
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="features-preview">
          <h3>{t('studioAuth.featuresTitle')}</h3>
          <div className="features-grid">
            <div className="feature">
              <FaUser className="feature-icon" />
              <span>{t('studioAuth.featureClientManagement')}</span>
            </div>
            <div className="feature">
              <FaCamera className="feature-icon" />
              <span>{t('studioAuth.featurePhotoGallery')}</span>
            </div>
            <div className="feature">
              <FaEnvelope className="feature-icon" />
              <span>{t('studioAuth.featureClientPortal')}</span>
            </div>
            <div className="feature">
              <FaLock className="feature-icon" />
              <span>{t('studioAuth.featureSecureAccess')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioAuthPage;
