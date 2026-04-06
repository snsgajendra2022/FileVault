import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { FaUserPlus, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type ValidateResponse = {
  valid: boolean;
  inviterName?: string;
  inviterEmail?: string;
  inviterAccountLabel?: string;
};

const InviteExistingUserForm: React.FC = () => {
  const { t } = useTranslation();
  const ic = 'invitationsComponents.inviteExisting';
  const { user } = useAuth();
  const [code, setCode] = React.useState('');
  const [note, setNote] = React.useState('');
  const [validatedInfo, setValidatedInfo] = React.useState<ValidateResponse | null>(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ValidateResponse>('/api/invitations/validate-code', { code: code.trim() });
      return res.data;
    },
    onSuccess: (data) => {
      if (!data.valid) {
        setValidatedInfo(null);
        toast.error(t(`${ic}.toastInvalid`));
        return;
      }
      setValidatedInfo(data);
      toast.success(t(`${ic}.toastValid`));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? t(`${ic}.toastValidateFail`);
      toast.error(msg);
      setValidatedInfo(null);
    },
  });

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
      setValidatedInfo(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? t(`${ic}.toastSendFail`);
      toast.error(msg);
    },
  });

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error(t(`${ic}.toastEnterCode`));
      return;
    }
    validateMutation.mutate();
  };

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
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t(`${ic}.codePlaceholder`)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-[0.18em] uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={validateMutation.status === 'pending' || !code.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 border border-emerald-200"
            >
              {validateMutation.status === 'pending' ? (
                <>
                  <FaSearch className="w-3.5 h-3.5 animate-spin" />
                  {t(`${ic}.checking`)}
                </>
              ) : (
                <>
                  <FaSearch className="w-3.5 h-3.5" />
                  {t(`${ic}.validate`)}
                </>
              )}
            </button>
          </div>
        </div>

        {validatedInfo && validatedInfo.valid && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 flex items-start gap-2 text-xs text-emerald-800">
            <FaCheckCircle className="w-4 h-4 mt-0.5 text-emerald-500" />
            <div>
              <p className="font-semibold">
                {t(`${ic}.codeOwner`, {
                  name: validatedInfo.inviterName || t(`${ic}.unknownUser`),
                })}
              </p>
              {validatedInfo.inviterAccountLabel && (
                <p className="mt-0.5 text-[11px]">
                  {t(`${ic}.account`)} <span className="font-medium">{validatedInfo.inviterAccountLabel}</span>
                </p>
              )}
            </div>
          </div>
        )}

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
