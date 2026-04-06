import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaShieldAlt, FaArrowRight, FaArrowLeft, FaUsers, FaSave } from 'react-icons/fa';
import api from '../services/api';

interface RegistrationData {
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
  canViewImages?: boolean;
  canUploadImages?: boolean;
  canDeleteImages?: boolean;
  canManageAlbums?: boolean;
  canDownloadImages?: boolean;
}

interface ValidationErrors {
  username?: string;
  password?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  role?: string;
  department?: string;
}

const RegisterPage = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Handle redirect based on user type after successful registration or if already authenticated
  useEffect(() => {
    if (user) {
      if (user.accountType === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/studio/dashboard');
      }
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<RegistrationData>({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    accountType: 'FREE',
    company: '',
    role: '',
    department: 'subscribed',
    canViewImages : true,
    canUploadImages : true,
    canDeleteImages : false,
    canManageAlbums : true,
    canDownloadImages : true,
  });

  // Validation functions
  const validateField = useCallback((name: string, value: string): string | undefined => {
    switch (name) {
      case 'username':
        if (!value.trim()) return t('registerPage.validation.usernameRequired');
        if (value.length < 3) return t('registerPage.validation.usernameMin');
        if (value.length > 20) return t('registerPage.validation.usernameMax');
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return t('registerPage.validation.usernamePattern');
        break;
      
      case 'password':
        if (!value) return t('registerPage.validation.passwordRequired');
        if (value.length < 8) return t('registerPage.validation.passwordMin');
        if (!/(?=.*[a-z])/.test(value)) return t('registerPage.validation.passwordLower');
        if (!/(?=.*[A-Z])/.test(value)) return t('registerPage.validation.passwordUpper');
        if (!/(?=.*\d)/.test(value)) return t('registerPage.validation.passwordNumber');
        if (!/(?=.*[@$!%*?&])/.test(value)) return t('registerPage.validation.passwordSpecial');
        break;
      
      case 'email':
        if (!value.trim()) return t('registerPage.validation.emailRequired');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('registerPage.validation.emailInvalid');
        break;
      
      case 'firstName':
        if (!value.trim()) return t('registerPage.validation.firstNameRequired');
        if (value.length < 2) return t('registerPage.validation.firstNameMin');
        if (value.length > 50) return t('registerPage.validation.firstNameMax');
        if (!/^[a-zA-Z\s]+$/.test(value)) return t('registerPage.validation.firstNamePattern');
        break;
      
      case 'lastName':
        if (!value.trim()) return t('registerPage.validation.lastNameRequired');
        if (value.length < 2) return t('registerPage.validation.lastNameMin');
        if (value.length > 50) return t('registerPage.validation.lastNameMax');
        if (!/^[a-zA-Z\s]+$/.test(value)) return t('registerPage.validation.lastNamePattern');
        break;
      
      case 'phone':
        if (!value.trim()) return t('registerPage.validation.phoneRequired');
        if (!/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          return t('registerPage.validation.phoneInvalid');
        }
        break;
      
      case 'company':
        if (value && value.length > 100) return t('registerPage.validation.companyMax');
        break;
      
      case 'role':
        if (value && value.length > 100) return t('registerPage.validation.roleMax');
        break;
      
      case 'department':
        if (value && value.length > 100) return t('registerPage.validation.departmentMax');
        break;
    }
    return undefined;
  }, [t]);

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (stepNumber === 1) {
      const fieldsToValidate = ['username', 'password', 'email', 'firstName', 'lastName', 'phone'];
      fieldsToValidate.forEach(field => {
        const error = validateField(field, formData[field as keyof RegistrationData] as string);
        if (error) newErrors[field as keyof ValidationErrors] = error;
      });
    } else if (stepNumber === 2) {
      const fieldsToValidate = ['company', 'role', 'department'];
      fieldsToValidate.forEach(field => {
        const error = validateField(field, formData[field as keyof RegistrationData] as string);
        if (error) newErrors[field as keyof ValidationErrors] = error;
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      toast.error(i18n.t('registerPage.toastFixValidationSubmit'));
      return;
    }

    setLoading(true);
    try {
      // Register the user
      await register(formData);
      
      // After successful registration, upgrade the user's plan
      try {
        // Map account types to plan IDs (you may need to adjust these based on your API)
        const planIdMap: { [key: string]: number } = {
          'FREE': 1,
        };

        const upgradeData = {
          planId: 1,
          billingCycle: 'MONTHLY',
          prorate: true
        }; 

        await api.post('/api/plans/subscribe', upgradeData);
        toast.success(
          i18n.t('registerPage.toastRegistrationSuccessPlan', { plan: formData.accountType })
        );
      } catch (upgradeError: any) {
        console.error('Plan upgrade failed:', upgradeError);
        toast.success(i18n.t('registerPage.toastRegistrationSuccessWelcome'));
        // Don't fail the registration if plan upgrade fails
      }
      
      // The register function will update the user state and trigger the useEffect for redirect
    } catch (error: any) {
      toast.error(error.message || i18n.t('registerPage.toastRegistrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep(1)) {
      setStep(step + 1);
    } else {
      toast.error(i18n.t('registerPage.toastFixValidationNext'));
    }
  };
  
  const prevStep = () => setStep(step - 1);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white/10"></div>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white/90 mb-6">{t('registerPage.personalInformation')}</h3>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelFirstName')}</label>
          <input
            type="text"
            required
            className={`w-full px-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.firstName ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderFirstName')}
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.firstName && <p className="text-sm text-red-300">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelLastName')}</label>
          <input
            type="text"
            required
            className={`w-full px-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.lastName ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderLastName')}
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.lastName && <p className="text-sm text-red-300">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelUsername')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaUser className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
          </div>
          <input
            type="text"
            required
            className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.username ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderUsername')}
            value={formData.username}
            onChange={(e) => handleFieldChange('username', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        {errors.username && <p className="text-sm text-red-300">{errors.username}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelEmail')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaEnvelope className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
          </div>
          <input
            type="email"
            required
            className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.email ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderEmail')}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelPhone')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaPhone className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
          </div>
          <input
            type="tel"
            className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.phone ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderPhone')}
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        {errors.phone && <p className="text-sm text-red-300">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelPassword')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaShieldAlt className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className={`w-full pl-12 pr-12 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.password ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderPassword')}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button
              type="button"
              className="text-white hover:text-white transition-colors duration-200 drop-shadow-sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        {errors.password && <p className="text-sm text-red-300">{errors.password}</p>}
        <div className="text-xs text-white/60 mt-2">{t('registerPage.passwordRulesHint')}</div>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={nextStep}
          className="group relative w-full flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          <div className="flex items-center">
            <FaArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            {t('registerPage.next')}
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white/90 mb-6">{t('registerPage.businessInformation')}</h3>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelAccountType')}</label>
        <select
          className="w-full px-4 py-4 bg-black border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none"
          value={formData.accountType}
          onChange={(e) => handleFieldChange('accountType', e.target.value)}
          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
        >
          <option value="FREE" className="bg-gray-800 text-white">
            {t('registerPage.accountTypeFree')}
          </option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelCompany')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaBuilding className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
          </div>
          <input
            type="text"
            className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.company ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderCompany')}
            value={formData.company}
            onChange={(e) => handleFieldChange('company', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        </div>
        {errors.company && <p className="text-sm text-red-300">{errors.company}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelRole')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaBriefcase className="h-5 w-5 text-white group-focus-within:text-white transition-colors drop-shadow-sm text-icon" />
            </div>
            <input
              type="text"
              className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
                errors.role ? 'border-red-400' : 'border-white/20'
              }`}
              placeholder={t('registerPage.placeholderRole')}
              value={formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
          </div>
          {errors.role && <p className="text-sm text-red-300">{errors.role}</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">{t('registerPage.labelDepartment')}</label>
          <input
            type="text"
            className={`w-full px-4 py-4 bg-white/10 border rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
              errors.department ? 'border-red-400' : 'border-white/20'
            }`}
            placeholder={t('registerPage.placeholderDepartment')}
            value={formData.department}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.department && <p className="text-sm text-red-300">{errors.department}</p>}
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <button
          type="button"
          onClick={prevStep}
          className="flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-white/10 border border-white/20 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <FaArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            {t('registerPage.previous')}
          </div>
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
              {t('registerPage.creatingAccount')}
            </div>
          ) : (
            <div className="flex items-center">
              <FaSave className="mr-2 h-5 w-5 group-hover:animate-pulse" />
              {t('registerPage.createAccount')}
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl mb-6">
            <FaUsers className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4 p-[1%]">
            {t('registerPage.joinTitle')}
          </h1>
          <p className="text-xl text-white/80 font-medium">{t('registerPage.joinSubtitle')}</p>
          <p className="text-sm text-white/60 mt-2">{t('registerPage.stepOf', { current: step, total: 2 })}</p>
        </div>

        {/* Registration Form */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-3xl"></div>
          <div className="relative z-10">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-white/70">
            {t('registerPage.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-semibold text-purple-300 hover:text-purple-200 transition-colors">
              {t('registerPage.signInHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
