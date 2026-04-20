import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { sendInvitation } from '../../services/invitationService';

const InviteUserPage: React.FC = () => {
  const { t } = useTranslation();
  const [inviteCodeInput, setInviteCodeInput] = React.useState('');
  const [messageInput, setMessageInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [inviteStatus, setInviteStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatus(null);
    setError(null);
    if (!inviteCodeInput.trim()) {
      setError(t('inviteUserPage.errRequired'));
      return;
    }
    setSending(true);
    try {
      await sendInvitation(inviteCodeInput.trim(), messageInput.trim() || undefined);
      setInviteStatus(t('inviteUserPage.success'));
      setInviteCodeInput('');
      setMessageInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : i18n.t('inviteUserPage.errSend');
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{t('inviteUserPage.title')}</h1>
          <p className="text-sm text-slate-600">
            {t('inviteUserPage.subtitle')}
          </p>
        </header>

        <main className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('inviteUserPage.codeLabel')}
              </label>
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder={t('inviteUserPage.codePlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-[0.18em] uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('inviteUserPage.messageLabel')}
              </label>
              <textarea
                rows={3}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={t('inviteUserPage.messagePlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {inviteStatus && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {inviteStatus}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {sending ? t('inviteUserPage.sending') : t('inviteUserPage.sendBtn')}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default InviteUserPage;
