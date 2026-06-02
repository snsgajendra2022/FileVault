import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaImages, FaPauseCircle, FaCheckCircle } from 'react-icons/fa';
import WhatsAppToggleSwitch from './WhatsAppToggleSwitch';

export default function WhatsAppInboundOmBanner({
  enabled,
  onToggle,
  saving,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section
      className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${
        enabled
          ? 'border-green-300 bg-gradient-to-r from-green-50 via-white to-emerald-50'
          : 'border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50'
      }`}
      aria-labelledby="whatsapp-inbound-om-heading"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${
              enabled ? 'bg-green-600 text-white' : 'bg-slate-400 text-white'
            }`}
          >
            <FaImages className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2
                id="whatsapp-inbound-om-heading"
                className="text-lg font-extrabold text-slate-900 tracking-tight"
              >
                {t('whatsapp.inboundOmEnabled')}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {enabled ? (
                  <>
                    <FaCheckCircle className="h-3 w-3" aria-hidden />
                    {t('whatsapp.inboundOmStatusOn')}
                  </>
                ) : (
                  <>
                    <FaPauseCircle className="h-3 w-3" aria-hidden />
                    {t('whatsapp.inboundOmStatusOff')}
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {t('whatsapp.inboundOmEnabledHint')}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:pl-4 border-t border-slate-100/80 pt-4 sm:border-t-0 sm:pt-0">
          <WhatsAppToggleSwitch
            checked={enabled}
            onChange={onToggle}
            disabled={saving}
            label={enabled ? t('whatsapp.inboundOmToggleOn') : t('whatsapp.inboundOmToggleOff')}
            description={saving ? t('whatsapp.saving') : undefined}
          />
        </div>
      </div>
    </section>
  );
}
