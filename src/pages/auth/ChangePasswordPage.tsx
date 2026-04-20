import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import adminService from '../../services/adminService';

const ChangePasswordPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();

  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: { currentPassword: string; newPassword: string }) =>
      adminService.changePassword(passwordData),
    onSuccess: () => {
      toast.success(t('changePassword.toastSuccess'));
      navigate('/profile');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('changePassword.toastError');
      toast.error(message);
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Current password validation
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.errCurrentRequired');
    }

    // New password validation
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = t('changePassword.errNewRequired');
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = t('changePassword.errNewMin');
    } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      newErrors.newPassword = t('changePassword.errNewLower');
    } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      newErrors.newPassword = t('changePassword.errNewUpper');
    } else if (!/(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = t('changePassword.errNewNum');
    } else if (!/(?=.*[@$!%*?&])/.test(formData.newPassword)) {
      newErrors.newPassword = t('changePassword.errNewSpecial');
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('changePassword.errConfirmRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('changePassword.errMismatch');
    }

    // Check if new password is same as current
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = t('changePassword.errSameAsCurrent');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      changePasswordMutation.mutate({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&])/.test(password)) score++;

    const strengthMap = {
      0: { label: t('changePassword.strengthVeryWeak'), color: 'bg-red-500' },
      1: { label: t('changePassword.strengthWeak'), color: 'bg-orange-500' },
      2: { label: t('changePassword.strengthFair'), color: 'bg-yellow-500' },
      3: { label: t('changePassword.strengthGood'), color: 'bg-blue-500' },
      4: { label: t('changePassword.strengthStrong'), color: 'bg-green-500' },
      5: { label: t('changePassword.strengthVeryStrong'), color: 'bg-emerald-500' }
    };

    return { score, ...strengthMap[score as keyof typeof strengthMap] };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <FaShieldAlt className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('changePassword.title')}</h2>
          <p className="text-gray-600">{t('changePassword.subtitle')}</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('changePassword.currentLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  className={`w-full pl-12 pr-12 py-4 border rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('changePassword.placeholderCurrent')}
                  value={formData.currentPassword}
                  onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <FaTimes className="h-4 w-4 mr-1" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('changePassword.newLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  className={`w-full pl-12 pr-12 py-4 border rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.newPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('changePassword.placeholderNew')}
                  value={formData.newPassword}
                  onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('changePassword.strengthLabel')}</span>
                    <span className={`font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <FaTimes className="h-4 w-4 mr-1" />
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('changePassword.confirmLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className={`w-full pl-12 pr-12 py-4 border rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('changePassword.placeholderConfirm')}
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2">
                  {formData.newPassword === formData.confirmPassword ? (
                    <p className="text-green-600 text-sm flex items-center">
                      <FaCheck className="h-4 w-4 mr-1" />
                      {t('changePassword.matchOk')}
                    </p>
                  ) : (
                    <p className="text-red-500 text-sm flex items-center">
                      <FaTimes className="h-4 w-4 mr-1" />
                      {t('changePassword.matchNo')}
                    </p>
                  )}
                </div>
              )}

              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <FaTimes className="h-4 w-4 mr-1" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('changePassword.requirementsTitle')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <FaCheck className={`h-4 w-4 mr-2 ${formData.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                  {t('changePassword.reqLen')}
                </li>
                <li className="flex items-center">
                  <FaCheck className={`h-4 w-4 mr-2 ${/(?=.*[a-z])/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                  {t('changePassword.reqLower')}
                </li>
                <li className="flex items-center">
                  <FaCheck className={`h-4 w-4 mr-2 ${/(?=.*[A-Z])/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                  {t('changePassword.reqUpper')}
                </li>
                <li className="flex items-center">
                  <FaCheck className={`h-4 w-4 mr-2 ${/(?=.*\d)/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                  {t('changePassword.reqNum')}
                </li>
                <li className="flex items-center">
                  <FaCheck className={`h-4 w-4 mr-2 ${/(?=.*[@$!%*?&])/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} />
                  {t('changePassword.reqSpecial')}
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              {/* <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300"
                disabled={changePasswordMutation.isPending}
              >
                Cancel
              </button> */}
              <button
                type="submit"
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    {t('changePassword.submitting')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <FaShieldAlt className="h-5 w-5 mr-2" />
                    {t('changePassword.submit')}
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Tips */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FaShieldAlt className="h-5 w-5 text-blue-600 mr-2" />
            {t('changePassword.securityTips')}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>{t('changePassword.tip1')}</span>
            </li>
            <li className="flex items-start">
              <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>{t('changePassword.tip2')}</span>
            </li>
            <li className="flex items-start">
              <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>{t('changePassword.tip3')}</span>
            </li>
            <li className="flex items-start">
              <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>{t('changePassword.tip4')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
