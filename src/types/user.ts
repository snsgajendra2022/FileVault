export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'VERIFIED';
  company?: string;
  role?: string;
  department?: string;
  storageQuotaMB: number;
  allowedFileTypes: string;
  maxFileSizeMB: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  department?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
