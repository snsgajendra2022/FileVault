export interface FamilyRelationship {
  inviterId: number;
  inviterApiToken: string;
  inviterUsername: string;
  inviterFirstName: string;
  inviterLastName: string;
  relationshipType: string;
  relationshipNotes: string;
  canViewImages: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canDownloadImages: boolean;
  canManageAlbums: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'CLIENT' | 'FREE';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'VERIFIED';
  company?: string;
  role?: string;
  department?: string;
  storageQuotaMB: number;
  allowedFileTypes: string;
  maxFileSizeMB: number;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  canViewImages?: boolean;
  canUploadImages?: boolean;
  canDeleteImages?: boolean;
  canManageAlbums?: boolean;
  canDownloadImages?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  hasFamilyAccess?: boolean;
  familyRelationships?: FamilyRelationship[];
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
