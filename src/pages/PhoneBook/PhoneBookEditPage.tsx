import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import {
  getPhoneBookContactById,
  type PhoneBookContactMeta,
  updatePhoneBookContact,
} from '../../api/services/phoneBookService';
import { PhoneBookContactForm, type PhoneBookContactFormValue } from './components/PhoneBookContactForm';

const PhoneBookEditPage: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const id = contactId ? decodeURIComponent(contactId) : '';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['phoneBookContact', id],
    queryFn: async () => (id ? getPhoneBookContactById(id) : null),
    enabled: !!id,
  });

  const [form, setForm] = React.useState<PhoneBookContactFormValue>({
    displayName: '',
    email: '',
    countryCode: '+91',
    mobile: '',
    avatarUrl: '',
    notes: '',
    meta: {} satisfies PhoneBookContactMeta,
  });

  React.useEffect(() => {
    if (!data) return;
    setForm({
      displayName: data.displayName || '',
      email: data.email || '',
      countryCode: data.countryCode || '+91',
      mobile: data.mobile || '',
      avatarUrl: data.avatarUrl || '',
      notes: data.notes || '',
      meta: data.meta || ({} as PhoneBookContactMeta),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      updatePhoneBookContact(id, {
        displayName: form.displayName.trim(),
        email: form.email.trim() || undefined,
        countryCode: form.countryCode.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        meta: form.meta,
      }),
    onSuccess: async (updated) => {
      await qc.invalidateQueries({ queryKey: ['phoneBookContacts'] });
      await qc.invalidateQueries({ queryKey: ['phoneBookContact', id] });
      toast.success('Saved');
      navigate(`/phonebook/${encodeURIComponent(updated.id)}`);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { message?: string } } };
      toast.error(ax?.response?.data?.message || 'Failed to save');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">Contact not found.</div>
          <Link
            to="/phonebook"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-700"
          >
            <FaArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to={`/phonebook/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
        >
          <FaArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-5 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(124,58,237,0.35)] sm:p-8">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Edit contact</h1>

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
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50"
          >
            <FaSave className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneBookEditPage;
