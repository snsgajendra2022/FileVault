import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaSave,
  FaUndo,
  FaShieldAlt,
  FaUsers,
  FaComments,
  FaBell,
  FaCheckCircle,
} from 'react-icons/fa';

export type WhatsAppConfigValues = {
  dmPolicy: 'pairing' | 'allowlist' | 'open' | 'disabled';
  allowFrom: string;
  groupPolicy: 'open' | 'allowlist' | 'disabled';
  groupAllowFrom: string;
  selfChatMode: boolean;
  textChunkLimit: number;
  mediaMaxMb: number;
  sendReadReceipts: boolean;
  reactionLevel: 'off' | 'ack' | 'minimal' | 'extensive';
  debounceMs: number;
};

const DEFAULT_CONFIG: WhatsAppConfigValues = {
  dmPolicy: 'pairing',
  allowFrom: '',
  groupPolicy: 'allowlist',
  groupAllowFrom: '',
  selfChatMode: false,
  textChunkLimit: 4000,
  mediaMaxMb: 50,
  sendReadReceipts: true,
  reactionLevel: 'minimal',
  debounceMs: 0,
};

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-green-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

export default function WhatsAppConfigForm({
  initial,
  onSave,
  saving,
}: {
  initial?: Partial<WhatsAppConfigValues>;
  onSave: (values: WhatsAppConfigValues) => void;
  saving?: boolean;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<WhatsAppConfigValues>({
    ...DEFAULT_CONFIG,
    ...initial,
  });
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof WhatsAppConfigValues>(
    key: K,
    val: WhatsAppConfigValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => {
    onSave(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setValues(DEFAULT_CONFIG);
    setSaved(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow">
          <FaShieldAlt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            {t('whatsapp.configTitle')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('whatsapp.configSubtitle')}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* DM Policy */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <FaComments className="inline h-3.5 w-3.5 mr-1.5 text-slate-400" />
            {t('whatsapp.dmPolicy')}
          </label>
          <select
            value={values.dmPolicy}
            onChange={(e) => update('dmPolicy', e.target.value as WhatsAppConfigValues['dmPolicy'])}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          >
            <option value="pairing">{t('whatsapp.dmPolicyPairing')}</option>
            <option value="allowlist">{t('whatsapp.dmPolicyAllowlist')}</option>
            <option value="open">{t('whatsapp.dmPolicyOpen')}</option>
            <option value="disabled">{t('whatsapp.dmPolicyDisabled')}</option>
          </select>
          <p className="mt-1.5 text-xs text-slate-500">{t('whatsapp.dmPolicyHint')}</p>
        </div>

        {/* Allow From */}
        {(values.dmPolicy === 'allowlist' || values.dmPolicy === 'pairing') && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <FaUsers className="inline h-3.5 w-3.5 mr-1.5 text-slate-400" />
              {t('whatsapp.allowFrom')}
            </label>
            <textarea
              value={values.allowFrom}
              onChange={(e) => update('allowFrom', e.target.value)}
              placeholder={t('whatsapp.allowFromPlaceholder')}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all resize-none"
            />
            <p className="mt-1.5 text-xs text-slate-500">{t('whatsapp.allowFromHint')}</p>
          </div>
        )}

        {/* Group Policy */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <FaUsers className="inline h-3.5 w-3.5 mr-1.5 text-slate-400" />
            {t('whatsapp.groupPolicy')}
          </label>
          <select
            value={values.groupPolicy}
            onChange={(e) =>
              update('groupPolicy', e.target.value as WhatsAppConfigValues['groupPolicy'])
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          >
            <option value="allowlist">{t('whatsapp.groupPolicyAllowlist')}</option>
            <option value="open">{t('whatsapp.groupPolicyOpen')}</option>
            <option value="disabled">{t('whatsapp.groupPolicyDisabled')}</option>
          </select>
        </div>

        {/* Group Allow From */}
        {values.groupPolicy === 'allowlist' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {t('whatsapp.groupAllowFrom')}
            </label>
            <textarea
              value={values.groupAllowFrom}
              onChange={(e) => update('groupAllowFrom', e.target.value)}
              placeholder={t('whatsapp.groupAllowFromPlaceholder')}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all resize-none"
            />
          </div>
        )}

        {/* Self Chat Mode */}
        <ToggleSwitch
          checked={values.selfChatMode}
          onChange={(v) => update('selfChatMode', v)}
          label={t('whatsapp.selfChatMode')}
          description={t('whatsapp.selfChatModeHint')}
        />

        {/* Send Read Receipts */}
        <ToggleSwitch
          checked={values.sendReadReceipts}
          onChange={(v) => update('sendReadReceipts', v)}
          label={t('whatsapp.sendReadReceipts')}
          description={t('whatsapp.sendReadReceiptsHint')}
        />

        {/* Text Chunk Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {t('whatsapp.textChunkLimit')}
            </label>
            <input
              type="number"
              min={100}
              max={10000}
              value={values.textChunkLimit}
              onChange={(e) => update('textChunkLimit', Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {t('whatsapp.mediaMaxMb')}
            </label>
            <input
              type="number"
              min={1}
              max={2000}
              value={values.mediaMaxMb}
              onChange={(e) => update('mediaMaxMb', Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
            />
          </div>
        </div>

        {/* Reaction Level */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            <FaBell className="inline h-3.5 w-3.5 mr-1.5 text-slate-400" />
            {t('whatsapp.reactionLevel')}
          </label>
          <select
            value={values.reactionLevel}
            onChange={(e) =>
              update('reactionLevel', e.target.value as WhatsAppConfigValues['reactionLevel'])
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          >
            <option value="off">{t('whatsapp.reactionLevelOff')}</option>
            <option value="ack">{t('whatsapp.reactionLevelAck')}</option>
            <option value="minimal">{t('whatsapp.reactionLevelMinimal')}</option>
            <option value="extensive">{t('whatsapp.reactionLevelExtensive')}</option>
          </select>
        </div>

        {/* Debounce */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            {t('whatsapp.debounceMs')}
          </label>
          <input
            type="number"
            min={0}
            max={10000}
            step={100}
            value={values.debounceMs}
            onChange={(e) => update('debounceMs', Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          />
          <p className="mt-1.5 text-xs text-slate-500">{t('whatsapp.debounceMsHint')}</p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saved ? (
            <FaCheckCircle className="h-3.5 w-3.5" />
          ) : (
            <FaSave className="h-3.5 w-3.5" />
          )}
          {saved ? t('common.saved') : saving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 transition-colors"
        >
          <FaUndo className="h-3.5 w-3.5" />
          {t('common.reset')}
        </button>
      </div>
    </div>
  );
}
