import React from 'react';
import { Link } from 'react-router-dom';
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
  const features = [
    {
      icon: FaUsers,
      title: 'Client Management',
      description: 'Easily manage your clients and their information'
    },
    {
      icon: FaImages,
      title: 'Photo Gallery',
      description: 'Upload and organize photos and videos'
    },
    {
      icon: FaQrcode,
      title: 'Barcode System',
      description: 'Generate QR codes for easy photo sharing'
    },
    {
      icon: FaCamera,
      title: 'Client Portal',
      description: 'Let clients view their photos securely'
    }
  ];

  const benefits = [
    'Professional client management',
    'Secure photo sharing',
    'QR code generation',
    'View-only client access',
    'Modern, responsive design',
    'Easy to use interface'
  ];

  return (
    <div className="studio-landing">
      <div className="landing-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <FaStar />
              <span>Professional Photo Book Management</span>
            </div>
            <h1 className="hero-title">
              Photo Book <span className="gradient-text">Pro</span>
            </h1>
            <p className="hero-description">
              The complete SAAS solution for professional photo books. 
              Manage clients, organize photos, and share with barcode technology.
            </p>
            <div className="hero-actions">
              <Link to="/studio/auth" className="cta-btn primary">
                Get Started
                <FaArrowRight />
              </Link>
              <Link to="/studio/dashboard" className="cta-btn secondary">
                View Demo
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="image-placeholder">
              <FaCamera />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <h2>Everything You Need</h2>
            <p>Complete photo book management in one platform</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <Icon />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="benefits-section">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2>Why Choose Photo Book ?</h2>
              <p>
                Built specifically for photo books, our platform provides 
                everything you need to manage your business professionally.
              </p>
              <ul className="benefits-list">
                {benefits.map((benefit, index) => (
                  <li key={index}>
                    <FaCheck />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link to="/studio/auth" className="cta-btn primary">
                Start Your Free Trial
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

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Transform Your Photo Book?</h2>
            <p>Join thousands of professional photographers who trust Photo Book Pro</p>
            <div className="cta-actions">
              <Link to="/studio/auth" className="cta-btn primary large">
                Create Your Photo Book Account
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
