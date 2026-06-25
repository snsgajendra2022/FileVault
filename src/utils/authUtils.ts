// Authentication utility functions

export interface StoredUserData {
  accountType: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLoginAt?: string;
  status: string;
  username: string;
  id?: number;
  phone?: string;
  company?: string;
  role?: string;
  department?: string;
  storageQuotaMB?: number;
  allowedFileTypes?: string;
  maxFileSizeMB?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getStoredUserData = (): StoredUserData | null => {
  try {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    return null;
  }
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const setStoredUserData = (userData: any): void => {
  localStorage.setItem('userData', JSON.stringify(userData));
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
};

const DEVICE_USER_KEY = 'waDeviceUserId';

/** Stable per-browser id for multi-tenant WhatsApp when no login UI is shown. */
export function getOrCreateDeviceUserId(): string {
  if (typeof localStorage === 'undefined') return 'guest';
  let id = localStorage.getItem(DEVICE_USER_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `device-${crypto.randomUUID()}`
        : `device-${Date.now()}`;
    localStorage.setItem(DEVICE_USER_KEY, id);
  }
  return id;
}

/** Auto session user — no login screen; OM WhatsApp scopes data by this id. */
export function createAutoSessionUser(): StoredUserData {
  const deviceId = getOrCreateDeviceUserId();
  return {
    id: deviceId as unknown as number,
    username: `om-${deviceId.slice(-8)}`,
    email: '',
    firstName: 'OM',
    lastName: 'User',
    accountType: 'USERS',
    status: 'ACTIVE',
    role: 'users',
  };
}

export function setAutoSessionToken(deviceId: string): void {
  setStoredToken(`wa-local-${deviceId}`);
}

export const isUserAdmin = (userData: StoredUserData | null): boolean => {
  return userData?.accountType === 'ADMIN';
};

export const getUserDisplayName = (userData: StoredUserData | null): string => {
  if (!userData) return 'Unknown User';
  return `${userData.firstName} ${userData.lastName}`.trim() || userData.username;
};

export const getUserInitials = (userData: StoredUserData | null): string => {
  if (!userData) return 'U';
  return (userData.firstName?.charAt(0) || userData.username?.charAt(0) || 'U').toUpperCase();
};

// Debug function to log current auth state
export const logAuthState = (): void => {
  const token = getStoredToken();
  const userData = getStoredUserData();
  
  // console.log('=== Current Auth State ===');
  // console.log('Token:', token ? 'Present' : 'Not found');
  // console.log('User Data:', userData);
  // console.log('Is Admin:', isUserAdmin(userData));
  // console.log('Display Name:', getUserDisplayName(userData));
  // console.log('========================');
};
