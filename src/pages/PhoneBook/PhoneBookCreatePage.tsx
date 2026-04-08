import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import { createPhoneBookContact, type PhoneBookContactMeta } from '../../services/phoneBookService';
import { PhoneBookContactForm, type PhoneBookContactFormValue } from './components/PhoneBookContactForm';

const PhoneBookCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = React.useState<PhoneBookContactFormValue>({
    displayName: '',
    email: '',
    countryCode: '+91',
    mobile: '',
    avatarUrl: '',
    notes: '',
    meta: {
      contactType: 'Client',
      inviteStatus: 'not_invited',
    } satisfies PhoneBookContactMeta,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createPhoneBookContact({
        displayName: form.displayName.trim(),
        email: form.email.trim() || undefined,
        countryCode: form.countryCode.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        meta: form.meta,
      }),
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['phoneBookContacts'] });
      toast.success('Contact created');
      navigate(`/phonebook/${encodeURIComponent(created.id)}`);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message || 'Failed to create contact');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/phonebook"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
        >
          <FaArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(124,58,237,0.35)] sm:p-8">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Add new contact</h1>
          <p className="mt-2 text-sm text-slate-600">
            This contact will appear in invite/share pickers (events, galleries, QR links).
          </p>

          <div className="mt-6">
            <PhoneBookContactForm value={form} onChange={setForm} />
          </div>

          <button
            type="button"
            onClick={() => {
              if (!form.displayName.trim()) {
                toast.error('Name is required');
                return;
              }
              createMutation.mutate();
            }}
            disabled={createMutation.isPending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50"
          >
            <FaSave className="h-4 w-4" />
            {createMutation.isPending ? 'Saving…' : 'Save contact'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneBookCreatePage;
