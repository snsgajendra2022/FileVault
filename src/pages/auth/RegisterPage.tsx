import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/context/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaShieldAlt, FaArrowRight, FaArrowLeft, FaSave, FaStar } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omBadge,
  omCard,
  omCardTitle,
  omCtaSolid,
  omHeading,
  omHeroTitle,
  omInput,
  omInputPlain,
  omLabel,
  omLead,
  omLinkAccent,
  omLoadingPage,
  omMuted,
  omNavLink,
  omPrimaryBtn,
} from '../../components/auth/publicMemoriesTheme';

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

  const inputBase = `${omInputPlain} duration-200`;
  const inputWithIcon = `${omInput} duration-200`;
  const inputErr = 'border-rose-400/70';
  const inputOk = 'border-slate-200 dark:border-white/10';

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
      <div className={omLoadingPage}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-violet-500/30 animate-pulse">
          OM
        </div>
        <div className="h-1.5 w-24 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
        </div>
        <p className={`text-xs ${omMuted}`}>{t('registerPage.creatingAccount')}</p>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className={`text-lg font-bold ${omHeading}`}>{t('registerPage.personalInformation')}</h3>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={`block ${omLabel}`}>{t('registerPage.labelFirstName')}</label>
          <input
            type="text"
            required
            className={`${inputBase} ${errors.firstName ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderFirstName')}
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.firstName && <p className="text-sm text-rose-400">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <label className={`block ${omLabel}`}>{t('registerPage.labelLastName')}</label>
          <input
            type="text"
            required
            className={`${inputBase} ${errors.lastName ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderLastName')}
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.lastName && <p className="text-sm text-rose-400">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className={`block ${omLabel}`}>{t('registerPage.labelUsername')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaUser className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="text"
            required
            className={`${inputWithIcon} ${errors.username ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderUsername')}
            value={formData.username}
            onChange={(e) => handleFieldChange('username', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.username && <p className="text-sm text-rose-400">{errors.username}</p>}
      </div>

      <div className="space-y-2">
        <label className={`block ${omLabel}`}>{t('registerPage.labelEmail')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaEnvelope className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="email"
            required
            className={`${inputWithIcon} ${errors.email ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderEmail')}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.email && <p className="text-sm text-rose-400">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label className={`block ${omLabel}`}>{t('registerPage.labelPhone')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaPhone className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="tel"
            className={`${inputWithIcon} ${errors.phone ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderPhone')}
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.phone && <p className="text-sm text-rose-400">{errors.phone}</p>}
      </div>

      <div className="space-y-2">
        <label className={`block ${omLabel}`}>{t('registerPage.labelPassword')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaShieldAlt className="h-4 w-4 text-slate-500 group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className={`${inputWithIcon} pr-12 ${errors.password ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderPassword')}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {errors.password && <p className="text-sm text-rose-400">{errors.password}</p>}
        <div className={`text-xs mt-2 ${omMuted}`}>{t('registerPage.passwordRulesHint')}</div>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={nextStep}
          className={omPrimaryBtn}
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
        <label className={`block text-sm font-semibold ${omHeading}`}>{t('registerPage.labelAccountType')}</label>
        <select
          className={`${inputBase} py-4 rounded-2xl appearance-none`}
          value={formData.accountType}
          onChange={(e) => handleFieldChange('accountType', e.target.value)}
          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
        >
          <option value="FREE">
            {t('registerPage.accountTypeFree')}
          </option>
        </select>
      </div>

      <div className="space-y-2">
        <label className={`block text-sm font-semibold ${omHeading}`}>{t('registerPage.labelCompany')}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaBuilding className="h-5 w-5 text-slate-500 group-focus-within:text-violet-600 dark:group-focus-within:text-violet-300 transition-colors" />
          </div>
          <input
            type="text"
            className={`${inputWithIcon} py-4 rounded-2xl ${errors.company ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderCompany')}
            value={formData.company}
            onChange={(e) => handleFieldChange('company', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
        </div>
        {errors.company && <p className="text-sm text-rose-500 dark:text-rose-400">{errors.company}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={`block text-sm font-semibold ${omHeading}`}>{t('registerPage.labelRole')}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaBriefcase className="h-5 w-5 text-slate-500 group-focus-within:text-violet-600 dark:group-focus-within:text-violet-300 transition-colors" />
            </div>
            <select
              className={`${inputWithIcon} py-4 rounded-2xl appearance-none ${errors.role ? inputErr : inputOk}`}
              value={formData.role}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="USERS">{t('registerPage.roleRegular')}</option>
              <option value="STUDIO">{t('registerPage.roleStudio')}</option>
            </select>
          </div>
          {errors.role && <p className="text-sm text-rose-500 dark:text-rose-400">{errors.role}</p>}
        </div>
        <div className="space-y-2">
          <label className={`block text-sm font-semibold ${omHeading}`}>{t('registerPage.labelDepartment')}</label>
          <input
            type="text"
            className={`${inputBase} py-4 rounded-2xl ${errors.department ? inputErr : inputOk}`}
            placeholder={t('registerPage.placeholderDepartment')}
            value={formData.department}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          />
          {errors.department && <p className="text-sm text-rose-500 dark:text-rose-400">{errors.department}</p>}
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <button
          type="button"
          onClick={prevStep}
          className="flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-slate-800 dark:text-white bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-300"
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
          className={`flex-1 group flex justify-center py-4 px-6 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-violet-500/20`}
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
    <PublicMemoriesShell
      showBrandBlock
      headerActions={
        <>
          <Link to="/memories" className={`hidden sm:inline ${omNavLink}`}>
            {t('login.omExplore')}
          </Link>
          <Link to="/login" className={`${omCtaSolid} px-3 py-2 text-xs sm:px-4 sm:text-sm`}>
            {t('memoriesPlatform.signIn')}
          </Link>
        </>
      }
    >
        <div className="grid gap-12 lg:grid-cols-[1fr_min(32rem,100%)] lg:items-start lg:gap-16">
          <div className="hidden lg:block">
            <p className={`mb-4 ${omBadge}`}>
              <FaStar className="h-3 w-3 text-amber-500 dark:text-amber-300" />
              {t('memoriesPlatform.badge')}
            </p>
            <h1 className={`text-4xl font-bold tracking-tight md:text-5xl ${omHeroTitle}`}>
              {t('registerPage.joinTitle')}
            </h1>
            <p className={`mt-5 max-w-md text-lg leading-relaxed ${omLead}`}>{t('registerPage.omJoinLead')}</p>
            <p className={`mt-6 text-sm ${omMuted}`}>{t('registerPage.joinSubtitle')}</p>
          </div>

          <div className="w-full max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-base font-black text-white shadow-lg shadow-violet-500/30">
                OM
              </div>
              <h1 className={`text-2xl font-bold ${omHeading}`}>{t('registerPage.joinTitle')}</h1>
              <p className={`mt-2 text-sm ${omLead}`}>{t('registerPage.joinSubtitle')}</p>
              <p className={`mt-1 text-xs ${omMuted}`}>{t('registerPage.stepOf', { current: step, total: 2 })}</p>
            </div>

            <div className={`${omCard} p-6 sm:p-8`}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </div>

            <p className={`mt-8 text-center text-sm ${omMuted}`}>
              {t('registerPage.alreadyHaveAccount')}{' '}
              <Link to="/login" className={omLinkAccent}>
                {t('registerPage.signInHere')}
              </Link>
            </p>

            <p className={`mt-6 text-center text-xs leading-relaxed ${omMuted}`}>
              {t('login.termsPrefix')}{' '}
              <Link to="/privacy-policy" className={`${omLinkAccent} underline-offset-2 hover:underline`}>
                {t('login.termsOfService')}
              </Link>{' '}
              {t('login.and')}{' '}
              <Link to="/privacy-policy" className={`${omLinkAccent} underline-offset-2 hover:underline`}>
                {t('login.privacyPolicy')}
              </Link>
            </p>
          </div>
        </div>
    </PublicMemoriesShell>
  );
};

export default RegisterPage;
