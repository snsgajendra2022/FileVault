import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMemoriesEvent } from '../../services/memoriesService';
import {
  getMemoriesEventTypePreviewUrls,
  MEMORIES_EVENT_TYPE_IDS,
  type MemoriesEventTypeId,
} from '../../config/memoriesEventTypes';

const EVENT_TYPE_I18N: Record<MemoriesEventTypeId, string> = {
  wedding: 'eventTypeWedding',
  birthday: 'eventTypeBirthday',
  corporate: 'eventTypeCorporate',
  family: 'eventTypeFamily',
  other: 'eventTypeOther',
};

const MemoriesCreateEventPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = React.useState('');
  const [dateTime, setDateTime] = React.useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [location, setLocation] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [eventType, setEventType] = React.useState<MemoriesEventTypeId>('wedding');

  const createMutation = useMutation({
    mutationFn: async () =>
      createMemoriesEvent({
        name: name.trim(),
        dateTime: new Date(dateTime).toISOString(),
        location: location.trim() || t('defaultLocation'),
        privacy: 'invite',
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
        eventType,
      }),
    onSuccess: async (ev) => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      navigate(`/memories/events/${ev.id}`, { replace: true });
    },
    onError: () => toast.error(t('createEventError')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  const typePreviewUrls = React.useMemo(() => getMemoriesEventTypePreviewUrls(eventType), [eventType]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 font-memories-body">
      <Link
        to="/memories/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('backToEvents')}
      </Link>
      <h1 className="font-memories-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-2">
        {t('createTitle')}
      </h1>
      <p className="text-sm text-slate-600 mb-8">{t('createSubtitle')}</p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldName')}</label>
          <input
            className="input-modern w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fieldNamePh')}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldDate')}</label>
          <input
            type="datetime-local"
            className="input-modern w-full"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldLocation')}</label>
          <input
            className="input-modern w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('fieldLocationPh')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">{t('fieldEventType')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {MEMORIES_EVENT_TYPE_IDS.map((id) => {
              const selected = eventType === id;
              const thumb = getMemoriesEventTypePreviewUrls(id)[0];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEventType(id)}
                  className={`group text-left rounded-2xl border overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-md'
                      : 'border-slate-200 hover:border-violet-300 hover:shadow-sm'
                  }`}
                >
                  <div className="relative h-20 w-full overflow-hidden bg-slate-100">
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div
                      className={`absolute inset-0 ${selected ? 'bg-violet-600/15' : 'bg-black/0 group-hover:bg-black/5'}`}
                    />
                  </div>
                  <div className={`px-2.5 py-2 text-xs font-bold ${selected ? 'text-violet-700' : 'text-slate-700'}`}>
                    {t(EVENT_TYPE_I18N[id])}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('eventTypePreviewHint')}</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {typePreviewUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-36 w-28 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 shadow-sm"
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldSummary')}</label>
          <input
            className="input-modern w-full"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('fieldSummaryPh')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldDescription')}</label>
          <textarea
            className="input-modern w-full min-h-[120px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('fieldDescriptionPh')}
            rows={4}
          />
        </div>
        <p className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          {t('createPrivacyInviteOnly')}
        </p>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {createMutation.isPending ? t('shareSending') : t('createSubmit')}
        </button>
      </form>
    </div>
  );
};

export default MemoriesCreateEventPage;
