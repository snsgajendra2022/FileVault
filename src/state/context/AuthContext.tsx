import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../../api/client/axiosInstance';
import { User } from '../../types/user';
import { 
  getStoredToken, 
  getStoredUserData, 
  setStoredToken, 
  setStoredUserData, 
  clearStoredAuth,
  logAuthState 
} from '../../utils/authUtils';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUsers: boolean;
  isStudio: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  requestLoginOtp: (payload: { email?: string; phone?: string }) => Promise<{ message?: string }>;
  verifyLoginOtp: (payload: { email?: string; phone?: string; otp: string }) => Promise<void>;
  register: (userData: any) => Promise<void>;
  onSubmitUser: (userData: any) => Promise<any>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [ user ,setUser] = useState<User | null |any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
   const users = {
     accountType: 'STUDIO'
    }
  // Check if user is admin
  const isAdmin = users?.accountType === 'ADMIN';
  const isStudio = users?.accountType === 'STUDIO';
  const isUsers = users?.accountType === 'USERS';
  const isAuthenticated = !!user;

  useEffect(() => {
    console.log('AuthContext: Initializing authentication state...');
    
    // Check for existing token and user data in localStorage
    const token = getStoredToken();
    const userData = getStoredUserData(); 
    
    // console.log('AuthContext: Found token:', !!token, 'Found userData:', !!userData);
    
    if (token && userData) {
      try {
        // Set authorization header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Set user data from localStorage (convert to User type)
        setUser(userData as User);
        setIsLoading(false);
        
        console.log('User data restored from localStorage:', userData);
        logAuthState();
      } catch (error) {
        console.error('Error restoring user data from localStorage:', error);
        // Clear invalid data
        clearStoredAuth();
        delete api.defaults.headers.common['Authorization'];
      }
    } else {
      // No stored data, try to validate token if exists
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        validateToken();
      } else {
        // No token found, user is not authenticated
        setIsLoading(false);
        console.log('No stored token found, user not authenticated');
      }
    }
  }, []);

  const validateToken = async () => {
    try {
      const response = await api.get('/api/auth/me');
      const userData = response.data.user;
      
      // Store updated user data
      setStoredUserData(userData);
      setUser(userData);
      
      // console.log('Token validated, user data updated:', userData);
    } catch (error) {
      console.error('Token validation failed:', error);
      // Clear invalid data
      clearStoredAuth();
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const applyAuthResponse = (data: any) => {
    const apiToken = data?.apiToken || data?.accessToken || data?.token;
    const rawUser = data?.user ? data.user : data;
    const userData =
      rawUser && typeof rawUser === 'object'
        ? (({ apiToken: _a, accessToken: _b, token: _c, ...rest }) => rest)(rawUser)
        : null;

    if (!apiToken || !userData) {
      throw new Error('Invalid authentication response');
    }

    setStoredToken(apiToken);
    setStoredUserData(userData);
    api.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
    setUser(userData);
    logAuthState();
  };

  const login = async (username: string, password: string) => {
    try {
      // console.log('Attempting login with username:', username);
      
      const response = await api.post('/api/auth/login', { username, password });
      // console.log('Login response:', response.data);
      
      applyAuthResponse(response.data);
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Login failed');
    }
  };

  const requestLoginOtp = async (payload: { email?: string; phone?: string }) => {
    const email = payload.email?.trim();
    const phone = payload.phone?.trim();

    if (!email && !phone) {
      throw new Error('Please provide email or phone');
    }

    // New login OTP API:
    // POST /api/auth/login/otp/send
    // Body: { email?, mobile?, channel: 'email' | 'sms' }
    const body = email
      ? { email, channel: 'email' as const }
      : { mobile: phone, channel: 'sms' as const };

    try {
      const response = await api.post('/api/auth/login/otp/send', body);
      return response.data || {};
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error?.response?.data?.error || 'Failed to send OTP');
    }
  };

  const verifyLoginOtp = async (payload: { email?: string; phone?: string; otp: string }) => {
    const email = payload.email?.trim();
    const phone = payload.phone?.trim();
    const otp = payload.otp.trim();

    if (!otp) {
      throw new Error('Please enter OTP');
    }
    if (!email && !phone) {
      throw new Error('Please provide email or phone');
    }

    // New login OTP verify API:
    // POST /api/auth/login/otp/verify
    // Verifies against login_otp_history (SENT + not expired), then marks VERIFIED.
    const body = email
      ? { email, otp, channel: 'email' as const }
      : { mobile: phone, otp, channel: 'sms' as const };

    try {
      const response = await api.post('/api/auth/login/otp/verify', body);
      applyAuthResponse(response.data);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error?.response?.data?.error || 'OTP verification failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { apiToken, ...newUser } = response.data;
      
      // Store token and user data using utility functions
      setStoredToken(apiToken);
      setStoredUserData(newUser);
      
      // Set authorization header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
      
      // Store user data in state
      setUser(newUser);
      
      // console.log('Registration successful:', { user: newUser, token: apiToken });
      logAuthState();

      // Auto-verify the user after successful registration
      try {
        await api.put(`/api/auth/admin/users/${newUser.id}/verify`);
        console.log('User auto-verified after registration');
      } catch (verifyError: any) {
        console.warn('Auto-verification failed:', verifyError);
        // Don't fail registration if verification fails
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Registration failed');
    }
  };
  const onSubmitUser = async (userData: any) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { apiToken, ...newUser } = response.data;
      return newUser;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Registration failed');
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await api.post<{ message: string }>('/api/auth/forgot-password', { email });
    return response.data;
  };

  const logout = () => {
    console.log('Logout initiated...');
    
    // Clear stored authentication data
    clearStoredAuth();
    
    // Remove authorization header
    delete api.defaults.headers.common['Authorization'];
  
    // Reset user state
    setUser(null);
    
    // Set loading to false to ensure proper state
    setIsLoading(false);
    
    // Clear React Query cache to prevent stale data
    queryClient.clear();
    
    console.log('Logout successful - all data cleared, isLoading set to false');
  };

  const updateUser = (userData: Partial<User>) => {
    const updatedUser = user ? { ...user, ...userData } : null;
    setUser(updatedUser);
    
    // Update user data in localStorage
    if (updatedUser) {
      setStoredUserData(updatedUser);
      // console.log('User data updated in localStorage:', updatedUser);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isStudio,
    isUsers,
    isLoading,
    login,
    requestLoginOtp,
    verifyLoginOtp,
    register,
    onSubmitUser,
    forgotPassword,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
