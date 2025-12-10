import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaSave, FaEdit, FaShieldAlt, FaUpload, FaLock } from 'react-icons/fa';
import DashboardLoading from '../components/common/DashboardLoading';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  accountType: string;
  status: string;
  createdAt: string;
  lastLoginAt: string;
  updatedAt: string;
  company: string | null;
  role: string | null;
  department: string | null;
  storageQuotaMB: number;
  allowedFileTypes: string;
  maxFileSizeMB: number;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile data from API
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/api/auth/profile');
      return response.data as ProfileData;
    }
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    department: '',
  });

  // Update form data when profile data is loaded
  React.useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        company: profileData.company || '',
        role: profileData.role || '',
        department: profileData.department || '',
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/api/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      role: user?.role || '',
      department: user?.department || '',
    });
    setIsEditing(false);
  };

  if (profileLoading) {
    return (
      <DashboardLoading 
        title="Loading Profile"
        subtitle="Fetching your profile information..."
        icon={FaUser}
        showFeatures={false}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Profile Settings
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Manage your account information and personalize your profile
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', gap: '10px' }}>
        <div className="flex justify-center ">
          <button
              onClick={(e) => {setIsEditing(!isEditing);  isEditing && handleSubmit(e)}}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
          >
            {isEditing ? <FaSave className="h-5 w-5" /> : <FaEdit className="h-5 w-5" />}
            <span>{isEditing ? 'Save Changes' : 'Edit Profile'}</span>
          </button>
        </div>
        <div className="flex justify-center ">
          <button
            type="button"
            onClick={() => navigate('/change-password')}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
          >
            <FaLock className="h-5 w-5" />
            <span>Change Password</span>
          </button>
        </div>
      </div>
      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Account Type</p>
              <p className="text-3xl font-bold text-gray-800">{profileData?.accountType || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaUser className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-2xl p-8 border border-green-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Account Status</p>
              <p className="text-3xl font-bold text-gray-800">{profileData?.status || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaShieldAlt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-2xl p-8 border border-yellow-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Storage Quota</p>
              <p className="text-3xl font-bold text-gray-800">{profileData ? `${Math.round(profileData.storageQuotaMB / 1024)}GB` : 'N/A'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaUpload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div> */}

        {/* <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-2xl p-8 border border-purple-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Max File Size</p>
              <p className="text-3xl font-bold text-gray-800">{profileData ? `${Math.round(profileData.maxFileSizeMB / 1024)}GB` : 'N/A'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaEdit className="h-6 w-6 text-white" />
            </div>
          </div>
        </div> */}
      </div>

      {/* Edit Button */}

      {/* Security Actions */}
      {/* Personal Information */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaUser className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3">First Name</label>
              <input
                type="text"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-base"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3">Last Name</label>
              <input
                type="text"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-base"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3 flex items-center">
                <FaEnvelope className="h-4 w-4 mr-2 text-indigo-600" />
                Email
              </label>
              <input
                type="email"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-base"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3 flex items-center">
                <FaPhone className="h-4 w-4 mr-2 text-indigo-600" />
                Phone
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-base"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Professional Information */}
      <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-3xl shadow-2xl border border-green-100/50 p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaBuilding className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Professional Information</h2>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-green-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3 flex items-center">
                <FaBuilding className="h-4 w-4 mr-2 text-green-600" />
                Company
              </label>
              <input
                type="text"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 text-base"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-green-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3">Role</label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 text-base"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-green-100/50">
              <label className="block text-base font-semibold text-gray-800 mb-3">Department</label>
              <input
                type="text"
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 text-base"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>


      {/* Account Information */}
      <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-3xl shadow-2xl border border-yellow-100/50 p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaShieldAlt className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Account Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Username</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.username || ''}
            />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Account Type</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.accountType || ''}
            />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Status</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.status || ''}
            />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Member Since</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : ''}
            />
          </div>
        </div>
      </div>

      {/* Storage & Security Settings */}
      <div className="bg-gradient-to-br from-white via-indigo-50/30 to-blue-50/30 rounded-3xl shadow-2xl border border-indigo-100/50 p-8">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaUpload className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Storage & Security Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Allowed File Types</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.allowedFileTypes || 'N/A'}
            />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Two-Factor Auth</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            />
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-100/50">
            <label className="block text-base font-semibold text-gray-800 mb-3">Last Login</label>
            <input
              type="text"
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
              value={profileData?.lastLoginAt ? new Date(profileData.lastLoginAt).toLocaleString() : 'N/A'}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-center space-x-6">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
          >
            <FaSave className="h-5 w-5" />
            <span>{updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      )}


    </div>
  );
};

export default ProfilePage;
