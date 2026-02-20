import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCamera, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaBuilding } from 'react-icons/fa';
import './StudioAuthPage.css';

const StudioAuthPage: React.FC = () => {
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
        <div className="auth-header">
          <div className="logo">
            <FaCamera className="logo-icon" />
            <h1>Photo Book Pro</h1>
          </div>
          <p className="tagline">Professional Photo Book Management</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button 
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Create Photo Book
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label htmlFor="studioName">Photo Book Name</label>
                  <div className="input-group">
                    <FaBuilding className="input-icon" />
                    <input
                      type="text"
                      id="studioName"
                      name="studioName"
                      value={formData.studioName}
                      onChange={handleInputChange}
                      placeholder="Enter your photo book name"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ownerName">Owner Name</label>
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-group">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Photo Book Address</label>
                  <div className="input-group">
                    <FaBuilding className="input-icon" />
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your photo book address"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-group">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-group">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
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
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
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
                  Remember me
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
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
                isLogin ? 'Sign In' : 'Create Photo Book'
              )}
            </button>

            {isLogin && (
              <div className="auth-footer">
                <p>
                  Don't have a photo book account?{' '}
                  <button 
                    type="button" 
                    className="link-btn"
                    onClick={() => setIsLogin(false)}
                  >
                    Create one now
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="features-preview">
          <h3>What you get with Photo Book Pro:</h3>
          <div className="features-grid">
            <div className="feature">
              <FaUser className="feature-icon" />
              <span>Client Management</span>
            </div>
            <div className="feature">
              <FaCamera className="feature-icon" />
              <span>Photo Gallery</span>
            </div>
            <div className="feature">
              <FaEnvelope className="feature-icon" />
              <span>Client Portal</span>
            </div>
            <div className="feature">
              <FaLock className="feature-icon" />
              <span>Secure Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioAuthPage;
