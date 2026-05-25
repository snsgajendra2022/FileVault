import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaShare, FaStar, FaTrash, FaUser } from 'react-icons/fa';
import { deletePhoneBookContact, getPhoneBookContactById } from '../../api/services/phoneBookService';
import { usePhoneBookPrefsStore } from '../../state/stores/phoneBookPrefsStore';

const PhoneBookDetailPage: React.FC = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const id = contactId ? decodeURIComponent(contactId) : '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toggleFavorite = usePhoneBookPrefsStore((s) => s.toggleFavorite);
  const favoriteContactIds = usePhoneBookPrefsStore((s) => s.favoriteContactIds);
  const markRecent = usePhoneBookPrefsStore((s) => s.markRecent);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['phoneBookContact', id],
    queryFn: async () => (id ? getPhoneBookContactById(id) : null),
    enabled: !!id,
  });

  const delMutation = useMutation({
    mutationFn: async () => deletePhoneBookContact(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['phoneBookContacts'] });
      toast.success('Deleted');
      navigate('/phonebook');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const c = data;

  React.useEffect(() => {
    if (c?.id) markRecent(c.id);
  }, [c?.id, markRecent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>
        </div>
      </div>
    );
  }

  if (isError || !c) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">Contact not found.</div>
          <Link
            to="/phonebook"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-700"
          >
            <FaArrowLeft className="h-4 w-4" />
            Back to phone book
          </Link>
        </div>
      </div>
    );
  }

  const mobileFull =
    c.mobile && (c.mobile.startsWith('+') ? c.mobile : `${(c.countryCode || '').replace(/\s/g, '')}${c.mobile}`);
  const mobileDigits = mobileFull ? mobileFull.replace(/[^\d]/g, '') : '';
  const whatsappFull = c.meta?.whatsapp?.trim() || (mobileFull ? mobileFull : '');
  const whatsappDigits = whatsappFull ? whatsappFull.replace(/[^\d]/g, '') : '';
  const isFav = favoriteContactIds.has(c.id);
  const type = c.meta?.contactType || 'Other';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/phonebook"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
          >
            <FaArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(c.id)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition-colors ${
                isFav
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FaStar className={`h-4 w-4 ${isFav ? 'text-amber-500' : 'text-slate-400'}`} />
              {isFav ? 'Favorite' : 'Star'}
            </button>
            <Link
              to={`/phonebook/${encodeURIComponent(c.id)}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/50"
            >
              <FaEdit className="h-4 w-4 text-violet-600" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm('Delete this contact?');
                if (ok) delMutation.mutate();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-100"
              disabled={delMutation.isPending}
            >
              <FaTrash className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="portal-card mt-5 overflow-hidden rounded-3xl shadow-[0_24px_60px_-40px_rgba(124,58,237,0.35)] dark:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.45)]">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-200/40 blur-[80px]" />
              <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-fuchsia-200/35 blur-[80px]" />
            </div>

            <div className="relative flex items-center gap-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-slate-600">
                    {c.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 truncate text-2xl font-extrabold text-slate-900">{c.displayName}</h1>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    {type}
                  </span>
                  {c.meta?.inviteStatus ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {c.meta.inviteStatus}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{[c.email, mobileFull].filter(Boolean).join(' · ') || '—'}</p>
                {(c.meta?.address || c.meta?.city || c.meta?.state) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {[c.meta.address, [c.meta.city, c.meta.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            {Array.isArray(c.meta?.tags) && c.meta!.tags!.length > 0 && (
              <div className="relative mt-5 flex flex-wrap gap-2">
                {c.meta!.tags!.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-6 sm:p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quick actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.email && (
                <a
                  href={`mailto:${encodeURIComponent(c.email)}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <FaEnvelope className="h-4 w-4 text-violet-600" />
                  Email
                </a>
              )}
              {mobileFull && (
                <a
                  href={`tel:${mobileFull}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <FaPhone className="h-4 w-4 text-violet-600" />
                  Call
                </a>
              )}
              <a
                href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : '#'}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  whatsappDigits
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                }`}
                aria-disabled={!whatsappDigits}
                onClick={(e) => {
                  if (!whatsappDigits) e.preventDefault();
                }}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[11px] font-extrabold text-white">
                  W
                </span>
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => toast.success('Event share flow: open an event and use Share → contacts picker')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
              >
                <FaShare className="h-4 w-4 text-violet-600" />
                Share event link
              </button>
            </div>

            {c.notes && (
              <div className="mt-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Notes</h2>
                <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  {c.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneBookDetailPage;
