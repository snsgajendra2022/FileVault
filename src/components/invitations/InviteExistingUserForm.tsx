import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { FaUserPlus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';

const InviteExistingUserForm: React.FC = () => {
  const { t } = useTranslation();
  const ic = 'invitationsComponents.inviteExisting';
  const { user } = useAuth();
  const [code, setCode] = React.useState('');
  const [note, setNote] = React.useState('');

  const sendMutation = useMutation({
    mutationFn: async () => {
      const inviterId = user?.id;
      const payload: any = {
        invitationCode: code.trim(),
        message: note.trim() || undefined,
      };
      if (inviterId != null) payload.inviterId = inviterId;
      const res = await api.post('/api/invitation/send', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(t(`${ic}.toastSent`));
      setCode('');
      setNote('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? t(`${ic}.toastSendFail`);
      toast.error(msg);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error(t(`${ic}.toastEnterCode`));
      return;
    }
    sendMutation.mutate();
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <FaUserPlus className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t(`${ic}.title`)}</h2>
          <p className="text-xs text-slate-500">{t(`${ic}.subtitle`)}</p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSend}>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            {t(`${ic}.codeLabel`)}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t(`${ic}.codePlaceholder`)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-[0.18em] uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            {t(`${ic}.optionalMessage`)}
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(`${ic}.messagePlaceholder`)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={sendMutation.status === 'pending' || !code.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
          >
            {sendMutation.status === 'pending' ? (
              <>
                <FaUserPlus className="w-3.5 h-3.5 animate-pulse" />
                {t(`${ic}.sending`)}
              </>
            ) : (
              <>
                <FaUserPlus className="w-3.5 h-3.5" />
                {t(`${ic}.send`)}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default InviteExistingUserForm;
