/**
 * Permission Guard Component
 * Protects routes based on role and permission settings
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../state/context/AuthContext';
import { getRoleFromAccountType, canAccessPath, subscribePortalSettings } from '../../utils/portalSettings';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPath?: string;
  fallbackPath?: string;
}

/**
 * PermissionGuard wrapper for protecting routes based on role and permissions
 * Uses the current location path by default, or can check a specific path
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPath,
  fallbackPath = '/studio/dashboard',
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [, setTick] = React.useState(0);

  React.useEffect(() => subscribePortalSettings(() => setTick((n) => n + 1)), []);

  const pathToCheck = requiredPath || location.pathname + location.search;
  const userRole = getRoleFromAccountType(user?.accountType);
  const hasAccess = canAccessPath(userRole, pathToCheck);

  if (!hasAccess) {
    // Redirect to fallback path
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
