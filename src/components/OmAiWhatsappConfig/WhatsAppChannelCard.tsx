import React from 'react';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  FaWhatsapp,
  FaQrcode,
  FaLink,
  FaUnlink,
  FaSignOutAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
} from 'react-icons/fa';

export type WhatsAppStatus = {
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  linkedPhoneE164?: string | null;
  welcomeSentAt?: string | null;
  omSetupComplete?: boolean;
  needsRelink?: boolean;
  hasWhatsAppCreds?: boolean;
  gatewayReachable?: boolean | null;
  lastConnectedAt?: string | null;
  lastMessageAt?: string | null;
  authAgeMs?: number | null;
  lastError?: string | null;
};

export type WhatsAppLoginState = {
  busy: boolean;
  message: string | null;
  qrDataUrl: string | null;
  qrPayload: string | null;
  connected: boolean | null;
};

function formatRelativeTime(iso: string | null | undefined, t: TFunction): string {
  if (!iso) return t('common.na');
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return t('whatsapp.timeJustNow');
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return t('whatsapp.timeSecondsAgo', { count: secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t('whatsapp.timeMinutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('whatsapp.timeHoursAgo', { count: hrs });
  const days = Math.floor(hrs / 24);
  return t('whatsapp.timeDaysAgo', { count: days });
}

function formatDuration(ms: number | null | undefined, t: TFunction): string {
  if (ms == null) return t('common.na');
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return t('whatsapp.durationSeconds', { count: secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t('whatsapp.durationMinutes', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('whatsapp.durationHoursMinutes', { hours: hrs, minutes: mins % 60 });
  const days = Math.floor(hrs / 24);
  return t('whatsapp.durationDaysHours', { days, hours: hrs % 24 });
}

function StatusBadge({ ok, label }: { ok: boolean | undefined; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        ok === true
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : ok === false
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-slate-50 text-slate-500 border border-slate-200'
      }`}
    >
      {ok === true ? (
        <FaCheckCircle className="h-3 w-3" />
      ) : ok === false ? (
        <FaTimesCircle className="h-3 w-3" />
      ) : (
        <FaClock className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

export default function WhatsAppChannelCard({
  status,
  loginState,
  onStartLogin,
  onWaitLogin,
  onLogout,
  onRefresh,
}: {
  status: WhatsAppStatus;
  loginState: WhatsAppLoginState;
  onStartLogin: (force: boolean) => void;
  onWaitLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [qrImgFailed, setQrImgFailed] = React.useState(false);
  const hasQr = Boolean(loginState.qrPayload || loginState.qrDataUrl);

  React.useEffect(() => {
    setQrImgFailed(false);
  }, [loginState.qrDataUrl, loginState.qrPayload]);

  const showQrImage = Boolean(loginState.qrDataUrl) && !qrImgFailed;
  const showQrSvg = Boolean(loginState.qrPayload);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
          <FaWhatsapp className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900">
            {t('whatsapp.channelTitle')}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('whatsapp.channelSubtitle')}
          </p>
        </div>
        <StatusBadge
          ok={status.connected}
          label={
            status.connected
              ? t('whatsapp.statusConnected')
              : status.running
              ? t('whatsapp.statusRunning')
              : t('whatsapp.statusDisconnected')
          }
        />
      </div>

      {/* Status rows */}
      <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.configured')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {status.configured ? t('common.yes') : t('common.no')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.linked')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {status.linked ? t('common.yes') : t('common.no')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.running')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {status.running ? t('common.yes') : t('common.no')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.lastConnect')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {formatRelativeTime(status.lastConnectedAt, t)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.lastMessage')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {formatRelativeTime(status.lastMessageAt, t)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('whatsapp.authAge')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {formatDuration(status.authAgeMs, t)}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {status.lastError && (
        <div className="mx-6 mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <FaExclamationTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">{status.lastError}</p>
        </div>
      )}

      {/* Login message */}
      {loginState.message && (
        <div
          className={`mx-6 mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${
            loginState.connected === true
              ? 'border-emerald-200 bg-emerald-50'
              : loginState.connected === false
              ? 'border-red-200 bg-red-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          {loginState.connected === true ? (
            <FaCheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : loginState.connected === false ? (
            <FaTimesCircle className="h-4 w-4 text-red-600 shrink-0" />
          ) : (
            <FaClock className="h-4 w-4 text-blue-600 shrink-0" />
          )}
          <p
            className={`text-sm font-medium ${
              loginState.connected === true
                ? 'text-emerald-800'
                : loginState.connected === false
                ? 'text-red-800'
                : 'text-blue-800'
            }`}
          >
            {loginState.message}
          </p>
        </div>
      )}

      {/* Real WhatsApp link instructions */}
      {/* <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-sm font-bold text-amber-900">{t('whatsapp.realLinkTitle')}</p>
        <p className="mt-2 text-sm text-amber-800">{t('whatsapp.realLinkIntro')}</p>
        <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-amber-900/90">
          <li>{t('whatsapp.realLinkStep1')}</li>
          <li>{t('whatsapp.realLinkStep2')}</li>
          <li>{t('whatsapp.realLinkStep3')}</li>
          <li>{t('whatsapp.realLinkStep4')}</li>
        </ol>
        <p className="mt-3 text-xs text-amber-800/90">{t('whatsapp.realLinkNote')}</p>
      </div> */}

      {/* Dev QR (not scannable in WhatsApp) */}
      {hasQr && (
        <div className="mx-6 mb-6 flex flex-col items-center">
          <p className="text-sm font-bold text-slate-700 mb-1">{t('whatsapp.scanQr')}</p>
          <p className="text-xs text-amber-700 font-medium mb-3 text-center max-w-sm">
            {t('whatsapp.scanQrHint')}
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4 shadow-inner flex items-center justify-center min-h-[15rem] min-w-[15rem]">
            {showQrImage ? (
              <img
                src={loginState.qrDataUrl!}
                alt={t('whatsapp.qrAlt')}
                className="h-56 w-56 object-contain bg-white"
                onError={() => setQrImgFailed(true)}
              />
            ) : showQrSvg ? (
              <QRCode
                value={loginState.qrPayload!}
                size={224}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            ) : null}
          </div>
          {loginState.qrPayload ? (
            <p className="mt-2 font-mono text-[10px] text-slate-400 break-all text-center max-w-xs">
              {loginState.qrPayload}
            </p>
          ) : null}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <button
          type="button"
          disabled={loginState.busy}
          onClick={() => onStartLogin(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <FaQrcode className="h-3.5 w-3.5" />
          {loginState.busy ? t('common.working') : t('whatsapp.showQr')}
        </button>
        <button
          type="button"
          disabled={loginState.busy}
          onClick={() => onStartLogin(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-green-300 hover:text-green-700 disabled:opacity-50 transition-colors"
        >
          <FaLink className="h-3.5 w-3.5" />
          {t('whatsapp.relink')}
        </button>
        <button
          type="button"
          disabled={loginState.busy}
          onClick={onWaitLogin}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 transition-colors"
        >
          <FaUnlink className="h-3.5 w-3.5" />
          {t('whatsapp.waitForScan')}
        </button>
        <button
          type="button"
          disabled={loginState.busy}
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          <FaSignOutAlt className="h-3.5 w-3.5" />
          {t('whatsapp.logout')}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-50 transition-colors ml-auto"
        >
          <FaSyncAlt className="h-3.5 w-3.5" />
          {t('common.refresh')}
        </button>
      </div>
    </div>
  );
}
