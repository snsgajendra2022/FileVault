import React, { useState } from 'react';
import { FaUser, FaShieldAlt, FaCog, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AdminUser } from '../../api/services/adminService';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  AdminModal,
  adminInputClass,
  adminSelectClass,
  adminLabelClass,
  adminBtnPrimary,
  adminBtnSecondary,
} from './adminUi';

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (userData: Partial<AdminUser>) => void;
  isLoading: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'FREE',
    status: 'ACTIVE',
    company: '',
    role: 'subscribed',
    department: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { onSubmitUser } = useAuth();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const { confirmPassword, ...submitData } = formData;
      
      try {
        // First create the user
        // await onSubmit(submitData);
        await onSubmitUser(submitData);
        // After successful user creation, upgrade the user's plan
        try {
           if (submitData.accountType === 'FREE') {
          const planIdMap: { [key: string]: number } = {
            'FREE': 1,
          };

          const upgradeData = {
            planId: 1,
            billingCycle: 'MONTHLY',
            prorate: true
          }; 

          await api.post('/api/plans/subscribe', upgradeData);
          console.log(`User created successfully!`);
        } else {
          console.log(`User created successfully!`);
        }
        } catch (upgradeError: any) {
          console.error('Plan upgrade failed:', upgradeError);
          console.log('User created successfully! Welcome to Portal.');
          // Don't fail the user creation if plan upgrade fails
        }
        toast.success('User created successfully!');
        onClose();
      } catch (error: any) {
        console.error('User creation failed:', error);
        toast.error(error.message || 'Failed to create user. Please try again.');
      }
    }
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const inputErr = (field: string) =>
    errors[field] ? `${adminInputClass} border-rose-300` : adminInputClass;

  return (
    <AdminModal open title="Create new user" onClose={onClose} maxWidth="max-w-4xl">
      <p className="-mt-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
        Add a new user with account credentials and settings.
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-600 dark:bg-slate-800/50">
              <h4 className="mb-4 flex items-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FaUser className="mr-2 h-4 w-4 text-indigo-600" />
                Basic information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={adminLabelClass}>
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={inputErr('username')}
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => handleFieldChange('username', e.target.value)}
                  />
                  {errors.username && <p className="mt-1 text-xs text-rose-600">{errors.username}</p>}
                </div>

                <div>
                  <label className={adminLabelClass}>
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className={inputErr('email')}
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                </div>

                <div>
                  <label className={adminLabelClass}>
                    First name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={inputErr('firstName')}
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>}
                </div>

                <div>
                  <label className={adminLabelClass}>
                    Last name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={inputErr('lastName')}
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>}
                </div>

                <div>
                  <label className={adminLabelClass}>Phone number</label>
                  <input
                    type="tel"
                    className={adminInputClass}
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                </div>

                <div>
                  <label className={adminLabelClass}>Company</label>
                  <input
                    type="text"
                    className={adminInputClass}
                    placeholder="Enter company name"
                    value={formData.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-600 dark:bg-slate-800/50">
              <h4 className="mb-4 flex items-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FaShieldAlt className="mr-2 h-4 w-4 text-emerald-600" />
                Security
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={adminLabelClass}>
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className={`${inputErr('password')} pr-10`}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
                </div>

                <div>
                  <label className={adminLabelClass}>
                    Confirm password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className={`${inputErr('confirmPassword')} pr-10`}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-600 dark:bg-slate-800/50">
              <h4 className="mb-4 flex items-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FaCog className="mr-2 h-4 w-4 text-violet-600" />
                Account settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={adminLabelClass}>
                    Account type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => handleFieldChange('accountType', e.target.value)}
                    className={adminSelectClass}
                  >
                    <option value="FREE">Free</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className={adminLabelClass}>
                    Account status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className={adminSelectClass}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING_VERIFICATION">Pending Verification</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className={adminLabelClass}>Role</label>
                  <input
                    type="text"
                    className={adminInputClass}
                    placeholder="Enter job role"
                    value={formData.role}
                    onChange={(e) => handleFieldChange('role', e.target.value)}
                  />
                </div>

                <div>
                  <label className={adminLabelClass}>Department</label>
                  <input
                    type="text"
                    className={adminInputClass}
                    placeholder="Enter department"
                    value={formData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => handleFieldChange('billingCycle', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div> */}
              </div>
            </div>

            {/* Storage & File Settings Section 
            <div className="bg-gray-50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaCloud className="h-5 w-5 text-indigo-600 mr-2" />
                Storage & File Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Storage Quota (MB)</label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="1000"
                    value={formData.storageQuotaMB}
                    onChange={(e) => handleFieldChange('storageQuotaMB', parseInt(e.target.value) || 1000)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max File Size (MB)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="50"
                    value={formData.maxFileSizeMB}
                    onChange={(e) => handleFieldChange('maxFileSizeMB', parseInt(e.target.value) || 50)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed File Types</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="jpg,jpeg,png,pdf,doc,docx"
                    value={formData.allowedFileTypes}
                    onChange={(e) => handleFieldChange('allowedFileTypes', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated file extensions</p>
                </div>
              </div>
            </div>*/}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
              <button type="button" onClick={onClose} className={adminBtnSecondary} disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" className={adminBtnPrimary} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating…
                  </>
                ) : (
                  'Create user'
                )}
              </button>
            </div>
      </form>
    </AdminModal>
  );
};

export default CreateUserModal;
