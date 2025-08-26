// Navigation utility functions
export const clearNavigationState = () => {
  // Clear any problematic navigation state
  if (typeof window !== 'undefined') {
    // Clear any stored navigation state
    sessionStorage.removeItem('lastRoute');
    localStorage.removeItem('redirectPath');
  }
};

export const handleInvalidRoute = (pathname: string) => {
  // Log invalid routes for debugging
  console.log(`Invalid route accessed: ${pathname}`);
  
  // Clear any problematic state
  clearNavigationState();
  
  // Return the correct route to redirect to
  if (pathname.includes('/dashboards/')) {
    return '/dashboard';
  }
  
  return '/dashboard';
};

export const isValidRoute = (pathname: string) => {
  const validRoutes = [
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/profile',
    '/services',
    '/plans',
    '/usage',
    '/billing',
    '/settings',
    '/upload',
    '/analytics',
    '/admin'
  ];
  
  return validRoutes.includes(pathname) || pathname.startsWith('/plans/');
};
