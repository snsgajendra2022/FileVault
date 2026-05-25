import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import toast from 'react-hot-toast';
import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaUser,
  FaArrowRight,
  FaEnvelope,
  FaPhone,
  FaStar,
  FaImages,
  FaQrcode,
  FaShieldAlt,
} from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omAltBtn,
  omCard,
  omCardTitle,
  omDivider,
  omHeading,
  omInput,
  omInputPlain,
  omLabel,
  omLead,
  omLinkAccent,
  omLoadingPage,
  omMuted,
  omNavLink,
  omCtaSolid,
  omPrimaryBtn,
  omBadge,
} from '../../components/auth/publicMemoriesTheme';

const LoginPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loginMode, setLoginMode] = useState<'password' | 'emailOtp' | 'phoneOtp'>('emailOtp');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, requestLoginOtp, verifyLoginOtp, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      if (user.accountType === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/studio/dashboard');
      }
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await api.get<{ flags?: Array<{ name: string; value: boolean }> }>('/api/flags');
        const flags = Array.isArray(res.data?.flags) ? res.data.flags : [];
        const emailFlag = flags.find((x) => x.name === 'isEmail');
        const phoneFlag = flags.find((x) => x.name === 'isPhone');
        const canEmail = emailFlag?.value ?? true;
        const canPhone = phoneFlag?.value ?? true;
        setShowEmailOtp(canEmail);
        setShowPhoneOtp(canPhone);
        if (loginMode === 'emailOtp' && !canEmail) setLoginMode(canPhone ? 'phoneOtp' : 'password');
        if (loginMode === 'phoneOtp' && !canPhone) setLoginMode(canEmail ? 'emailOtp' : 'password');
      } catch {
        setShowEmailOtp(false);
        setShowPhoneOtp(false);
        setLoginMode('password');
      }
    };
    fetchFlags();
  }, [loginMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      toast.success(t('login.welcomeBackToast'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('login.loginFailed');
      toast.error(message || t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginMode === 'emailOtp') {
        if (!email.trim()) {
          toast.error(t('login.enterEmail'));
          return;
        }
        await requestLoginOtp({ email: email.trim() });
      } else {
        if (!phone.trim()) {
          toast.error(t('login.enterPhone'));
          return;
        }
        await requestLoginOtp({ phone: phone.trim() });
      }
      setOtpRequested(true);
      toast.success(t('login.otpSent'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('login.otpSendFailed');
      toast.error(message || t('login.otpSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!otp.trim()) {
        toast.error(t('login.enterOtp'));
        return;
      }
      if (loginMode === 'emailOtp') {
        await verifyLoginOtp({ email: email.trim(), otp: otp.trim() });
      } else {
        await verifyLoginOtp({ phone: phone.trim(), otp: otp.trim() });
      }
      toast.success(t('login.loginSuccess'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('login.otpVerifyFailed');
      toast.error(message || t('login.otpVerifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={omLoadingPage}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-violet-500/30 animate-pulse">
          <img src="/favicon.svg" alt={t('brand.ourMemories')} className="h-10 w-10" />
        </div>
        <div className="h-1.5 w-24 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
        </div>
        <p className={`text-xs ${omMuted}`}>{t('login.signingIn')}</p>
      </div>
    );
  }

  const inputClass = omInput;
  const otpInputClass = omInputPlain;
  const primaryBtn = omPrimaryBtn;
  const altOptionBtn = omAltBtn;

  const switchMode = (mode: 'password' | 'emailOtp' | 'phoneOtp') => {
    setLoginMode(mode);
    setOtpRequested(false);
    setOtp('');
  };

  const showAltPassword = loginMode !== 'password';
  const showAltEmail = showEmailOtp && loginMode !== 'emailOtp';
  const showAltPhone = showPhoneOtp && loginMode !== 'phoneOtp';
  const hasAlternateOptions = showAltPassword || showAltEmail || showAltPhone;
  const alternateOptionCount =
    Number(showAltPassword) + Number(showAltEmail) + Number(showAltPhone);
  const alternateOptionsGridClass =
    alternateOptionCount <= 1
      ? 'grid grid-cols-1 gap-2'
      : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  const cardTitle =
    loginMode === 'password'
      ? t('login.usernameTab')
      : loginMode === 'emailOtp'
        ? t('login.emailOtpTab')
        : t('login.phoneOtpTab');

  const cardSubtitle =
    loginMode === 'password'
      ? t('login.passwordCardSubtitle')
      : loginMode === 'emailOtp'
        ? t('login.emailOtpCardSubtitle')
        : t('login.phoneOtpCardSubtitle');

  return (
    <PublicMemoriesShell
      showBrandBlock
      headerActions={
        <>
          <Link to="/memories" className={`hidden sm:inline ${omNavLink}`}>
            {t('login.omExplore')}
          </Link>
          <Link to="/register" className={`${omCtaSolid} px-3 py-2 text-xs sm:px-4 sm:text-sm`}>
            {t('memoriesPlatform.getStarted')}
          </Link>
        </>
      }
    >
        <div className="grid gap-12 lg:grid-cols-[1fr_min(28rem,100%)] lg:items-center lg:gap-16">
        
          
          <div className="hidden lg:block max-w-lg xl:max-w-xl">
            <p className={`mb-5 ${omBadge} text-[11px] uppercase tracking-[0.2em] px-3.5 py-1.5`}>
              <FaStar className="h-3 w-3 text-amber-500 dark:text-amber-300" />
              {t('memoriesPlatform.badge')}
            </p>
            <h1 className={`text-4xl font-semibold tracking-tight xl:text-[2.75rem] xl:leading-[1.1] ${omHeading}`}>
              {t('login.omSignInTitle')}
            </h1>
            <p className={`mt-6 text-base leading-relaxed xl:text-lg ${omLead}`}>{t('login.omSignInLead')}</p>
            <p className={`mt-4 text-sm ${omMuted}`}>{t('login.signInSubtitle')}</p>

            <div className="mt-11">
              <div className="rounded-[1.75rem] bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-violet-600/10 dark:from-violet-500/35 dark:via-fuchsia-500/20 p-px shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                <div className="overflow-hidden rounded-[1.7rem] bg-slate-100 dark:bg-[#070708]">
                  <div className="relative aspect-[16/10] w-full overflow-hidden" aria-hidden>
                    <div className="absolute inset-0 bg-[conic-gradient(from_200deg_at_65%_15%,#5b21b6,#be185d,#0f172a,#6d28d9)] opacity-[0.92]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_120%,rgba(0,0,0,0.88),transparent_65%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(255,255,255,0.14),transparent_45%)]" />
                    <div
                      className="absolute inset-0 opacity-[0.12]"
                      style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: '28px 28px',
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-900/40">
                          <img src="/favicon.svg" alt="" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{t('brand.ourMemories')}</p>
                          <p className="truncate text-[10px] text-slate-400">{t('memoriesPlatform.heroTitle')}</p>
                        </div>
                      </div>
                      <div className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-300 sm:block">
                        {t('memoriesPlatform.ctaLearn')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className={`mt-5 max-w-md text-xs leading-relaxed ${omMuted}`}>{t('memoriesPlatform.heroSubtitle')}</p>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-base font-black text-white shadow-lg shadow-violet-500/30">
                <img src="/favicon.svg" alt={t('brand.ourMemories')} className="h-10 w-10" />
              </div>
              <h1 className={`text-2xl font-bold ${omHeading}`}>{t('login.omSignInTitle')}</h1>
              <p className={`mt-2 text-sm ${omLead}`}>{t('login.omSignInLead')}</p>
            </div>

            <div className={`${omCard} p-6 sm:p-8`}>
              <div className="mb-6 text-center sm:text-left">
                <h2 className={omCardTitle}>{cardTitle}</h2>
                <p className={`mt-1.5 text-sm leading-relaxed ${omMuted}`}>{cardSubtitle}</p>
              </div>

              {loginMode === 'password' && (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="username" className={`mb-1.5 block ${omLabel}`}>
                      {t('login.username')}
                    </label>
                    <div className="relative">
                      <FaUser className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className={inputClass}
                        placeholder={t('login.usernamePlaceholder')}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className={`mb-1.5 block ${omLabel}`}>
                      {t('login.password')}
                    </label>
                    <div className="relative">
                      <FaLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className={`${inputClass} pr-12`}
                        placeholder={t('login.passwordPlaceholder')}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <label className={`flex cursor-pointer items-center gap-2 ${omLead}`}>
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-violet-600 focus:ring-violet-500/40"
                      />
                      <span>{t('login.rememberMe')}</span>
                    </label>
                    <Link to="/forgot-password" className={omLinkAccent}>
                      {t('login.forgotPassword')}
                    </Link>
                  </div>

                  <button type="submit" disabled={loading} className={primaryBtn}>
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('login.signingIn')}
                      </>
                    ) : (
                      <>
                        {t('login.signIn')}
                        <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {loginMode === 'emailOtp' && (
                <form className="space-y-5" onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}>
                  <div>
                    <label htmlFor="email-login" className={`mb-1.5 block ${omLabel}`}>
                      {t('login.email')}
                    </label>
                    <div className="relative">
                      <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="email-login"
                        name="email"
                        type="email"
                        required
                        className={inputClass}
                        placeholder={t('login.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={otpRequested}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {otpRequested && (
                    <div>
                      <label htmlFor="otp-email" className={`mb-1.5 block ${omLabel}`}>
                        {t('login.verificationOtp')}
                      </label>
                      <input
                        id="otp-email"
                        name="otp"
                        type="text"
                        required
                        className={otpInputClass}
                        placeholder={t('login.otpPlaceholder')}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </div>
                  )}

                  <button type="submit" disabled={loading} className={primaryBtn}>
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {otpRequested ? t('login.verifying') : t('login.sendingOtp')}
                      </>
                    ) : (
                      <>
                        {otpRequested ? t('login.verifyAndSignIn') : t('login.sendOtp')}
                        <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  {otpRequested && (
                    <button
                      type="button"
                      onClick={() => setOtpRequested(false)}
                      className={`w-full py-2 text-sm ${omLead} hover:text-slate-900 dark:hover:text-white transition-colors`}
                    >
                      {t('login.changeEmail')}
                    </button>
                  )}
                </form>
              )}

              {loginMode === 'phoneOtp' && (
                <form className="space-y-5" onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}>
                  <div>
                    <label htmlFor="phone-login" className={`mb-1.5 block ${omLabel}`}>
                      {t('login.mobileNumber')}
                    </label>
                    <div className="relative">
                      <FaPhone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="phone-login"
                        name="phone"
                        type="tel"
                        required
                        className={inputClass}
                        placeholder={t('login.mobilePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={otpRequested}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {otpRequested && (
                    <div>
                      <label htmlFor="otp-phone" className={`mb-1.5 block ${omLabel}`}>
                        {t('login.verificationOtp')}
                      </label>
                      <input
                        id="otp-phone"
                        name="otp"
                        type="text"
                        required
                        className={otpInputClass}
                        placeholder={t('login.otpPlaceholder')}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </div>
                  )}

                  <button type="submit" disabled={loading} className={primaryBtn}>
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {otpRequested ? t('login.verifying') : t('login.sendingOtp')}
                      </>
                    ) : (
                      <>
                        {otpRequested ? t('login.verifyAndSignIn') : t('login.sendOtp')}
                        <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  {otpRequested && (
                    <button
                      type="button"
                      onClick={() => setOtpRequested(false)}
                      className={`w-full py-2 text-sm ${omLead} hover:text-slate-900 dark:hover:text-white transition-colors`}
                    >
                      {t('login.changeMobile')}
                    </button>
                  )}
                </form>
              )}

              {hasAlternateOptions && (
                <div className={`mt-8 ${omDivider} pt-6`}>
                  <p className={`mb-4 text-center text-xs font-semibold uppercase tracking-wide ${omMuted}`}>
                    {t('login.otherSignInOptions')}
                  </p>
                  <div className={alternateOptionsGridClass}>
                    {showAltPassword && (
                      <button type="button" className={altOptionBtn} onClick={() => switchMode('password')}>
                        <FaUser className="h-4 w-4 shrink-0 text-violet-300" />
                        {t('login.usePasswordInstead')}
                      </button>
                    )}
                    {showAltEmail && (
                      <button type="button" className={altOptionBtn} onClick={() => switchMode('emailOtp')}>
                        <FaEnvelope className="h-4 w-4 shrink-0 text-violet-300" />
                        {t('login.useEmailCodeInstead')}
                      </button>
                    )}
                    {showAltPhone && (
                      <button type="button" className={altOptionBtn} onClick={() => switchMode('phoneOtp')}>
                        <FaPhone className="h-4 w-4 shrink-0 text-violet-300" />
                        {t('login.useMobileCodeInstead')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p className={`mt-8 text-center text-sm ${omMuted}`}>
                {t('login.noAccount')}{' '}
                <Link to="/register" className={omLinkAccent}>
                  {t('login.signUpHere')}
                </Link>
              </p>
            </div>

            <p className={`mt-8 text-center text-xs leading-relaxed ${omMuted}`}>
              {t('login.termsPrefix')}{' '}
              <Link to="/privacy-policy" className={`${omLinkAccent} underline-offset-2 hover:underline`}>
                {t('login.termsOfService')}
              </Link>
              {' '}
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

export default LoginPage;
