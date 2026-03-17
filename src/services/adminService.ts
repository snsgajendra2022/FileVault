import api from './api';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  accountType: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  updatedAt: string;
  company?: string;
  role?: string;
  department?: string;
  storageQuotaMB: number;
  allowedFileTypes?: string;
  maxFileSizeMB?: number;
  twoFactorEnabled: boolean;
}

export interface UserStatistics {
  statusCounts: Record<string, number>;
  accountTypeCounts: Record<string, number>;
  recentRegistrations: number;
  activeUsers: number;
  totalUsers: number;
}

export interface ServiceConfiguration {
  id: number;
  userId: number;
  username: string;
  serviceType: string;
  serviceDisplayName: string;
  connectionStatus: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface ServiceStatistics {
  serviceTypeCounts: Record<string, number>;
  connectionStatusCounts: Record<string, number>;
  usersWithMultipleServices: number;
  totalConfigurations: number;
  uniqueUsersWithServices: number;
}

export interface SystemHealth {
  totalUsers: number;
  totalImages: number;
  totalServiceConfigurations: number;
  activeUsers: number;
  pendingVerifications: number;
  suspendedUsers: number;
  failedServiceConnections: number;
  totalStorageUsedGB: number;
}

export interface UsageStatistics {
  totalStorageUsedBytes: number;
  totalStorageUsedGB: number;
  totalImages: number;
  averageFileSizeBytes: number;
  averageFileSizeMB: number;
  fileTypeDistribution: Record<string, number>;
  userStorageUsage: Record<string, number>;
  topUsersByStorage: Array<{
    userId: number;
    username: string;
    storageUsedBytes: number;
    storageUsedMB: number;
  }>;
}

export interface Plan {
  id: number;
  planName: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  storageQuotaGB: number;
  maxFileSizeMB: number;
  maxUploadsPerMonth: number;
  maxConcurrentUploads: number;
  allowedFileTypes: string;
  encryptionEnabled: boolean;
  cloudStorageEnabled: boolean;
  compressionEnabled: boolean;
  prioritySupport: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

class AdminService {
  // User Management APIs
  async getAllUsers(params?: {
    page?: number;
    size?: number;
    status?: string;
    accountType?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.accountType) queryParams.append('accountType', params.accountType);
    if (params?.search) queryParams.append('search', params.search);

    const response = await api.get(`/api/admin/users?${queryParams.toString()}`);
    return response.data;
  }

  async getUserStatistics(): Promise<UserStatistics> {
    const response = await api.get('/api/admin/users/statistics');
    return response.data;
  }

  async getUserDetails(userId: number) {
    const response = await api.get(`/api/admin/users/${userId}/details`);
    return response.data;
  }

  async getUserUsage(userId: number, period?: string) {
    const queryParams = period ? `?period=${period}` : '';
    const response = await api.get(`/api/admin/users/${userId}/usage${queryParams}`);
    return response.data;
  }

  // Service Configuration APIs
  async getServiceConfigurations(params?: {
    page?: number;
    size?: number;
    serviceType?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.serviceType) queryParams.append('serviceType', params.serviceType);
    if (params?.status) queryParams.append('status', params.status);

    const response = await api.get(`/api/admin/services/configurations?${queryParams.toString()}`);
    return response.data;
  }

  async getServiceStatistics(): Promise<ServiceStatistics> {
    const response = await api.get('/api/admin/services/statistics');
    return response.data;
  }

  async testServiceConfiguration(subscriptionId: number) {
    const response = await api.post(`/api/admin/services/${subscriptionId}/test`);
    return response.data;
  }

  async createServiceConfiguration(serviceData: any) {
    const response = await api.post('/api/admin/services/configurations', serviceData);
    return response.data;
  }

  // Usage Statistics APIs
  async getUsageStatistics(period?: string): Promise<UsageStatistics> {
    const queryParams = period ? `?period=${period}` : '';
    const response = await api.get(`/api/admin/usage/statistics${queryParams}`);
    return response.data;
  }

  // System Health APIs
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/api/admin/system/health');
    return response.data;
  }

  // Plan Management APIs
  async getAllPlans() {
    const response = await api.get('/api/plans');
    return response.data;
  }

  async createPlan(planData: Partial<Plan>) {
    const response = await api.post('/api/plans', planData);
    return response.data;
  }

  async updatePlan(planId: number, planData: Partial<Plan>) {
    const response = await api.put(`/api/plans/${planId}`, planData);
    return response.data;
  }

  async deletePlan(planId: number) {
    const response = await api.delete(`/api/plans/${planId}`);
    return response.data;
  }

  // User Actions
  async verifyUser(userId: number) {
    const response = await api.put(`/api/admin/users/${userId}/verify`);
    return response.data;
  }

  async suspendUser(userId: number) {
    const response = await api.put(`/api/admin/users/${userId}/suspend`);
    return response.data;
  }

  async activateUser(userId: number) {
    const response = await api.put(`/api/admin/users/${userId}/activate`);
    return response.data;
  }

  async deleteUser(userId: number) {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: number, userData: Partial<AdminUser>) {
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  }

  async createUser(userData: Partial<AdminUser>) {
    const response = await api.post('/api/admin/users', userData);
    return response.data;
  }

  // User Management Actions
  async upgradeUser(userId: number) {
    const response = await api.put(`/api/auth/admin/users/${userId}/upgrade`);
    return response.data;
  }

  async verifyUserAdmin(userId: number) {
    const response = await api.put(`/api/auth/admin/users/${userId}/verify`);
    return response.data;
  }

  async suspendUserAdmin(userId: number) {
    const response = await api.put(`/api/auth/admin/users/${userId}/suspend`);
    return response.data;
  }

  async activateUserAdmin(userId: number) {
    const response = await api.put(`/api/auth/admin/users/${userId}/activate`);
    return response.data;
  }

  // Password Management
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }) {
    const response = await api.put('/api/auth/change-password', passwordData);
    return response.data;
  }

  // Flags (feature flags – e.g. isEmail, isPhone, isDownload)
  async getFlags(): Promise<{ flags: Array<{ id: number; name: string; value: boolean }> }> {
    const response = await api.get('/api/flags');
    return response.data;
  }

  async createFlag(data: { name: string; value: boolean }) {
    const response = await api.post('/api/flags', data);
    return response.data;
  }

  async updateFlag(name: string, value: boolean) {
    const response = await api.put(`/api/flags/${encodeURIComponent(name)}`, { value });
    return response.data;
  }
}

export default new AdminService();
