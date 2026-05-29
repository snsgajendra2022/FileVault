import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import toast from 'react-hot-toast';
import { FaEnvelope, FaShieldAlt, FaArrowLeft, FaArrowRight, FaStar } from 'react-icons/fa';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omBadge,
  omCard,
  omCardTitle,
  omCtaSolid,
  omHeading,
  omHeroTitle,
  omInput,
  omLabel,
  omLead,
  omLinkAccent,
  omMuted,
  omNavLink,
  omPrimaryBtn,
} from '../../components/auth/publicMemoriesTheme';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('forgotPassword.toastEmailRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await forgotPassword(email.trim());
      setSubmitted(true);
      toast.success(data.message || t('forgotPassword.toastSuccess'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err.response?.data?.message || err.message || t('forgotPassword.toastGenericError');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="grid gap-12 lg:grid-cols-[1fr_min(28rem,100%)] lg:items-center lg:gap-16">
        <div className="hidden lg:block max-w-lg xl:max-w-xl">
          <p className={`mb-5 ${omBadge} text-[11px] uppercase tracking-[0.2em] px-3.5 py-1.5`}>
            <FaStar className="h-3 w-3 text-amber-500 dark:text-amber-300" />
            {t('memoriesPlatform.badge')}
          </p>
          <h1 className={`text-4xl font-semibold tracking-tight xl:text-[2.75rem] xl:leading-[1.1] ${omHeroTitle}`}>
            {t('forgotPassword.title')}
          </h1>
          <p className={`mt-6 text-base leading-relaxed xl:text-lg ${omLead}`}>
            {t('forgotPassword.subtitle')}
          </p>
          <div className="mt-10 flex items-start gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
              <FaShieldAlt className="h-5 w-5" />
            </div>
            <p className={`text-sm leading-relaxed ${omMuted}`}>{t('forgotPassword.sentHint')}</p>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30">
              <FaShieldAlt className="h-7 w-7 text-white" />
            </div>
            <h1 className={`text-2xl font-bold ${omHeading}`}>{t('forgotPassword.title')}</h1>
            <p className={`mt-2 text-sm ${omLead}`}>{t('forgotPassword.subtitle')}</p>
          </div>

          <div className={`${omCard} p-6 sm:p-8`}>
            <Link
              to="/login"
              className={`mb-6 inline-flex items-center gap-2 text-sm font-medium ${omMuted} hover:text-slate-800 dark:hover:text-white transition-colors`}
            >
              <FaArrowLeft className="h-3.5 w-3.5" />
              {t('forgotPassword.backToSignIn')}
            </Link>

            {submitted ? (
              <div className="space-y-6 text-center sm:text-left">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 sm:mx-0">
                  <FaEnvelope className="h-8 w-8 text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                  <h2 className={omCardTitle}>{t('forgotPassword.sentTitle')}</h2>
                  <p className={`mt-3 text-sm leading-relaxed ${omMuted}`}>
                    {t('forgotPassword.sentHint')}
                  </p>
                </div>
                <Link to="/login" className={`${omPrimaryBtn} no-underline`}>
                  {t('forgotPassword.backToSignIn')}
                  <FaArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 hidden sm:block">
                  <h2 className={omCardTitle}>{t('forgotPassword.title')}</h2>
                  <p className={`mt-1.5 text-sm leading-relaxed ${omMuted}`}>
                    {t('forgotPassword.subtitle')}
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="email" className={`mb-1.5 block ${omLabel}`}>
                      {t('forgotPassword.emailLabel')}
                    </label>
                    <div className="relative">
                      <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        className={omInput}
                        placeholder={t('forgotPassword.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className={omPrimaryBtn}>
                    {loading ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('forgotPassword.sending')}
                      </>
                    ) : (
                      <>
                        {t('forgotPassword.sendLink')}
                        <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  <p className={`text-center text-sm ${omMuted}`}>
                    {t('registerPage.alreadyHaveAccount')}{' '}
                    <Link to="/login" className={omLinkAccent}>
                      {t('registerPage.signInHere')}
                    </Link>
                  </p>
                </form>
              </>
            )}
          </div>

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

export default ForgotPasswordPage;
