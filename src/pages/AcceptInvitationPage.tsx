import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { FaEnvelope, FaUser, FaLock, FaCheck, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const AcceptInvitationPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    confirmPassword: string;
    email?: string;
  }>({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const invitationToken = searchParams.get('token');

  useEffect(() => {
    if (invitationToken) {
      setFormData((prev) => ({
        ...prev,
        email: searchParams.get('email') || '',
      }));
    }
  }, [invitationToken, searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('acceptInvitationPage.toastPasswordMismatch'));
      return false;
    }

    if (formData.password.length < 8) {
      toast.error(t('acceptInvitationPage.toastPasswordShort'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await api.post('/api/simple-invitations/accept', {
        invitationToken: invitationToken,
        username: formData.username,
        password: formData.password,
      });

      if (response.data.success) {
        setShowSuccess(true);
        toast.success(t('acceptInvitationPage.toastAccountCreated'));

        setTimeout(() => {
          const msg = encodeURIComponent(i18n.t('acceptInvitationPage.loginQueryMessage'));
          navigate(`/login?message=${msg}`);
        }, 3000);
      }
    } catch (error: unknown) {
      console.error('Error accepting invitation:', error);
      const err = error as { response?: { data?: { message?: string; success?: boolean } } };
      const message = err.response?.data?.message ?? i18n.t('acceptInvitationPage.errAccept');
      toast.error(message);
      if (err.response?.data?.success === false) {
        setInvalidMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!invitationToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('acceptInvitationPage.invalidTitle')}</h1>
            <p className="text-gray-600 mb-6">
              {t('acceptInvitationPage.invalidBody')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('acceptInvitationPage.goLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (invalidMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('acceptInvitationPage.problemTitle')}</h1>
            <p className="text-gray-600 mb-6">
              {invalidMessage}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('acceptInvitationPage.goLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-900 mb-2">{t('acceptInvitationPage.successTitle')}</h1>
            <p className="text-green-700 mb-6">
              {t('acceptInvitationPage.successBody')}
            </p>
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <span>{t('acceptInvitationPage.redirecting')}</span>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <FaEnvelope className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('acceptInvitationPage.mainTitle')}</h1>
          <p className="text-gray-600">
            {t('acceptInvitationPage.mainSubtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline h-4 w-4 mr-2 text-blue-500" />
                {t('acceptInvitationPage.username')}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder={t('acceptInvitationPage.placeholderUsername')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline h-4 w-4 mr-2 text-blue-500" />
                {t('acceptInvitationPage.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={t('acceptInvitationPage.placeholderPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                  aria-label={showPassword ? t('acceptInvitationPage.hidePassword') : t('acceptInvitationPage.showPassword')}
                >
                  {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('acceptInvitationPage.minPasswordHint')}</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <FaLock className="inline h-4 w-4 mr-2 text-blue-500" />
                {t('acceptInvitationPage.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={t('acceptInvitationPage.placeholderConfirm')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                  aria-label={showConfirmPassword ? t('acceptInvitationPage.hidePassword') : t('acceptInvitationPage.showPassword')}
                >
                  {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    {t('acceptInvitationPage.creating')}
                  </>
                ) : (
                  <>
                    <FaArrowRight className="h-5 w-5 mr-3" />
                    {t('acceptInvitationPage.submitBtn')}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('acceptInvitationPage.alreadyHaveAccount')}{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {t('acceptInvitationPage.signInHere')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
