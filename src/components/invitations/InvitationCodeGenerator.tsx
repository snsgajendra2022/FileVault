import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { FaKey, FaCopy } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { generateInvitationCode } from '../../services/invitationService';

const InvitationCodeGenerator: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = React.useState<string | null>(null);
  const [createdAt, setCreatedAt] = React.useState<string | null>(null);
  const ic = 'invitationsComponents.codeGen';

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await generateInvitationCode(user?.id);
      return res;
    },
    onSuccess: (data) => {
      setCode(data.invitationCode);
      setCreatedAt(data.createdAt);
      toast.success(t(`${ic}.toastGenerated`));
    },
    onError: (err: any) => {
      const msg = err?.message ?? t(`${ic}.toastFailGenerate`);
      toast.error(msg);
    },
  });

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t(`${ic}.toastCopied`));
    } catch {
      toast.error(t(`${ic}.toastCopyFail`));
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FaKey className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t(`${ic}.title`)}</h2>
            <p className="text-xs text-slate-500">{t(`${ic}.subtitle`)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.status === 'pending'}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
          {generateMutation.status === 'pending' ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              {t(`${ic}.generating`)}
            </>
          ) : (
            <>
              <FaKey className="w-3.5 h-3.5" />
              {t(`${ic}.generate`)}
            </>
          )}
        </button>
      </div>

      {code && (
        <div className="mt-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-indigo-700 uppercase tracking-wide">{t(`${ic}.yourCode`)}</p>
            <p className="mt-1 text-lg font-mono font-semibold text-slate-900 tracking-[0.15em]">
              {code}
            </p>
            {createdAt && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {t(`${ic}.createdAt`, { date: new Date(createdAt).toLocaleString() })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200"
          >
            <FaCopy className="w-3.5 h-3.5" />
            {t(`${ic}.copy`)}
          </button>
        </div>
      )}
    </section>
  );
};

export default InvitationCodeGenerator;
