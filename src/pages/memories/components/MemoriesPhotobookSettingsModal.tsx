import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import type { PhotobookTemplateOption } from '../../../services/photobookTemplatesService';

export type MemoriesPhotobookFormValues = {
  photobookNeeded: boolean;
  photobookTemplateId: number | null;
  photobookThankYouMessage: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial: MemoriesPhotobookFormValues;
  templates: PhotobookTemplateOption[];
  loadingTemplates: boolean;
  onSave: (v: MemoriesPhotobookFormValues) => void | Promise<void>;
  saving?: boolean;
};

const MemoriesPhotobookSettingsModal: React.FC<Props> = ({
  open,
  onClose,
  initial,
  templates,
  loadingTemplates,
  onSave,
  saving = false,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const [needed, setNeeded] = React.useState(initial.photobookNeeded);
  const [templateId, setTemplateId] = React.useState<number | null>(initial.photobookTemplateId);
  const [thankYou, setThankYou] = React.useState(initial.photobookThankYouMessage ?? '');

  const selectedTemplate = React.useMemo(() => {
    if (templateId == null) return null;
    return templates.find((x) => x.id === templateId) ?? null;
  }, [templateId, templates]);

  const generateThankYouMessage = React.useCallback(() => {
    const name = selectedTemplate?.name?.trim();
    const line2 = name ? t('photobookAutoL2', { name }) : t('photobookAutoL2Fallback');
    return [
      t('photobookAutoL1'),
      line2,
      t('photobookAutoL3'),
      t('photobookAutoL4'),
      t('photobookAutoL5'),
    ].join('\n');
  }, [selectedTemplate?.name, t]);

  React.useEffect(() => {
    if (!open) return;
    setNeeded(initial.photobookNeeded);
    setTemplateId(initial.photobookTemplateId);
    setThankYou(initial.photobookThankYouMessage ?? '');
  }, [open, initial.photobookNeeded, initial.photobookTemplateId, initial.photobookThankYouMessage]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needed && templateId == null) return;
    await onSave({
      photobookNeeded: needed,
      photobookTemplateId: needed ? templateId : null,
      photobookThankYouMessage: thankYou.trim(),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[min(90vh,720px)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{t('photobookModalTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('photobookModalClose')}
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <input
                type="checkbox"
                checked={needed}
                onChange={(e) => {
                  setNeeded(e.target.checked);
                  if (!e.target.checked) setTemplateId(null);
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{t('photobookNeededLabel')}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">{t('photobookNeededHint')}</span>
              </span>
            </label>

            {needed ? (
              <>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    {t('photobookPickTemplate')}
                  </p>
                  {loadingTemplates ? (
                    <p className="text-sm text-slate-500 py-4">{t('photobookTemplatesLoading')}</p>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      {t('photobookTemplatesEmpty')}
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {templates.map((tpl) => {
                        const selected = templateId === tpl.id;
                        return (
                          <li key={tpl.id}>
                            <button
                              type="button"
                              onClick={() => setTemplateId(tpl.id)}
                              className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                                selected
                                  ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/30'
                                  : 'border-slate-200 hover:border-violet-300 bg-white'
                              }`}
                            >
                              <span className="block text-sm font-semibold text-slate-900">{tpl.name}</span>
                              {tpl.description ? (
                                <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">{tpl.description}</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {needed && templateId == null && !loadingTemplates && templates.length > 0 ? (
                    <p className="text-xs text-rose-600 mt-2">{t('photobookTemplateRequired')}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {t('photobookThankYouLabel')}
                  </label>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] text-slate-500">
                      {selectedTemplate?.name ? (
                        <>
                          {t('photobookSelectedTemplate')} {selectedTemplate.name}
                        </>
                      ) : (
                        t('photobookAutoPickTemplateFirst')
                      )}
                    </p>
                    <button
                      type="button"
                      disabled={!selectedTemplate}
                      onClick={() => setThankYou(generateThankYouMessage())}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {t('photobookAutoGenerate')}
                    </button>
                  </div>
                  <textarea
                    value={thankYou}
                    onChange={(e) => setThankYou(e.target.value)}
                    rows={3}
                    className="input-modern w-full min-h-[88px] resize-y text-sm"
                    placeholder={t('photobookThankYouPlaceholder')}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">{t('photobookThankYouHint')}</p>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex gap-2 justify-end border-t border-slate-100 px-5 py-4 shrink-0 bg-slate-50/80 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('photobookModalCancel')}
            </button>
            <button
              type="submit"
              disabled={saving || (needed && templateId == null && templates.length > 0)}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-40"
            >
              {saving ? t('photobookModalSaving') : t('photobookModalSave')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default MemoriesPhotobookSettingsModal;
