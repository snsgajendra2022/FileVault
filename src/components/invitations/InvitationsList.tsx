import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FaClock, FaCheck, FaTimes, FaUsers } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { acceptInvitation, getInvitations, Invitation, rejectInvitation } from '../../services/invitationService';
import { getStoredUserData } from '../../utils/authUtils';

const InvitationsList: React.FC = () => {
  const currentUser = getStoredUserData();
  const currentUserId = currentUser?.id ?? null;
  const { data, isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ['global-invitations'],
    queryFn: getInvitations,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      await acceptInvitation(id);
    },
    onSuccess: () => {
      toast.success('Invitation accepted');
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to accept invitation';
      toast.error(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await rejectInvitation(id);
    },
    onSuccess: () => {
      toast.success('Invitation rejected');
      refetch();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to reject invitation';
      toast.error(msg);
    },
  });

  const all = data ?? [];
  const pending = all.filter((inv) => (inv.status || '').toUpperCase() === 'PENDING');
  const accepted = all.filter((inv) => (inv.status || '').toUpperCase() === 'ACCEPTED');

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <FaUsers className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Invitations</h2>
          <p className="text-xs text-slate-500">
            See all invitations you have sent or received, and manage their status.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          Loading invitations…
        </div>
      ) : (
        <>
          {/* Pending */}
          <div>
            <h3 className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-2">
              <FaClock className="w-3.5 h-3.5" />
              Pending invitations ({pending.length})
            </h3>
            {pending.length === 0 ? (
              <p className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                You don&apos;t have any pending invitations right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {pending.map((inv) => (
                  <li
                    key={inv.invitationId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        Invitation #{inv.invitationId}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Inviter: <span className="font-mono">{inv.inviterId ?? '—'}</span> · Invited:{' '}
                        <span className="font-mono">{inv.invitedUserId ?? '—'}</span>
                      </p>
                      {inv.message && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{inv.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inv.inviterId !== currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() => acceptMutation.mutate(inv.invitationId)}
                            disabled={acceptMutation.status === 'pending'}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60"
                          >
                            <FaCheck className="w-3 h-3" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectMutation.mutate(inv.invitationId)}
                            disabled={rejectMutation.status === 'pending'}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-60"
                          >
                            <FaTimes className="w-3 h-3" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Accepted */}
          <div>
            <h3 className="text-xs font-semibold text-emerald-800 flex items-center gap-1 mb-2">
              <FaCheck className="w-3.5 h-3.5" />
              Accepted invitations ({accepted.length})
            </h3>
            {accepted.length === 0 ? (
              <p className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                No invitations have been accepted yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {accepted.map((inv) => (
                  <li
                    key={inv.invitationId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-emerald-50/40 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        Invitation #{inv.invitationId}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Inviter: <span className="font-mono">{inv.inviterId ?? '—'}</span> · Connected user:{' '}
                        <span className="font-mono">{inv.invitedUserId ?? '—'}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                      <FaUsers className="w-3 h-3" />
                      Connected
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default InvitationsList;

