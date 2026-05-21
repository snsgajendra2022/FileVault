/**
 * usePermissions Hook
 * Convenient hook for checking permissions in components
 */

import { useMemo } from 'react';
import { useAuth } from '../state/context/AuthContext';
import { getRoleFromAccountType, isMenuAllowed, canAccessPath } from '../utils/portalSettings';

interface UsePermissionsReturn {
  role: 'admin' | 'studio' | 'regular' | 'users';
  canAccessMenu: (href: string) => boolean;
  canAccessPath: (path: string) => boolean;
  isAdmin: boolean;
  isStudio: boolean;
  isRegular: boolean;
  isUsers: boolean;
}

/**
 * Hook to check permissions for the current user
 * 
 * Usage:
 * const { canAccessMenu, canAccessPath, role } = usePermissions();
 * 
 * if (!canAccessMenu('/phonebook')) {
 *   return <NotAllowed />;
 * }
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user ,isUsers ,isStudio ,isAdmin  } = useAuth() as any;

  const role = useMemo(
    () => getRoleFromAccountType(user?.accountType),
    [user?.accountType]
  );

  // const isAdmin = role === 'admin';
  // const isStudio = role === 'studio';
  const isRegular = role === 'regular';
  // const isUsers = role === 'users';

  const canAccessMenuFunc = (href: string) => isMenuAllowed(role, href);
  const canAccessPathFunc = (path: string) => canAccessPath(role, path);

  return {
    role,
    canAccessMenu: canAccessMenuFunc,
    canAccessPath: canAccessPathFunc,
    isAdmin,
    isStudio,
    isRegular,
    isUsers,
  };
};

export default usePermissions;
