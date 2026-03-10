import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaUsers } from 'react-icons/fa';
import { Connection, getConnections } from '../../services/invitationService';

const ConnectedAccountsList: React.FC = () => {
  const { data, isLoading } = useQuery<Connection[]>({
    queryKey: ['global-connections'],
    queryFn: getConnections,
  });

  const accounts = data ?? [];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
          <FaUsers className="w-5 h-5 text-sky-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Connected accounts</h2>
          <p className="text-xs text-slate-500">
            Accounts you are linked with through invitation codes.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          Loading connected accounts…
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-2">
          You don&apos;t have any connected accounts yet. Share your invitation code to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((acc) => (
            <li
              key={acc.connectionId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <FaUsers className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    Connection #{acc.connectionId}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    User {acc.userId ?? '—'} ↔ {acc.connectedUserId ?? '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Type: {acc.connectionType || '—'}
                  </p>
                </div>
              </div>
              {acc.createdAt && (
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  Since {new Date(acc.createdAt).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ConnectedAccountsList;

