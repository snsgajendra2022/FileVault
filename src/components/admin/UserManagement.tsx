import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService, { AdminUser, UserStatistics } from '../../api/services/adminService';
import { FaPlus, FaEye, FaEdit, FaCheck, FaTimes, FaUser, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import CreateUserModal from './CreateUserModal';
import {
  AdminShell,
  AdminStatGrid,
  AdminStatCard,
  AdminFiltersBar,
  AdminFilterField,
  AdminCard,
  AdminBadge,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInputClass,
  adminSelectClass,
  adminTableHeadClass,
} from './adminUi';

const UserManagement = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    status: '',
    accountType: '',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [mobileAccessByUser, setMobileAccessByUser] = useState<Record<number, boolean>>({});

  const queryClient = useQueryClient();

  // Fetch users with pagination and filters
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', currentPage, pageSize, filters],
    queryFn: () => adminService.getAllUsers({
      page: currentPage,
      size: pageSize,
      ...filters
    })
  });

  // Fetch user statistics
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStatistics'],
    queryFn: () => adminService.getUserStatistics()
  });

  // Mutations
  const verifyUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.verifyUserAdmin(userId),
    onSuccess: () => {
      toast.success('User verified successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to verify user')
  });

  const suspendUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.suspendUserAdmin(userId),
    onSuccess: () => {
      toast.success('User suspended successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to suspend user')
  });

  const activateUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.activateUserAdmin(userId),
    onSuccess: () => {
      toast.success('User activated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to activate user')
  });

  const upgradeUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.upgradeUser(userId),
    onSuccess: () => {
      toast.success('User upgraded successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to upgrade user')
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminService.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to delete user')
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: Partial<AdminUser>) => adminService.createUser(userData),
    onSuccess: () => {
      toast.success('User created successfully');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
    },
    onError: () => toast.error('Failed to create user')
  });

  const createMobileAccessMutation = useMutation({
    mutationFn: ({ userId, appNameId }: { userId: number; appNameId: string }) =>
      adminService.createMobileAppAccess({ userId, appNameId }),
    onSuccess: (_data, variables) => {
      setMobileAccessByUser((prev) => ({ ...prev, [variables.userId]: true }));
      toast.success('Mobile app access enabled');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to enable mobile app access');
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const handleUserAction = (userId: number, action: string) => {
    switch (action) {
      case 'verify':
        verifyUserMutation.mutate(userId);
        break;
      case 'suspend':
        suspendUserMutation.mutate(userId);
        break;
      case 'activate':
        activateUserMutation.mutate(userId);
        break;
      case 'upgrade':
        upgradeUserMutation.mutate(userId);
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this user?')) {
          deleteUserMutation.mutate(userId);
        }
        break;
    }
  };

  const handleMobileAccessToggle = (user: AdminUser, checked: boolean) => {
    if (!checked) {
      toast('Disable API is not available yet');
      return;
    }
    if (mobileAccessByUser[user.id]) return;
    createMobileAccessMutation.mutate({
      userId: user.id,
      appNameId: user.username || `user-${user.id}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      PENDING_VERIFICATION: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      LOCKED: { color: 'bg-gray-100 text-gray-800', label: 'Locked' },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;
    return <AdminBadge tone={status === 'ACTIVE' ? 'green' : status === 'SUSPENDED' ? 'rose' : 'amber'}>{config.label}</AdminBadge>;
  };

  const getAccountTypeBadge = (accountType: string) => {
    const typeConfig = {
      FREE: { color: 'bg-gray-100 text-gray-800', label: 'Free' },
      BASIC: { color: 'bg-blue-100 text-blue-800', label: 'Basic' },
      PREMIUM: { color: 'bg-purple-100 text-purple-800', label: 'Premium' },
      ENTERPRISE: { color: 'bg-green-100 text-green-800', label: 'Enterprise' },
      ADMIN: { color: 'bg-red-100 text-red-800', label: 'Admin' }
    };

    const config = typeConfig[accountType as keyof typeof typeConfig] || typeConfig.FREE;
    const tone = accountType === 'ADMIN' ? 'rose' : accountType === 'PREMIUM' ? 'purple' : accountType === 'ENTERPRISE' ? 'green' : 'slate';
    return <AdminBadge tone={tone as 'slate'}>{config.label}</AdminBadge>;
  };

  return (
    <AdminShell
      embedded
      badge="Admin"
      badgeIcon={FaUser}
      title="User management"
      subtitle="Manage all users, roles, and account status."
      actions={
        <button type="button" onClick={() => setShowCreateModal(true)} className={adminBtnPrimary}>
          <FaUser className="h-4 w-4" />
          Add user
        </button>
      }
    >
      {!statsLoading && userStats && (
        <AdminStatGrid>
          <AdminStatCard tone="blue" label="Total users" value={userStats.totalUsers} icon={FaUser} />
          <AdminStatCard tone="green" label="Active users" value={userStats.activeUsers} />
          <AdminStatCard
            tone="amber"
            label="Pending verification"
            value={userStats.statusCounts?.PENDING_VERIFICATION || 0}
          />
          <AdminStatCard tone="purple" label="Recent registrations" value={userStats.recentRegistrations} />
        </AdminStatGrid>
      )}

      <AdminFiltersBar>
          <AdminFilterField label="Search">
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={adminInputClass}
              />
          </AdminFilterField>
          <AdminFilterField label="Status">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={adminSelectClass}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="LOCKED">Locked</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </AdminFilterField>
          <AdminFilterField label="Account type">
            <select
              value={filters.accountType}
              onChange={(e) => handleFilterChange('accountType', e.target.value)}
              className={adminSelectClass}
            >
              <option value="">All Types</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PREMIUM">Premium</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="ADMIN">Admin</option>
            </select>
          </AdminFilterField>
          <AdminFilterField label="Page size">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={adminSelectClass}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </AdminFilterField>
      </AdminFiltersBar>

      <AdminCard className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile App
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : usersData?.users?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                usersData?.users?.map((user: AdminUser) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.firstName?.charAt(0) || user.username?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAccountTypeBadge(user.accountType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!mobileAccessByUser[user.id]}
                          onChange={(e) => handleMobileAccessToggle(user, e.target.checked)}
                          disabled={createMobileAccessMutation.isPending && !mobileAccessByUser[user.id]}
                        />
                        <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                        <span className="ml-2 text-xs text-gray-600">
                          {mobileAccessByUser[user.id] ? 'Enabled' : 'Enable'}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                        {user.status === 'PENDING_VERIFICATION' && (
                          <button
                            onClick={() => handleUserAction(user.id, 'verify')}
                            disabled={verifyUserMutation.isPending}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Verify User"
                          >
                            <FaCheck className="h-4 w-4" />
                          </button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            disabled={suspendUserMutation.isPending}
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Suspend User"
                          >
                            <FaTimes className="h-4 w-4" />
                          </button>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleUserAction(user.id, 'activate')}
                            disabled={activateUserMutation.isPending}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Activate User"
                          >
                            <FaCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(user.id, 'delete')}
                          disabled={deleteUserMutation.isPending}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete User"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        {usersData ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= usersData.totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pageSize, usersData.totalUsers)}
                  </span>{' '}
                  of <span className="font-medium">{usersData.totalUsers}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, usersData.totalPages) }, (_, i) => {
                    const page = i + Math.max(0, currentPage - 2);
                    if (page >= usersData.totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= usersData.totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        ) : null}
      </AdminCard>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(userData) => createUserMutation.mutate(userData)}
          isLoading={createUserMutation.isPending}
        />
      )}

      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </AdminShell>
  );
};

// CreateUserModal component moved to separate file

// User Details Modal Component
const UserDetailsModal = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const details = await adminService.getUserDetails(user.id);
        setUserDetails(details);
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user.id]);

  return (
    <div className="admin-scope fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading user details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-medium">@{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Type</p>
                  <p className="font-medium">{user.accountType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">{user.status}</p>
                </div>
              </div>
            </div>

            {/* Usage Information */}
            {userDetails && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Usage Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Images Count</p>
                    <p className="font-medium">{userDetails.imageCount || 0}</p>
                  </div>
                  {/* <div>
                    <p className="text-sm text-gray-600">Storage Used</p>
                    <p className="font-medium">{userDetails.totalStorageUsedMB || 0} MB</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Storage Quota</p>
                    <p className="font-medium">{userDetails.storageQuotaMB || 0} MB</p>
                  </div> */}
                  <div>
                    <p className="text-sm text-gray-600">Usage Percentage</p>
                    <p className="font-medium">{userDetails.storageUsagePercentage || 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Information */}
            {userDetails?.services && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Service Configurations</h4>
                <div className="space-y-2">
                  {userDetails.services.subscriptions?.map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{service.serviceDisplayName}</p>
                        <p className="text-sm text-gray-600">{service.serviceType}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          service.connectionStatus === 'CONNECTED' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {service.connectionStatus}
                        </p>
                        <p className="text-xs text-gray-500">
                          {service.isEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
