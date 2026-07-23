import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import adminService from '../../api/services/adminService';

const ChangePasswordPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = t('changePassword.errCurrentRequired');
    }

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

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('changePassword.errConfirmRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('changePassword.errMismatch');
    }

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
        newPassword: formData.newPassword,
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
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
      3: { label: t('changePassword.strengthGood'), color: 'bg-[#1f3a34]' },
      4: { label: t('changePassword.strengthStrong'), color: 'bg-green-500' },
      5: { label: t('changePassword.strengthVeryStrong'), color: 'bg-emerald-500' },
    };

    return { score, ...strengthMap[score as keyof typeof strengthMap] };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const fieldClass = (hasError: boolean) =>
    `w-full rounded-full border bg-white py-3.5 pl-12 pr-12 text-sm text-[#141210] placeholder:text-[#8a847a] focus:border-[#1f3a34] focus:outline-none focus:ring-2 focus:ring-[rgba(31,58,52,0.18)] transition-all ${
      hasError ? 'border-red-300' : 'border-[rgba(20,18,16,0.14)]'
    }`;

  return (
    <div className="mx-auto max-w-md px-2 py-8 sm:py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#141210] text-[#fffcf8]">
          <FaShieldAlt className="h-6 w-6" />
        </div>
        <h2
          className="text-3xl font-semibold tracking-tight text-[#141210]"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
        >
          {t('changePassword.title')}
        </h2>
        <p className="mt-2 text-[#5c574f]">{t('changePassword.subtitle')}</p>
      </div>

      <div className="rounded-[18px] border border-[rgba(20,18,16,0.1)] bg-[#fffcf8] p-6 shadow-[0_4px_24px_rgba(20,18,16,0.04)] sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847a]">
              {t('changePassword.currentLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <FaLock className="h-4 w-4 text-[#8a847a] group-focus-within:text-[#1f3a34]" />
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                className={fieldClass(!!errors.currentPassword)}
                placeholder={t('changePassword.placeholderCurrent')}
                value={formData.currentPassword}
                onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a847a] hover:text-[#141210]"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-2 flex items-center text-sm text-red-500">
                <FaTimes className="mr-1 h-4 w-4" />
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847a]">
              {t('changePassword.newLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <FaLock className="h-4 w-4 text-[#8a847a] group-focus-within:text-[#1f3a34]" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                className={fieldClass(!!errors.newPassword)}
                placeholder={t('changePassword.placeholderNew')}
                value={formData.newPassword}
                onChange={(e) => handleFieldChange('newPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a847a] hover:text-[#141210]"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>

            {formData.newPassword && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[#5c574f]">{t('changePassword.strengthLabel')}</span>
                  <span className="font-medium text-[#1f3a34]">{passwordStrength.label}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#eceae4]">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {errors.newPassword && (
              <p className="mt-2 flex items-center text-sm text-red-500">
                <FaTimes className="mr-1 h-4 w-4" />
                {errors.newPassword}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847a]">
              {t('changePassword.confirmLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <FaLock className="h-4 w-4 text-[#8a847a] group-focus-within:text-[#1f3a34]" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className={fieldClass(!!errors.confirmPassword)}
                placeholder={t('changePassword.placeholderConfirm')}
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a847a] hover:text-[#141210]"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>

            {formData.confirmPassword && (
              <div className="mt-2">
                {formData.newPassword === formData.confirmPassword ? (
                  <p className="flex items-center text-sm text-[#1f3a34]">
                    <FaCheck className="mr-1 h-4 w-4" />
                    {t('changePassword.matchOk')}
                  </p>
                ) : (
                  <p className="flex items-center text-sm text-red-500">
                    <FaTimes className="mr-1 h-4 w-4" />
                    {t('changePassword.matchNo')}
                  </p>
                )}
              </div>
            )}

            {errors.confirmPassword && (
              <p className="mt-2 flex items-center text-sm text-red-500">
                <FaTimes className="mr-1 h-4 w-4" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(20,18,16,0.08)] bg-[#f7f6f3] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#141210]">{t('changePassword.requirementsTitle')}</h4>
            <ul className="space-y-2 text-sm text-[#5c574f]">
              <li className="flex items-center">
                <FaCheck className={`mr-2 h-4 w-4 ${formData.newPassword.length >= 8 ? 'text-[#1f3a34]' : 'text-[#c5c0b6]'}`} />
                {t('changePassword.reqLen')}
              </li>
              <li className="flex items-center">
                <FaCheck className={`mr-2 h-4 w-4 ${/(?=.*[a-z])/.test(formData.newPassword) ? 'text-[#1f3a34]' : 'text-[#c5c0b6]'}`} />
                {t('changePassword.reqLower')}
              </li>
              <li className="flex items-center">
                <FaCheck className={`mr-2 h-4 w-4 ${/(?=.*[A-Z])/.test(formData.newPassword) ? 'text-[#1f3a34]' : 'text-[#c5c0b6]'}`} />
                {t('changePassword.reqUpper')}
              </li>
              <li className="flex items-center">
                <FaCheck className={`mr-2 h-4 w-4 ${/(?=.*\d)/.test(formData.newPassword) ? 'text-[#1f3a34]' : 'text-[#c5c0b6]'}`} />
                {t('changePassword.reqNum')}
              </li>
              <li className="flex items-center">
                <FaCheck className={`mr-2 h-4 w-4 ${/(?=.*[@$!%*?&])/.test(formData.newPassword) ? 'text-[#1f3a34]' : 'text-[#c5c0b6]'}`} />
                {t('changePassword.reqSpecial')}
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-full bg-[#141210] px-6 py-3.5 text-sm font-semibold text-[#fffcf8] transition-colors hover:bg-[#1f3a34] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#fffcf8] border-t-transparent" />
                {t('changePassword.submitting')}
              </>
            ) : (
              <>
                <FaShieldAlt className="mr-2 h-4 w-4" />
                {t('changePassword.submit')}
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-[18px] border border-[rgba(20,18,16,0.1)] bg-[#fffcf8] p-6">
        <h3 className="mb-4 flex items-center text-lg font-semibold text-[#141210]">
          <FaShieldAlt className="mr-2 h-5 w-5 text-[#1f3a34]" />
          {t('changePassword.securityTips')}
        </h3>
        <ul className="space-y-3 text-sm text-[#5c574f]">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex items-start">
              <span className="mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#1f3a34]" />
              <span>{t(`changePassword.tip${n}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
