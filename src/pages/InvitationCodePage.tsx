import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { generateInvitationCode } from '../services/invitationService';

const InvitationCodePage: React.FC = () => {
  const { t } = useTranslation();
  const [invitationCode, setInvitationCode] = React.useState<string | null>(null);
  const [createdAt, setCreatedAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await generateInvitationCode();
      setInvitationCode(res.invitationCode);
      setCreatedAt(res.createdAt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : i18n.t('invitationCodePage.errGenerate'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!invitationCode) return;
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('invitationCodePage.errCopy'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{t('invitationCodePage.title')}</h1>
          <p className="text-sm text-slate-600">
            {t('invitationCodePage.subtitle')}
          </p>
        </header>

        <main className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t('invitationCodePage.sectionTitle')}</h2>
              <p className="text-xs text-slate-500">
                {t('invitationCodePage.sectionHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading && (
                <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? t('invitationCodePage.generating') : t('invitationCodePage.generateBtn')}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {invitationCode && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                {t('invitationCodePage.yourCode')}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                  <p className="font-mono text-sm tracking-[0.18em] uppercase text-slate-900">
                    {invitationCode}
                  </p>
                  {createdAt && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {t('invitationCodePage.createdAt', { date: new Date(createdAt).toLocaleString() })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                >
                  {copied ? t('invitationCodePage.copied') : t('invitationCodePage.copy')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default InvitationCodePage;
