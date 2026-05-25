import React from 'react';
import { IconBaseProps } from 'react-icons';
import { FaCamera, FaImages, FaFolder, FaSync } from 'react-icons/fa';
import './DashboardLoading.css';

export interface LoadingFeature {
  icon: React.ComponentType<IconBaseProps>;
  label: string;
}

export interface DashboardLoadingProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<IconBaseProps>;
  features?: LoadingFeature[];
  showFeatures?: boolean;
  showProgress?: boolean;
  /** Footer line under the card (StudioPro branding). */
  brandLine?: string;
}

const DEFAULT_FEATURES: LoadingFeature[] = [
  { icon: FaSync, label: 'Syncing Clients' },
  { icon: FaImages, label: 'Optimizing Photos' },
  { icon: FaFolder, label: 'Indexing Albums' },
];

const DashboardLoading: React.FC<DashboardLoadingProps> = ({
  title = 'Initializing Studio Pro',
  subtitle = 'Preparing your creative workspace...',
  icon: Icon = FaCamera,
  features,
  showFeatures = true,
  showProgress = true,
  brandLine = 'StudioPro Creative Engine v4.0',
}) => {
  const displayFeatures = features ?? DEFAULT_FEATURES;

  return (
    <div className="dashboard-loading-modern" role="status" aria-live="polite" aria-busy="true">
      <div className="dl-grain" aria-hidden="true" />

      <div className="dl-scene" aria-hidden="true">
        <div className="dl-orb dl-orb-violet" />
        <div className="dl-orb dl-orb-fuchsia" />
        <div className="dl-orb dl-orb-indigo" />
      </div>

      <main className="dl-main">
        <div className="dl-panel">
          <div className="dl-icon-wrap">
            <div className="dl-pulse-ring dl-pulse-ring-1" aria-hidden="true" />
            <div className="dl-pulse-ring dl-pulse-ring-2" aria-hidden="true" />
            <div className="dl-pulse-ring dl-pulse-ring-3" aria-hidden="true" />
            <div className="dl-pulse-ring dl-pulse-ring-4" aria-hidden="true" />
            <div className="dl-icon-core">
              <Icon className="dl-icon" aria-hidden="true" />
            </div>
          </div>

          <div className="dl-text">
            <h1 className="dl-title">{title}</h1>
            <p className="dl-subtitle">{subtitle}</p>
          </div>

          {showProgress && (
            <div className="dl-progress">
              <div className="dl-shimmer-bar" aria-hidden="true" />
              <div className="dl-dots" aria-hidden="true">
                <span className="dl-dot dl-dot-1" />
                <span className="dl-dot dl-dot-2" />
                <span className="dl-dot dl-dot-3" />
              </div>
            </div>
          )}

          {showFeatures && displayFeatures.length > 0 && (
            <div className="dl-features">
              {displayFeatures.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={`${feature.label}-${index}`}
                    className="dl-chip"
                    style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  >
                    <FeatureIcon className="dl-chip-icon" aria-hidden="true" />
                    <span className="dl-chip-label">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {brandLine ? (
          <p className="dl-brand">{brandLine}</p>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardLoading;
