import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client/axiosInstance';
import toast from 'react-hot-toast';
import { FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash, FaStar } from 'react-icons/fa';
import PublicMemoriesShell from '../../components/auth/PublicMemoriesShell';
import {
  omBadge,
  omCard,
  omCardTitle,
  omCtaSolid,
  omHeroTitle,
  omInput,
  omLabel,
  omLead,
  omLinkAccent,
  omMuted,
  omNavLink,
  omPrimaryBtn,
} from '../../components/auth/publicMemoriesTheme';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenFromUrl.trim()) {
      toast.error(t('passwordReset.toastInvalidToken'));
      return;
    }
    if (!newPassword.trim()) {
      toast.error(t('passwordReset.toastEnterPassword'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordReset.toastMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordReset.toastMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token: tokenFromUrl.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess(true);
      toast.success(t('passwordReset.toastSuccess'));
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error as Error)?.message ||
        t('passwordReset.toastFail');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <PublicMemoriesShell
      showBrandBlock
      headerActions={
        <>
          <Link to="/" className={`hidden sm:inline ${omNavLink}`}>
            Explore
          </Link>
          <Link to="/login" className={`${omCtaSolid} px-3 py-2 text-xs sm:px-4 sm:text-sm`}>
            {t('passwordReset.signIn')}
          </Link>
        </>
      }
    >
      {children}
    </PublicMemoriesShell>
  );

  if (!tokenFromUrl.trim()) {
    return shell(
      <div className="mx-auto max-w-md">
        <div className={`${omCard} p-8 text-center`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#141210] text-[#fffcf8] dark:bg-[#fffcf8] dark:text-[#141210]">
            <FaShieldAlt className="h-6 w-6" />
          </div>
          <h1 className={omCardTitle}>{t('passwordReset.invalidLinkTitle')}</h1>
          <p className={`mt-3 ${omLead}`}>{t('passwordReset.invalidLinkBody')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/forgot-password" className={omLinkAccent}>
              {t('passwordReset.requestNew')}
            </Link>
            <span className={omMuted}>·</span>
            <Link to="/login" className={`inline-flex items-center gap-2 ${omLinkAccent}`}>
              <FaArrowLeft /> {t('passwordReset.backSignIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return shell(
      <div className="mx-auto max-w-md">
        <div className={`${omCard} p-8 text-center`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f3a34] text-[#fffcf8]">
            <FaShieldAlt className="h-6 w-6" />
          </div>
          <h1 className={omCardTitle}>{t('passwordReset.successTitle')}</h1>
          <p className={`mt-3 ${omLead}`}>{t('passwordReset.successBody')}</p>
          <Link to="/login" className={`${omPrimaryBtn} mt-6`}>
            <FaArrowLeft /> {t('passwordReset.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  return shell(
    <div className="grid gap-12 lg:grid-cols-[1fr_min(28rem,100%)] lg:items-center lg:gap-16">
      <div className="hidden lg:block max-w-lg">
        <p className={`mb-5 ${omBadge} text-[11px] uppercase tracking-[0.2em] px-3.5 py-1.5`}>
          <FaStar className="h-3 w-3 text-amber-600" />
          Our Memories
        </p>
        <h1 className={`text-4xl font-semibold tracking-tight ${omHeroTitle}`}>
          {t('passwordReset.pageTitle')}
        </h1>
        <p className={`mt-6 text-base leading-relaxed ${omLead}`}>
          {t('passwordReset.pageSubtitle')}
        </p>
      </div>

      <div className={`${omCard} p-6 sm:p-8`}>
        <h2 className={`mb-1 lg:hidden ${omCardTitle}`}>{t('passwordReset.pageTitle')}</h2>
        <p className={`mb-6 lg:hidden text-sm ${omLead}`}>{t('passwordReset.pageSubtitle')}</p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="newPassword" className={omLabel}>
              {t('passwordReset.newPasswordLabel')}
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <FaLock className="h-4 w-4 text-[#8a847a] group-focus-within:text-[#1f3a34]" />
              </div>
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className={`${omInput} pr-12`}
                placeholder={t('passwordReset.placeholderNew')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a847a] hover:text-[#141210]"
                aria-label={showNewPassword ? t('passwordReset.hidePassword') : t('passwordReset.showPassword')}
              >
                {showNewPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className={omLabel}>
              {t('passwordReset.confirmLabel')}
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <FaLock className="h-4 w-4 text-[#8a847a] group-focus-within:text-[#1f3a34]" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                className={`${omInput} pr-12`}
                placeholder={t('passwordReset.placeholderConfirm')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#8a847a] hover:text-[#141210]"
                aria-label={showConfirmPassword ? t('passwordReset.hidePassword') : t('passwordReset.showPassword')}
              >
                {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={omPrimaryBtn}>
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#fffcf8] border-t-transparent" />
                {t('passwordReset.submitting')}
              </>
            ) : (
              t('passwordReset.submit')
            )}
          </button>

          <div className="text-center">
            <Link to="/login" className={`inline-flex items-center gap-2 text-sm ${omLinkAccent}`}>
              <FaArrowLeft /> {t('passwordReset.backSignIn')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
