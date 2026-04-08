import React from 'react';
import { IconBaseProps } from 'react-icons';
import { FaCamera, FaImages, FaUsers, FaFolder } from 'react-icons/fa';
import './DashboardLoading.css';

interface LoadingFeature {
  icon: React.ComponentType<IconBaseProps>;
  label: string;
}

interface DashboardLoadingProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<IconBaseProps>;
  features?: LoadingFeature[];
  showFeatures?: boolean;
  showProgress?: boolean;
}

const DashboardLoading: React.FC<DashboardLoadingProps> = ({
  title = 'Loading Dashboard',
  subtitle = 'Preparing your content...',
  icon: Icon = FaCamera,
  features,
  showFeatures = true,
  showProgress = true,
}) => {
  // Default features if none provided
  const defaultFeatures: LoadingFeature[] = [
    { icon: FaUsers, label: 'Clients' },
    { icon: FaImages, label: 'Photos' },
    { icon: FaFolder, label: 'Albums' },
  ];

  const displayFeatures = features || defaultFeatures;

  return (
    <div className="dashboard-loading-modern" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="loading-content">
        <div className="loading-icon-container">
          <div className="icon-ring">
            <Icon className="loading-icon" />
          </div>
          <div className="pulse-ring ring-1"></div>
          <div className="pulse-ring ring-2"></div>
          <div className="pulse-ring ring-3"></div>
        </div>
        
        <div className="loading-text-container">
          <h2 className="loading-title">{title}</h2>
          <p className="loading-subtitle">{subtitle}</p>
        </div>
        
        {showProgress && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <div className="progress-dots">
              <span className="dot dot-1"></span>
              <span className="dot dot-2"></span>
              <span className="dot dot-3"></span>
            </div>
          </div>
        )}
        
        {showFeatures && displayFeatures.length > 0 && (
          <div className="loading-features">
            {displayFeatures.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={index} className="feature-item" style={{ animationDelay: `${index * 0.2}s` }}>
                  <FeatureIcon className="feature-icon" />
                  <span>{feature.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLoading;

