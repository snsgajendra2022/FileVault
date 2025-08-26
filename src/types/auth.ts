export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegistrationData {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType: 'FREE';
  company?: string;
  role?: string;
  department?: string;
  storageQuotaMB: number;
  allowedFileTypes: string;
  maxFileSizeMB: number;
}  

export interface AuthResponse {
  apiToken: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
