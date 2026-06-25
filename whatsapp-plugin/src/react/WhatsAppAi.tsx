import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WhatsAppAiProvider, useWhatsAppAiConfig } from './context';
import {
  createWaClient,
  waBootstrap,
  waGetStatus,
  waLinkAuth,
  waLogout,
  waMessages,
  waStartLogin,
  waSyncProject,
  waWaitLogin,
  type WaLogEntry,
  type WaStatus,
} from './api';

export type WhatsAppAiProps = {
  /** OM server URL, e.g. http://127.0.0.1:9093 */
  apiUrl?: string;
  /** Your app JWT (optional — uses localStorage token if omitted) */
  authToken?: string;
  /** User / tenant id (optional — linked phone used after QR) */
  userId?: string;
  className?: string;
  /** Show title bar */
  showHeader?: boolean;
  /** Show message log panel */
  showMessageLog?: boolean;
  /** Auto bootstrap + project sync when connected */
  autoConnect?: boolean;
  onConnected?: (status: WaStatus) => void;
  onError?: (error: Error) => void;
  onMessage?: (entry: WaLogEntry) => void;
};

type LoginUi = {
  busy: boolean;
  message: string | null;
  qrDataUrl: string | null;
  connected: boolean | null;
};

const defaultQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function label(entry: WaLogEntry): string {
  if (entry.from === 'om' || entry.from === 'system') return 'OM';
  if (entry.direction === 'inbound') return 'You';
  return 'OM';
}

function WhatsAppAiInner({
  className = '',
  showHeader = true,
  showMessageLog = true,
  autoConnect = true,
  onConnected,
  onError,
  onMessage,
}: Omit<WhatsAppAiProps, 'apiUrl' | 'authToken' | 'userId'>) {
  const config = useWhatsAppAiConfig();
  const client = useMemo(() => createWaClient(config), [config]);
  const queryClient = useQueryClient();

  const [login, setLogin] = useState<LoginUi>({
    busy: false,
    message: null,
    qrDataUrl: null,
    connected: null,
  });

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-ai', 'status', config.apiUrl],
    queryFn: () => waGetStatus(client),
    refetchInterval: 10_000,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['whatsapp-ai', 'messages', config.apiUrl],
    queryFn: () => waMessages(client),
    refetchInterval: 8_000,
    enabled: showMessageLog,
  });

  const startQr = useMutation({
    mutationFn: (force: boolean) => waStartLogin(client, force),
    onMutate: () => setLogin((p) => ({ ...p, busy: true, connected: null })),
    onSuccess: (data) => {
      setLogin({
        busy: false,
        message: data.message || null,
        qrDataUrl: data.qrDataUrl ?? null,
        connected: null,
      });
    },
    onError: (e: Error) => {
      setLogin((p) => ({ ...p, busy: false, message: e.message }));
      onError?.(e);
    },
  });

  const waitQr = useMutation({
    mutationFn: () => waWaitLogin(client),
    onMutate: () => setLogin((p) => ({ ...p, busy: true })),
    onSuccess: (data) => {
      setLogin((p) => ({
        ...p,
        busy: false,
        message: data.message || null,
        connected: data.connected ?? null,
        qrDataUrl: data.connected ? null : p.qrDataUrl,
      }));
      if (data.connected) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-ai'] });
        bootstrap.mutate();
      }
    },
    onError: (e: Error) => {
      setLogin((p) => ({ ...p, busy: false, message: e.message }));
      onError?.(e);
    },
  });

  const logout = useMutation({
    mutationFn: () => waLogout(client),
    onSuccess: () => {
      setLogin({ busy: false, message: 'Logged out', qrDataUrl: null, connected: null });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai'] });
    },
  });

  const bootstrap = useMutation({
    mutationFn: () => waBootstrap(client),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-ai'] }),
  });

  const linkAndSync = useCallback(
    async (phone: string | null | undefined) => {
      if (!phone) return;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('waLinkedPhone', phone);
        }
        await waLinkAuth(client, phone);
        await waSyncProject(client, phone);
      } catch {
        /* optional */
      }
    },
    [client]
  );

  useEffect(() => {
    if (!status?.connected || !status?.linked) return;
    onConnected?.(status);
    if (autoConnect && !status.omSetupComplete) {
      bootstrap.mutate();
    }
    if (status.linkedPhoneE164) {
      linkAndSync(status.linkedPhoneE164);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when connection state changes
  }, [status?.connected, status?.linked, status?.omSetupComplete, status?.linkedPhoneE164]);

  useEffect(() => {
    if (!messages?.length || !onMessage) return;
    const latest = messages[0];
    if (latest?.direction === 'inbound') onMessage(latest);
  }, [messages, onMessage]);

  const connected = Boolean(status?.connected && status?.linked);

  return (
    <div className={`wa-ai-root rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {showHeader && (
        <div className="border-b border-slate-100 bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 text-white">
          <h2 className="text-lg font-bold">WhatsApp AI</h2>
          <p className="text-sm text-green-100">Scan QR → Message yourself → OM replies</p>
        </div>
      )}

      <div className="space-y-4 p-5">
        {isLoading && !status && (
          <p className="text-sm text-slate-500">Connecting to WhatsApp service…</p>
        )}

        {status && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge ok={connected} label={connected ? 'Connected' : 'Not connected'} />
            {status.linkedPhoneE164 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {status.linkedPhoneE164}
              </span>
            )}
            {status.selfChatMode !== false && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">Self-chat only</span>
            )}
          </div>
        )}

        {status?.lastError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {status.lastError}
          </div>
        )}

        {login.message && (
          <p className="text-sm text-slate-600">{login.message}</p>
        )}

        {login.qrDataUrl && (
          <div className="flex justify-center rounded-xl border border-slate-100 bg-white p-4">
            <img src={login.qrDataUrl} alt="WhatsApp QR" className="h-56 w-56 object-contain" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Btn disabled={login.busy} onClick={() => startQr.mutate(true)}>
            {login.busy ? 'Working…' : 'Show QR'}
          </Btn>
          <Btn disabled={login.busy || !login.qrDataUrl} onClick={() => waitQr.mutate()}>
            Wait for scan
          </Btn>
          <Btn variant="ghost" disabled={login.busy} onClick={() => refetch()}>
            Refresh
          </Btn>
          <Btn variant="danger" disabled={login.busy} onClick={() => logout.mutate()}>
            Logout
          </Btn>
        </div>

        {showMessageLog && (
          <div className="rounded-xl border border-slate-100">
            <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              Messages (you + OM)
            </div>
            <div className="max-h-64 overflow-y-auto">
              {messagesLoading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
              {!messagesLoading && (!messages || messages.length === 0) && (
                <p className="p-4 text-sm text-slate-400">No messages yet. Chat in Message yourself on your phone.</p>
              )}
              <ul className="divide-y divide-slate-50">
                {(messages || []).map((m) => (
                  <li key={m.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-800">{label(m)}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {m.text && <p className="mt-1 text-slate-600">{m.text}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 font-medium ${
        ok ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const cls =
    variant === 'primary'
      ? 'bg-[#25D366] text-white hover:bg-green-600'
      : variant === 'danger'
        ? 'border border-red-200 text-red-600 hover:bg-red-50'
        : 'border border-slate-200 text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

/**
 * Drop-in WhatsApp + OM AI UI for any React app.
 *
 * @example
 * import { WhatsAppAi } from 'whatsapp-plugin/react';
 * <WhatsAppAi apiUrl="http://127.0.0.1:9093" />
 */
export function WhatsAppAi({
  apiUrl,
  authToken,
  userId,
  ...uiProps
}: WhatsAppAiProps) {
  const base =
    apiUrl ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_WHATSAPP_API_URL) ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_OPENCLAW_DEV_URL) ||
    'http://127.0.0.1:9093';

  return (
    <QueryClientProvider client={defaultQueryClient}>
      <WhatsAppAiProvider apiUrl={base} authToken={authToken} userId={userId}>
        <WhatsAppAiInner {...uiProps} />
      </WhatsAppAiProvider>
    </QueryClientProvider>
  );
}

export default WhatsAppAi;
