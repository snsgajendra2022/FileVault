import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/context/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaShieldAlt, FaArrowRight, FaArrowLeft, FaSave, FaStar } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';

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

  const inputBase =
    'w-full rounded-xl border bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all duration-200';
  const inputWithIcon =
    'w-full rounded-xl border bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all duration-200';

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
    role: 'USERS',
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
        if (value && !['USERS', 'STUDIO'].includes(value)) {
          return t('registerPage.validation.roleInvalid');
        }
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
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-violet-500/30 animate-pulse">
          OM
        </div>
        <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
        </div>
        <p className="text-xs text-slate-500">{t('registerPage.creatingAccount')}</p>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">{t('registerPage.personalInformation')}</h3>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelFirstName')}</label>
          <input
            type="text"
            required
            className={`${inputBase} ${errors.firstName ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderFirstName')}
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.firstName && <p className="text-sm text-rose-400">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelLastName')}</label>
          <input
            type="text"
            required
            className={`${inputBase} ${errors.lastName ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderLastName')}
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.lastName && <p className="text-sm text-rose-400">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelUsername')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaUser className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="text"
            required
            className={`${inputWithIcon} ${errors.username ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderUsername')}
            value={formData.username}
            onChange={(e) => handleFieldChange('username', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.username && <p className="text-sm text-rose-400">{errors.username}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelEmail')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaEnvelope className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="email"
            required
            className={`${inputWithIcon} ${errors.email ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderEmail')}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.email && <p className="text-sm text-rose-400">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelPhone')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaPhone className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="tel"
            className={`${inputWithIcon} ${errors.phone ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderPhone')}
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.phone && <p className="text-sm text-rose-400">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t('registerPage.labelPassword')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaShieldAlt className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className={`${inputWithIcon} pr-12 ${errors.password ? 'border-rose-400/70' : 'border-white/10'}`}
            placeholder={t('registerPage.placeholderPassword')}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {errors.password && <p className="text-sm text-rose-400">{errors.password}</p>}
        <div className="text-xs text-slate-500 mt-2">{t('registerPage.passwordRulesHint')}</div>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={nextStep}
          className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0c]"
        >
          {t('registerPage.next')}
          <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
            <select
              className={`w-full pl-12 pr-4 py-4 bg-white/10 border rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 appearance-none ${
                errors.role ? 'border-red-400' : 'border-white/20'
              }`}
              value={formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="USERS" className="bg-gray-800 text-white">
                {t('registerPage.roleRegular')}
              </option>
              <option value="STUDIO" className="bg-gray-800 text-white">
                {t('registerPage.roleStudio')}
              </option>
            </select>
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
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 selection:bg-violet-500/40">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[90px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/memories" className="flex min-w-0 items-center gap-3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-[1.02]">
              OM
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-[0.2em] uppercase text-violet-300/90">
                {t('brand.ourMemories')}
              </span>
              <span className="block truncate text-[10px] text-slate-500">{t('login.omFooterProduct')}</span>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/memories"
              className="hidden text-sm font-medium text-slate-300 hover:text-white transition-colors sm:inline"
            >
              {t('login.omExplore')}
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors sm:px-4 sm:text-sm"
            >
              {t('memoriesPlatform.signIn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pb-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_min(32rem,100%)] lg:items-start lg:gap-16">
          <div className="hidden lg:block">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-violet-200/90">
              <FaStar className="h-3 w-3 text-amber-300" />
              {t('memoriesPlatform.badge')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('registerPage.joinTitle')}
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-400 leading-relaxed">{t('registerPage.omJoinLead')}</p>
            <p className="mt-6 text-sm text-slate-500">{t('registerPage.joinSubtitle')}</p>
          </div>

          <div className="w-full max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-base font-black text-white shadow-lg shadow-violet-500/30">
                OM
              </div>
              <h1 className="text-2xl font-bold text-white">{t('registerPage.joinTitle')}</h1>
              <p className="mt-2 text-sm text-slate-400">{t('registerPage.joinSubtitle')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('registerPage.stepOf', { current: step, total: 2 })}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              {t('registerPage.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200 transition-colors">
                {t('registerPage.signInHere')}
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
              {t('login.termsPrefix')}{' '}
              <Link to="/privacy-policy" className="text-violet-400/90 hover:text-violet-300 underline-offset-2 hover:underline">
                {t('login.termsOfService')}
              </Link>{' '}
              {t('login.and')}{' '}
              <Link to="/privacy-policy" className="text-violet-400/90 hover:text-violet-300 underline-offset-2 hover:underline">
                {t('login.privacyPolicy')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
