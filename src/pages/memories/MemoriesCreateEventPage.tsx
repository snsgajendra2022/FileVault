import React from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MemoriesEvent, MemoriesPrivacy } from '../../features/memories/types';
import { createMemoriesEvent, getMemoriesEventById, updateMemoriesEvent } from '../../api/services/memoriesService';
import { listPhotobookTemplates } from '../../api/services/photobookTemplatesService';
import {
  getMemoriesEventTypePreviewUrls,
  MEMORIES_EVENT_TYPE_IDS,
  normalizeMemoriesEventType,
  type MemoriesEventTypeId,
} from '../../config/memoriesEventTypes';
import MemoriesPhotobookSettingsModal, {
  type MemoriesPhotobookFormValues,
} from './components/MemoriesPhotobookSettingsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EVENT_TYPE_I18N: Record<MemoriesEventTypeId, string> = {
  wedding: 'eventTypeWedding',
  birthday: 'eventTypeBirthday',
  corporate: 'eventTypeCorporate',
  family: 'eventTypeFamily',
  other: 'eventTypeOther',
};

const defaultPhotobook: MemoriesPhotobookFormValues = {
  photobookNeeded: false,
  photobookTemplateId: null,
  photobookThankYouMessage: '',
};

function privacyFromEvent(ev: MemoriesEvent | null | undefined): MemoriesPrivacy {
  const p = (ev as MemoriesEvent & { privacy?: MemoriesPrivacy })?.privacy;
  if (p === 'public' || p === 'private' || p === 'invite') return p;
  return 'invite';
}

const MemoriesCreateEventPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams<{ eventId?: string }>();
  const isEditMode = Boolean(eventId);
  const qc = useQueryClient();

  const [name, setName] = React.useState('');
  const [dateTime, setDateTime] = React.useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [locationField, setLocationField] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [eventType, setEventType] = React.useState<MemoriesEventTypeId>('wedding');
  const [photobookOpen, setPhotobookOpen] = React.useState(false);
  const [photobook, setPhotobook] = React.useState<MemoriesPhotobookFormValues>(defaultPhotobook);

  const seedFromList = React.useMemo(() => {
    const raw = (location.state as { memoriesSeedEvent?: MemoriesEvent } | undefined)?.memoriesSeedEvent;
    return raw && eventId && raw.id === eventId ? raw : undefined;
  }, [location.state, eventId]);

  const {
    data: loadedEvent,
    isLoading: loadingEvent,
    isError: loadError,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ['memoriesEvent', eventId],
    queryFn: async () => (eventId ? getMemoriesEventById(eventId) : null),
    enabled: isEditMode && Boolean(eventId),
    staleTime: 10_000,
    placeholderData: seedFromList,
  });

  const eventForForm = loadedEvent ?? null;

  React.useEffect(() => {
    if (isEditMode) return;
    setName('');
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDateTime(d.toISOString().slice(0, 16));
    setLocationField('');
    setCoverImageUrl('');
    setSummary('');
    setDescription('');
    setEventType('wedding');
    setPhotobook(defaultPhotobook);
  }, [isEditMode]);

  React.useEffect(() => {
    if (!isEditMode) return;
    const e = eventForForm;
    if (!e) return;
    setName(e.name);
    const d = new Date(e.dateTime);
    if (!Number.isNaN(d.getTime())) {
      const local = new Date(d);
      local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
      setDateTime(local.toISOString().slice(0, 16));
    }
    setLocationField(e.location ?? '');
    setCoverImageUrl(e.coverImageUrl ?? '');
    setSummary(e.summary ?? '');
    setDescription(e.description ?? '');
    setEventType(normalizeMemoriesEventType(e.eventType));
    setPhotobook({
      photobookNeeded: Boolean(e.photobookNeeded),
      photobookTemplateId:
        e.photobookTemplateId != null && Number.isFinite(Number(e.photobookTemplateId))
          ? Number(e.photobookTemplateId)
          : null,
      photobookThankYouMessage: e.photobookThankYouMessage ?? '',
    });
  }, [isEditMode, eventForForm]);

  const { data: photobookTemplates = [], isLoading: photobookTemplatesLoading } = useQuery({
    queryKey: ['photobookTemplates'],
    queryFn: listPhotobookTemplates,
    staleTime: 300_000,
    enabled: photobookOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createMemoriesEvent({
        name: name.trim(),
        dateTime: new Date(dateTime).toISOString(),
        location: locationField.trim() || t('defaultLocation'),
        privacy: 'invite',
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
        eventType,
        coverImageUrl: coverImageUrl.trim() || undefined,
        photobookNeeded: photobook.photobookNeeded,
        photobookTemplateId: photobook.photobookNeeded ? photobook.photobookTemplateId : null,
        photobookThankYouMessage:
          photobook.photobookNeeded && photobook.photobookThankYouMessage.trim()
            ? photobook.photobookThankYouMessage.trim()
            : null,
      }),
    onSuccess: async (ev) => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      navigate(`/memories/events/${ev.id}`, { replace: true, state: { memoriesSeedEvent: ev } });
    },
    onError: () => toast.error(t('createEventError')),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error('missing event id');
      const privacy = privacyFromEvent(eventForForm);
      return updateMemoriesEvent(eventId, {
        name: name.trim(),
        dateTime: new Date(dateTime).toISOString(),
        location: locationField.trim() || t('defaultLocation'),
        privacy,
        ...(summary.trim() ? { summary: summary.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(eventType ? { eventType } : {}),
        ...(coverImageUrl.trim() ? { coverImageUrl: coverImageUrl.trim() } : {}),
        photobookNeeded: photobook.photobookNeeded,
        ...(photobook.photobookNeeded && photobook.photobookTemplateId != null
          ? { photobookTemplateId: photobook.photobookTemplateId }
          : !photobook.photobookNeeded
            ? { photobookTemplateId: null }
            : {}),
        photobookThankYouMessage: photobook.photobookNeeded
          ? photobook.photobookThankYouMessage.trim() || ''
          : '',
      });
    },
    onSuccess: async (ev) => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      await qc.invalidateQueries({ queryKey: ['memoriesEvent', eventId] });
      navigate(`/memories/events/${ev.id}`, { replace: true, state: { memoriesSeedEvent: ev } });
    },
    onError: () => toast.error(t('updateEventError')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (photobook.photobookNeeded && photobookTemplates.length > 0 && photobook.photobookTemplateId == null) {
      toast.error(t('photobookTemplateRequired'));
      setPhotobookOpen(true);
      return;
    }
    if (isEditMode) updateMutation.mutate();
    else createMutation.mutate();
  };

  const typePreviewUrls = React.useMemo(() => getMemoriesEventTypePreviewUrls(eventType), [eventType]);
  const saving = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && !eventForForm && loadingEvent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6 font-memories-body flex justify-center">
        <div className="rounded-3xl border border-violet-200/60 dark:border-violet-800/60 bg-white dark:bg-slate-900 px-10 py-14 shadow-sm">
          <LoadingSpinner size="lg" text={t('refresh')} />
        </div>
      </div>
    );
  }

  if (isEditMode && !eventForForm && !loadingEvent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 font-memories-body">
        <Link
          to="/memories/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
        >
          <FaArrowLeft className="h-3 w-3" />
          {t('backToEvents')}
        </Link>
        <p className="text-slate-600 font-medium">{loadError ? t('eventsLoadError') : t('eventNotFound')}</p>
        <button
          type="button"
          onClick={() => refetchEvent()}
          className="mt-4 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
        >
          {t('refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 font-memories-body">
      <Link
        to="/memories/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('backToEvents')}
      </Link>
      <h1 className="font-memories-display text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
        {isEditMode ? t('editEventTitle') : t('createTitle')}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">{isEditMode ? t('editEventSubtitle') : t('createSubtitle')}</p>

      <MemoriesPhotobookSettingsModal
        open={photobookOpen}
        onClose={() => setPhotobookOpen(false)}
        initial={photobook}
        templates={photobookTemplates}
        loadingTemplates={photobookTemplatesLoading}
        onSave={async (v) => {
          setPhotobook(v);
          setPhotobookOpen(false);
        }}
      />

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldName')}</label>
          <input
            className="input-modern w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fieldNamePh')}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldDate')}</label>
          <input
            type="datetime-local"
            className="input-modern w-full"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldLocation')}</label>
          <input
            className="input-modern w-full"
            value={locationField}
            onChange={(e) => setLocationField(e.target.value)}
            placeholder={t('fieldLocationPh')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldCoverImageUrl')}</label>
          <input
            className="input-modern w-full"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder={t('fieldCoverImageUrlPh')}
            type="url"
            inputMode="url"
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldSummary')}</label>
          <input
            className="input-modern w-full"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('fieldSummaryPh')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">{t('fieldDescription')}</label>
          <textarea
            className="input-modern w-full min-h-[120px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('fieldDescriptionPh')}
            rows={4}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={photobook.photobookNeeded}
                onChange={(e) =>
                  setPhotobook((p) => ({
                    ...p,
                    photobookNeeded: e.target.checked,
                    photobookTemplateId: e.target.checked ? p.photobookTemplateId : null,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-semibold text-slate-800">{t('photobookNeededLabel')}</span>
            </label>
            <button
              type="button"
              onClick={() => setPhotobookOpen(true)}
              className="text-sm font-bold text-violet-600 hover:text-violet-700 hover:underline"
            >
              {t('photobookConfigure')}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{t('photobookNeededHint')}</p>
          <p className="text-xs font-medium text-slate-700">
            {photobook.photobookNeeded && photobook.photobookTemplateId != null
              ? t('photobookSummaryOn', { id: photobook.photobookTemplateId })
              : photobook.photobookNeeded
                ? t('photobookTemplateRequired')
                : t('photobookSummaryOff')}
          </p>
        </div>

        <p className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          {isEditMode ? t('editPrivacyNote') : t('createPrivacyInviteOnly')}
        </p>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl border border-[var(--header-border)] bg-[var(--header-background)] py-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 shadow-[var(--header-box-shadow)] hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {saving ? t('shareSending') : isEditMode ? t('editSubmit') : t('createSubmit')}
        </button>
      </form>
    </div>
  );
};

export default MemoriesCreateEventPage;
