import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaWhatsapp, FaRobot, FaInfoCircle, FaSync, FaPaperPlane, FaCog } from 'react-icons/fa';
import type { WhatsAppStatus } from './WhatsAppChannelCard';

const DEFAULT_MANUAL_MESSAGE =
  "Hey! I'm OM — your Our Memories assistant.\n\nYou're connected. Send hi anytime, or ask me to manage your studio from here.";

export default function WhatsAppOmChatGuide({
  status,
  gatewayReachable,
  onRetrySetup,
  setupBusy,
  onSendMessage,
  sendBusy,
}: {
  status?: WhatsAppStatus & {
    gateway?: { reachable?: boolean; wsUrl?: string };
    omReady?: boolean;
    omSetupComplete?: boolean;
    needsRelink?: boolean;
    linkedPhoneE164?: string | null;
    welcomeSentAt?: string | null;
    omChatHint?: string;
    whatsappAccount?: { linked?: boolean; dmPolicy?: string | null };
  };
  gatewayReachable?: boolean;
  onRetrySetup?: () => void;
  setupBusy?: boolean;
  onSendMessage?: (text: string) => void;
  sendBusy?: boolean;
}) {
  const { t } = useTranslation();
  const [manualText, setManualText] = useState(DEFAULT_MANUAL_MESSAGE);
  const reachable = gatewayReachable ?? status?.gateway?.reachable ?? false;
  const linked = Boolean(status?.connected || status?.linked);
  const omReady = Boolean(status?.omReady ?? (linked && reachable));
  const setupDone = Boolean(status?.omSetupComplete ?? status?.welcomeSentAt);
  const canSendManual = Boolean(omReady && linked && !status?.needsRelink && onSendMessage);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <FaRobot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{t('whatsapp.omGuideTitle')}</h3>
            <p className="text-sm text-slate-600">{t('whatsapp.omGuideSubtitle')}</p>
          </div>
        </div>
      </div>

      {!reachable && (
        <div className="mx-6 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">{t('whatsapp.gatewayOffTitle')}</p>
          <p className="mt-1">{t('whatsapp.gatewayOffBody')}</p>
          <code className="mt-2 block text-xs bg-amber-100/80 px-2 py-1 rounded">
            npm run openclaw:gateway:run
          </code>
        </div>
      )}

      {status?.needsRelink && (
        <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-bold">{t('whatsapp.needsRelinkTitle')}</p>
          <p className="mt-1">{t('whatsapp.needsRelinkBody')}</p>
          {status.lastError && (
            <p className="mt-2 text-xs font-mono bg-red-100/80 px-2 py-1 rounded break-all">
              {status.lastError}
            </p>
          )}
        </div>
      )}

      {reachable && !linked && !status?.needsRelink && (
        <div className="mx-6 mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {t('whatsapp.omGuideScanFirst')}
        </div>
      )}

      {omReady && (
        <div className="mx-6 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-bold">
            {setupDone ? t('whatsapp.omReadyTitle') : t('whatsapp.omSettingUpTitle')}
          </p>
          <p className="mt-1">
            {status?.omChatHint || (setupDone ? t('whatsapp.omReadyBody') : t('whatsapp.omSettingUpBody'))}
          </p>
          {status?.linkedPhoneE164 ? (
            <p className="mt-2 text-xs font-mono text-emerald-800/80">
              {t('whatsapp.omLinkedPhone')}: {status.linkedPhoneE164}
            </p>
          ) : null}
        </div>
      )}

      <div className="mx-6 mt-4 max-w-md rounded-2xl border border-slate-200 bg-[#e5ddd5] p-4 shadow-inner">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-300/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-700 text-xs font-extrabold shadow-sm">
            OM
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{t('whatsapp.omChatName')}</p>
            <p className="text-[10px] text-slate-500">{t('whatsapp.omChatNameHint')}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-[#dcf8c6] shadow-sm px-3 py-2 text-sm text-slate-800 whitespace-pre-line max-w-[90%]">
            <span className="font-semibold text-emerald-800">[OM]</span>{' '}
            {t('whatsapp.omWelcomePreviewShort')}
          </div>
        </div>
      </div>

      {canSendManual ? (
        <div className="mx-6 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">{t('whatsapp.manualSendTitle')}</p>
          <p className="mt-1 text-xs text-slate-600">{t('whatsapp.manualSendHint')}</p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder={t('whatsapp.manualSendPlaceholder')}
          />
          <button
            type="button"
            disabled={sendBusy || !manualText.trim()}
            onClick={() => onSendMessage(manualText.trim())}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <FaPaperPlane className="h-3.5 w-3.5" />
            {sendBusy ? t('common.working') : t('whatsapp.manualSendButton')}
          </button>
        </div>
      ) : null}

      {omReady && onRetrySetup ? (
        <div className="mx-6 mt-4 mb-2">
          <button
            type="button"
            disabled={setupBusy}
            onClick={onRetrySetup}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
          >
            <FaSync className={`h-3.5 w-3.5 ${setupBusy ? 'animate-spin' : ''}`} />
            {setupBusy ? t('common.working') : t('whatsapp.retryOmSetup')}
          </button>
          {status?.welcomeSentAt ? (
            <p className="mt-2 text-center text-xs text-slate-500">{t('whatsapp.welcomeSentAt')}</p>
          ) : null}
        </div>
      ) : null}

      <ol className="px-6 py-5 space-y-4 list-decimal list-inside text-sm text-slate-700">
        <li className="font-medium">{t('whatsapp.omStep1')}</li>
        <li className="font-medium">{t('whatsapp.omStep2')}</li>
        <li className="font-medium">{t('whatsapp.omStep3')}</li>
      </ol>

      <div className="px-6 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          {t('whatsapp.omTryTitle')}
        </p>
        <ul className="space-y-2">
          {(
            [
              'help',
              'hi',
              'list my events',
              'create event Summer Party',
              'my albums',
              'phone book',
              'upload family',
              '(send a photo to upload)',
            ] as const
          ).map((phrase) => (
            <li
              key={phrase}
              className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm font-mono text-slate-800"
            >
              <FaWhatsapp className="h-4 w-4 text-green-600 shrink-0" />
              {phrase}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t('whatsapp.omTryNote')}</p>
      </div>

      <div className="mx-6 mb-6 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <FaInfoCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600">{t('whatsapp.omServerNote')}</p>
      </div>

      <div className="mx-6 mb-6 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <FaCog className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600">{t('whatsapp.omActionsNote')}</p>
      </div>
    </div>
  );
}
