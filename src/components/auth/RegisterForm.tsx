import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RegistrationData } from '../../types/auth';
import toast from 'react-hot-toast';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaSave,
  FaLock,
  FaArrowRight,
  FaArrowLeft,
  FaStar,
} from 'react-icons/fa';
import api from '../../api/client/axiosInstance';

const RegisterForm = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const tv = (key: string) => t(`registerPage.validation.${key}`);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegistrationData>({
    defaultValues: {
      accountType: 'FREE',
      role: 'USERS',
    },
  });

  const onSubmit = async (data: RegistrationData) => {
    setLoading(true);
    try {
      const myHeaders = new Headers();
      myHeaders.append('accept', '*/*');
      myHeaders.append('Content-Type', 'application/json');

      const raw = JSON.stringify({
        username: data.username,
        password: data.password,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        company: data.company || '',
        role: data.role || '',
        department: data.department || 'subscribed',
        accountType: data.accountType || 'FREE',
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
      };

      const response = await fetch(process.env.REACT_APP_API_URL + '/api/auth/register', requestOptions);
      const result = await response.text();

      if (response.ok) {
        const newUser = JSON.parse(result);
        try {
          await api.post(`/api/mobile-apps${newUser.id}`, { appNameId: newUser.username, userId: newUser.id });
          await api.put(`/api/auth/admin/users/${newUser.id}/verify`);
        } catch {
          // Optional post-registration steps; user is still registered
        }
        toast.success(t('registerPage.toastRegistrationSuccessOm'));
        navigate('/studio/dashboard');
      } else {
        toast.error(`${t('registerPage.toastRegistrationFailed')}: ${result}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('registerPage.toastRegistrationFailed');
      toast.error(message || t('registerPage.toastRegistrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const ok = await trigger(['username', 'email', 'firstName', 'lastName', 'phone', 'password']);
    if (ok) setStep(2);
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all';
  const inputPlainClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all';

  const primaryBtn =
    'group relative flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0c] disabled:cursor-not-allowed disabled:opacity-50';

  const secondaryBtn =
    'group flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2 focus:ring-offset-[#0a0a0c]';

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 dark:selection:bg-violet-500/40 transition-colors duration-200">
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
        <div className="grid gap-12 lg:grid-cols-[1fr_min(28rem,100%)] lg:items-start lg:gap-16">
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

          <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-base font-black text-white shadow-lg shadow-violet-500/30">
                OM
              </div>
              <h1 className="text-2xl font-bold text-white">{t('registerPage.joinTitle')}</h1>
              <p className="mt-2 text-sm text-slate-400">{t('registerPage.joinSubtitle')}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('registerPage.stepOf', { current: step, total: 2 })}
                </p>
                <div className="flex flex-1 max-w-[120px] gap-1.5">
                  <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-white/10'}`} />
                  <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-white/10'}`} />
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {step === 1 && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-bold text-white">{t('registerPage.personalInformation')}</h3>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelUsername')}
                      </label>
                      <div className="relative">
                        <FaUser className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          autoComplete="username"
                          {...register('username', {
                            required: tv('usernameRequired'),
                            minLength: { value: 3, message: tv('usernameMin') },
                          })}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderUsername')}
                        />
                      </div>
                      {errors.username && <p className="mt-1 text-sm text-rose-400">{errors.username.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelEmail')}
                      </label>
                      <div className="relative">
                        <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          autoComplete="email"
                          {...register('email', {
                            required: tv('emailRequired'),
                            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: tv('emailInvalid') },
                          })}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderEmail')}
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-sm text-rose-400">{errors.email.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {t('registerPage.labelFirstName')}
                        </label>
                        <input
                          type="text"
                          autoComplete="given-name"
                          {...register('firstName', { required: tv('firstNameRequired') })}
                          className={inputPlainClass}
                          placeholder={t('registerPage.placeholderFirstName')}
                        />
                        {errors.firstName && <p className="mt-1 text-sm text-rose-400">{errors.firstName.message}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {t('registerPage.labelLastName')}
                        </label>
                        <input
                          type="text"
                          autoComplete="family-name"
                          {...register('lastName', { required: tv('lastNameRequired') })}
                          className={inputPlainClass}
                          placeholder={t('registerPage.placeholderLastName')}
                        />
                        {errors.lastName && <p className="mt-1 text-sm text-rose-400">{errors.lastName.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelPhone')}
                      </label>
                      <div className="relative">
                        <FaPhone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          autoComplete="tel"
                          {...register('phone', { required: tv('phoneRequired') })}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderPhone')}
                        />
                      </div>
                      {errors.phone && <p className="mt-1 text-sm text-rose-400">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelPassword')}
                      </label>
                      <div className="relative">
                        <FaLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          autoComplete="new-password"
                          {...register('password', {
                            required: tv('passwordRequired'),
                            minLength: { value: 8, message: tv('passwordMin') },
                          })}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderPassword')}
                        />
                      </div>
                      {errors.password && <p className="mt-1 text-sm text-rose-400">{errors.password.message}</p>}
                      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{t('registerPage.passwordRulesHint')}</p>
                    </div>

                    <button type="button" onClick={handleNext} className={`${primaryBtn} w-full`}>
                      {t('registerPage.next')}
                      <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-bold text-white">{t('registerPage.businessInformation')}</h3>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelCompany')}
                      </label>
                      <div className="relative">
                        <FaBuilding className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          {...register('company')}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderCompany')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelRole')}
                      </label>
                      <div className="relative">
                        <FaUser className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <select
                          {...register('role', {
                            validate: (v) =>
                              !v || ['USERS', 'STUDIO'].includes(String(v)) || tv('roleInvalid'),
                          })}
                          className={`${inputClass} appearance-none py-3.5`}
                          defaultValue="USERS"
                        >
                          <option value="USERS">{t('registerPage.roleRegular')}</option>
                          <option value="STUDIO">{t('registerPage.roleStudio')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('registerPage.labelDepartment')}
                      </label>
                      <div className="relative">
                        <FaBuilding className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          {...register('department')}
                          className={inputClass}
                          placeholder={t('registerPage.placeholderDepartment')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-0 sm:flex-row sm:gap-4">
                      <button type="button" onClick={() => setStep(1)} className={secondaryBtn}>
                        <FaArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        {t('registerPage.previous')}
                      </button>
                      <button type="submit" disabled={loading} className={primaryBtn}>
                        {loading ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            {t('registerPage.creatingAccount')}
                          </>
                        ) : (
                          <>
                            <FaSave className="h-4 w-4" />
                            {t('registerPage.createAccount')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              {t('registerPage.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200">
                {t('registerPage.signInHere')}
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
              {t('login.termsPrefix')}{' '}
              <Link to="/privacy-policy" className="text-violet-400/90 hover:text-violet-300 underline-offset-2 hover:underline">
                {t('login.termsOfService')}
              </Link>
              {' '}
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

export default RegisterForm;
