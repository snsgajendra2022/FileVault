import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Connection, getConnections } from '../../api/services/invitationService';

const ConnectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Connection[]>({
    queryKey: ['connections-page'],
    queryFn: getConnections,
  });

  const connections = data ?? [];
  const dash = t('connectionsPage.dash');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{t('connectionsPage.title')}</h1>
          <p className="text-sm text-slate-600">
            {t('connectionsPage.subtitle')}
          </p>
        </header>

        <main className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              {t('connectionsPage.loading')}
            </div>
          ) : connections.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t('connectionsPage.empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Table view */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t('connectionsPage.thConnectionId')}</th>
                      <th className="px-3 py-2 font-semibold">{t('connectionsPage.thUserId')}</th>
                      <th className="px-3 py-2 font-semibold">{t('connectionsPage.thConnectedUserId')}</th>
                      <th className="px-3 py-2 font-semibold">{t('connectionsPage.thConnectionType')}</th>
                      <th className="px-3 py-2 font-semibold">{t('connectionsPage.thCreatedDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((conn) => (
                      <tr key={conn.connectionId} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-[11px] font-mono text-slate-900">
                          #{conn.connectionId}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          {conn.userId ?? dash}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          {conn.connectedUserId ?? dash}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          {conn.connectionType || dash}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                          {conn.createdAt ? new Date(conn.createdAt).toLocaleString() : dash}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Simple cards summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {connections.map((conn) => (
                  <div
                    key={`card-${conn.connectionId}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-900">
                      {t('connectionsPage.cardTitle', { id: conn.connectionId })}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {t('connectionsPage.userLabel')}{' '}
                      <span className="font-mono">{conn.userId ?? dash}</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {t('connectionsPage.connectedToLabel')}{' '}
                      <span className="font-mono">
                        {conn.connectedUserId ?? dash}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {t('connectionsPage.typeLabel')} {conn.connectionType || dash}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t('connectionsPage.createdLabel')}{' '}
                      {conn.createdAt
                        ? new Date(conn.createdAt).toLocaleDateString()
                        : dash}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ConnectionsPage;
