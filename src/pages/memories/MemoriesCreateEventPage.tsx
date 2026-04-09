import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import type { MemoriesPrivacy } from '../../features/memories/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMemoriesEvent } from '../../services/memoriesService';

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
  const [privacy, setPrivacy] = React.useState<MemoriesPrivacy>('invite');

  const createMutation = useMutation({
    mutationFn: async () =>
      createMemoriesEvent({
        name: name.trim(),
        dateTime: new Date(dateTime).toISOString(),
        location: location.trim() || t('defaultLocation'),
        privacy,
      }),
    onSuccess: async (ev) => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      navigate(`/memories/events/${ev.id}`, { replace: true });
    },
    onError: () => toast.error(t('copyFail')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 sm:px-6">
      <Link
        to="/memories/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('backToEvents')}
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('createTitle')}</h1>
      <p className="text-sm text-slate-500 mb-8">{t('createSubtitle')}</p>

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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">{t('fieldPrivacy')}</label>
          <select
            className="input-modern w-full"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as MemoriesPrivacy)}
          >
            <option value="public">{t('privacy.public')}</option>
            <option value="invite">{t('privacy.invite')}</option>
            <option value="private">{t('privacy.private')}</option>
          </select>
        </div>
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
