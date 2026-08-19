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
} from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omCard,
  omCardTitle,
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

const LOGIN_VISUALS = [
  '/marketing/feat-1.jpg',
  '/marketing/feat-2.jpg',
  '/marketing/feat-3.jpg',
];

type LoginMode = 'password' | 'emailOtp' | 'phoneOtp';

const LoginPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(true);
  const [showPhoneOtp, setShowPhoneOtp] = useState(true);
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
        if (!canEmail && loginMode === 'emailOtp') {
          setLoginMode(canPhone ? 'phoneOtp' : 'password');
        }
        if (!canPhone && loginMode === 'phoneOtp') {
          setLoginMode(canEmail ? 'emailOtp' : 'password');
        }
      } catch {
        setShowEmailOtp(false);
        setShowPhoneOtp(false);
        setLoginMode('password');
      }
    };
    void fetchFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setOtpRequested(false);
    setOtp('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] dark:bg-[#ffffff]">
          <img src="/favicon.svg" alt={t('brand.ourMemories')} className="h-8 w-8" />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-[#f1f5f9] dark:bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[#0f172a] dark:bg-[#ffffff]" />
        </div>
        <p className={`text-xs ${omMuted}`}>{t('login.signingIn')}</p>
      </div>
    );
  }

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

  const alternateActions: Array<{ id: LoginMode; label: string; icon: typeof FaUser }> = [];
  if (loginMode !== 'password') {
    alternateActions.push({ id: 'password', label: 'Sign in with password', icon: FaUser });
  }
  if (showEmailOtp && loginMode !== 'emailOtp') {
    alternateActions.push({ id: 'emailOtp', label: 'Sign in with email OTP', icon: FaEnvelope });
  }
  if (showPhoneOtp && loginMode !== 'phoneOtp') {
    alternateActions.push({ id: 'phoneOtp', label: 'Sign in with mobile OTP', icon: FaPhone });
  }

  return (
    <PublicMemoriesShell
      showBrandBlock
      headerActions={
        <>
          <Link to="/" className={`hidden sm:inline ${omNavLink}`}>
            {t('login.omExplore')}
          </Link>
          <Link to="/register" className={`${omCtaSolid} px-3 py-2 text-xs sm:px-4 sm:text-sm`}>
            {t('memoriesPlatform.getStarted')}
          </Link>
        </>
      }
    >
      <div className="grid gap-12 lg:grid-cols-[1.05fr_min(26.5rem,100%)] lg:items-center lg:gap-16">
        <div className="hidden lg:block max-w-xl">
          <p className={`mb-5 ${omBadge} text-[11px] uppercase tracking-[0.14em] px-3.5 py-1.5`}>
            {t('memoriesPlatform.badge')}
          </p>
          <h1
            className={`om-auth-display text-[2.65rem] font-semibold leading-[1.12] tracking-[-0.03em] xl:text-[3.1rem] ${omHeading}`}
          >
            {t('login.omSignInTitle')}
          </h1>
          <p className={`mt-5 max-w-md text-base leading-relaxed xl:text-[1.05rem] ${omLead}`}>
            {t('login.omSignInLead')}
          </p>
          <p className={`mt-3 text-sm ${omMuted}`}>{t('login.signInSubtitle')}</p>

          <div className="mt-10">
            <div className="om-auth-collage" aria-hidden="true">
              <div className="om-auth-collage__main">
                <img src={LOGIN_VISUALS[0]} alt="" width={837} height={1024} loading="eager" decoding="async" />
              </div>
              <div className="om-auth-collage__side">
                <img src={LOGIN_VISUALS[1]} alt="" width={837} height={1024} loading="eager" decoding="async" />
              </div>
              <div className="om-auth-collage__side">
                <img src={LOGIN_VISUALS[2]} alt="" width={837} height={1024} loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="om-auth-story">
              <p className="om-auth-story__title">{t('brand.ourMemories')}</p>
              <p className="om-auth-story__text">
                Premium memories, shared in seconds. Create events, upload your best shots, and let
                guests open the gallery instantly — QR or invite link. Built for photographers who
                care about speed and polish.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] dark:bg-[#ffffff]">
              <img src="/favicon.svg" alt={t('brand.ourMemories')} className="h-8 w-8" />
            </div>
            <h1 className={`om-auth-display text-[1.85rem] font-semibold tracking-[-0.02em] ${omHeading}`}>
              {t('login.omSignInTitle')}
            </h1>
            <p className={`mt-2 text-sm ${omLead}`}>{t('login.omSignInLead')}</p>
          </div>

          <div className={`${omCard} p-6 sm:p-8`}>
            <div className="mb-6 text-center sm:text-left">
              <h2 className={omCardTitle}>{cardTitle}</h2>
              <p className={`mt-1.5 text-sm leading-relaxed ${omMuted}`}>{cardSubtitle}</p>
            </div>

            {/* Only one form shows inside the card at a time */}
            {loginMode === 'password' ? (
              <form className="om-login-form" onSubmit={handlePasswordSubmit}>
                <div className="om-login-field">
                  <label htmlFor="username" className={omLabel}>
                    {t('login.username')}
                  </label>
                  <div className="om-login-field__control">
                    <FaUser className="om-login-field__icon" aria-hidden />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className={omInput}
                      placeholder={t('login.usernamePlaceholder')}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="om-login-field">
                  <label htmlFor="password" className={omLabel}>
                    {t('login.password')}
                  </label>
                  <div className="om-login-field__control">
                    <FaLock className="om-login-field__icon" aria-hidden />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className={`${omInput} pr-12`}
                      placeholder={t('login.passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="om-login-field__toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="om-login-row">
                  <label className={`om-login-remember ${omLead}`}>
                    <input id="remember-me" name="remember-me" type="checkbox" className="om-login-remember__box" />
                    <span>{t('login.rememberMe')}</span>
                  </label>
                  <Link to="/forgot-password" className={omLinkAccent}>
                    {t('login.forgotPassword')}
                  </Link>
                </div>

                <button type="submit" disabled={loading} className={omPrimaryBtn}>
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('login.signingIn')}
                    </>
                  ) : (
                    <>
                      {t('login.signIn')}
                      <FaArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : null}

            {loginMode === 'emailOtp' ? (
              <form
                className="om-login-form"
                onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
              >
                <div className="om-login-field">
                  <label htmlFor="email-login" className={omLabel}>
                    {t('login.email')}
                  </label>
                  <div className="om-login-field__control">
                    <FaEnvelope className="om-login-field__icon" aria-hidden />
                    <input
                      id="email-login"
                      name="email"
                      type="email"
                      required
                      className={omInput}
                      placeholder={t('login.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={otpRequested}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {otpRequested ? (
                  <div className="om-login-field">
                    <label htmlFor="otp-email" className={omLabel}>
                      {t('login.verificationOtp')}
                    </label>
                    <input
                      id="otp-email"
                      name="otp"
                      type="text"
                      required
                      className={`${omInputPlain} om-login-otp-code`}
                      placeholder={t('login.otpPlaceholder')}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </div>
                ) : null}

                <button type="submit" disabled={loading} className={omPrimaryBtn}>
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {otpRequested ? t('login.verifying') : t('login.sendingOtp')}
                    </>
                  ) : (
                    <>
                      {otpRequested ? t('login.verifyAndSignIn') : t('login.sendOtp')}
                      <FaArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {otpRequested ? (
                  <button
                    type="button"
                    className="om-login-change"
                    onClick={() => {
                      setOtpRequested(false);
                      setOtp('');
                    }}
                  >
                    {t('login.changeEmail')}
                  </button>
                ) : null}
              </form>
            ) : null}

            {loginMode === 'phoneOtp' ? (
              <form
                className="om-login-form"
                onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
              >
                <div className="om-login-field">
                  <label htmlFor="phone-login" className={omLabel}>
                    {t('login.mobileNumber')}
                  </label>
                  <div className="om-login-field__control">
                    <FaPhone className="om-login-field__icon" aria-hidden />
                    <input
                      id="phone-login"
                      name="phone"
                      type="tel"
                      required
                      className={omInput}
                      placeholder={t('login.mobilePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={otpRequested}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {otpRequested ? (
                  <div className="om-login-field">
                    <label htmlFor="otp-phone" className={omLabel}>
                      {t('login.verificationOtp')}
                    </label>
                    <input
                      id="otp-phone"
                      name="otp"
                      type="text"
                      required
                      className={`${omInputPlain} om-login-otp-code`}
                      placeholder={t('login.otpPlaceholder')}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </div>
                ) : null}

                <button type="submit" disabled={loading} className={omPrimaryBtn}>
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {otpRequested ? t('login.verifying') : t('login.sendingOtp')}
                    </>
                  ) : (
                    <>
                      {otpRequested ? t('login.verifyAndSignIn') : t('login.sendOtp')}
                      <FaArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {otpRequested ? (
                  <button
                    type="button"
                    className="om-login-change"
                    onClick={() => {
                      setOtpRequested(false);
                      setOtp('');
                    }}
                  >
                    {t('login.changeMobile')}
                  </button>
                ) : null}
              </form>
            ) : null}

            <p className={`mt-6 text-center text-sm ${omMuted}`}>
              {t('login.noAccount')}{' '}
              <Link to="/register" className={omLinkAccent}>
                {t('login.signUpHere')}
              </Link>
            </p>
          </div>

          {/* Alternate actions — not a switch. Only other methods as full buttons. */}
          {alternateActions.length > 0 ? (
            <div className="om-login-actions">
              {alternateActions.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="om-login-actions__btn"
                  onClick={() => selectMode(id)}
                >
                  <Icon className="om-login-actions__icon" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : null}

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

          <div className="mt-8 lg:hidden">
            <div className="om-auth-collage" aria-hidden="true">
              <div className="om-auth-collage__main">
                <img src={LOGIN_VISUALS[0]} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="om-auth-collage__side">
                <img src={LOGIN_VISUALS[1]} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="om-auth-collage__side">
                <img src={LOGIN_VISUALS[2]} alt="" loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="om-auth-story">
              <p className="om-auth-story__title">{t('brand.ourMemories')}</p>
              <p className="om-auth-story__text">
                Premium memories, shared in seconds. Create events, upload your best shots, and let
                guests open the gallery instantly — QR or invite link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicMemoriesShell>
  );
};

export default LoginPage;
