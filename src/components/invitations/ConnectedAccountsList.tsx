import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FaUsers } from 'react-icons/fa';
import { Connection, getConnections } from '../../services/invitationService';

const ConnectedAccountsList: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Connection[]>({
    queryKey: ['global-connections'],
    queryFn: getConnections,
  });

  const accounts = data ?? [];
  const ic = 'invitationsComponents.connected';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
          <FaUsers className="w-5 h-5 text-sky-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t(`${ic}.title`)}</h2>
          <p className="text-xs text-slate-500">{t(`${ic}.subtitle`)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          {t(`${ic}.loading`)}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-2">
          {t(`${ic}.empty`)}
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
                    {t(`${ic}.connection`, { id: acc.connectionId })}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {t(`${ic}.userPair`, {
                      from: acc.userId ?? t(`${ic}.dash`),
                      to: acc.connectedUserId ?? t(`${ic}.dash`),
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {t(`${ic}.type`, { type: acc.connectionType || t(`${ic}.dash`) })}
                  </p>
                </div>
              </div>
              {acc.createdAt && (
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {t(`${ic}.since`, { date: new Date(acc.createdAt).toLocaleDateString() })}
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
