import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaInbox,
  FaPaperPlane,
  FaCheckDouble,
  FaExclamationCircle,
  FaClock,
  FaUser,
  FaUsers,
} from 'react-icons/fa';

export type WhatsAppLogEntry = {
  id: string;
  direction: 'inbound' | 'outbound';
  from?: string;
  to?: string;
  text?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  timestamp: string;
  isGroup?: boolean;
};

function statusLabel(status: string | undefined, t: (key: string) => string): string {
  switch (status) {
    case 'delivered':
      return t('whatsapp.messageStatusDelivered');
    case 'read':
      return t('whatsapp.messageStatusRead');
    case 'sent':
      return t('whatsapp.messageStatusSent');
    case 'failed':
      return t('whatsapp.messageStatusFailed');
    case 'pending':
      return t('whatsapp.messageStatusPending');
    default:
      return '';
  }
}

function StatusIcon({ status }: { status?: string }) {
  switch (status) {
    case 'delivered':
    case 'read':
      return <FaCheckDouble className="h-3.5 w-3.5 text-blue-500" />;
    case 'sent':
      return <FaCheckDouble className="h-3.5 w-3.5 text-slate-400" />;
    case 'failed':
      return <FaExclamationCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'pending':
      return <FaClock className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <FaClock className="h-3.5 w-3.5 text-slate-300" />;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function WhatsAppMessageLog({
  entries,
  loading,
}: {
  entries: WhatsAppLogEntry[];
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
          <FaInbox className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            {t('whatsapp.messageLog')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('whatsapp.messageLogSubtitle')}
          </p>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
            <p className="text-sm text-slate-500">{t('whatsapp.loadingMessages')}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FaInbox className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-500">{t('whatsapp.noMessages')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('whatsapp.noMessagesHint')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`px-6 py-4 hover:bg-slate-50/60 transition-colors ${
                  entry.direction === 'inbound' ? 'bg-white' : 'bg-blue-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      entry.direction === 'inbound'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {entry.direction === 'inbound' ? (
                      <FaUser className="h-3.5 w-3.5" />
                    ) : (
                      <FaPaperPlane className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">
                        {entry.direction === 'inbound'
                          ? entry.from || t('whatsapp.unknownSender')
                          : entry.to || t('whatsapp.unknownRecipient')}
                      </span>
                      {entry.isGroup && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                          <FaUsers className="h-2.5 w-2.5" />
                          {t('whatsapp.group')}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    {entry.text && (
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {entry.text}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 mt-1 flex flex-col items-center gap-0.5" title={statusLabel(entry.status, t)}>
                    <StatusIcon status={entry.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
