import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { WhatsAppAiProvider, useWhatsAppAiConfig } from './context';
import './whatsapp-ai.css';
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
  apiUrl?: string;
  authToken?: string;
  userId?: string;
  className?: string;
  showHeader?: boolean;
  showMessageLog?: boolean;
  autoConnect?: boolean;
  onConnected?: (status: WaStatus) => void;
  onError?: (error: Error) => void;
  onMessage?: (entry: WaLogEntry) => void;
  wrapProvider?: boolean;
};

function createWaQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });
}

type LoginUi = {
  busy: boolean;
  message: string | null;
  qrDataUrl: string | null;
  connected: boolean | null;
};

function label(entry: WaLogEntry): string {
  if (entry.from === 'om' || entry.from === 'system') return 'OM Assistant';
  if (entry.direction === 'inbound') return 'You';
  return 'OM Assistant';
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {on && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
          on ? 'bg-indigo-500' : 'bg-slate-300'
        }`}
      />
    </span>
  );
}

function WhatsAppAiInner({
  className = '',
  showHeader = true,
  showMessageLog = true,
  autoConnect = true,
  onConnected,
  onError,
  onMessage,
}: Omit<WhatsAppAiProps, 'apiUrl' | 'authToken' | 'userId' | 'wrapProvider'>) {
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
      setLogin({ busy: false, message: 'Session ended', qrDataUrl: null, connected: null });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.linked, status?.omSetupComplete, status?.linkedPhoneE164]);

  useEffect(() => {
    if (!messages?.length || !onMessage) return;
    const latest = messages[0];
    if (latest?.direction === 'inbound') onMessage(latest);
  }, [messages, onMessage]);

  const connected = Boolean(status?.connected && status?.linked);

  return (
    <div
      className={`wa-ai-root overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 ${className}`}
    >
      {showHeader && (
        <div className="wa-ai-hero relative overflow-hidden px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200/90">
                AI Channel
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                WhatsApp Assistant
              </h1>
              <p className="mt-2 max-w-md text-sm text-indigo-100/90">
                Link your number, chat in <strong className="font-semibold text-white">Message yourself</strong>, and
                let OM handle your project.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
              <StatusDot on={connected} />
              <div>
                <p className="text-xs font-medium text-indigo-100">Status</p>
                <p className="text-sm font-semibold text-white">
                  {connected ? 'Live' : isLoading ? 'Checking…' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-5">
        {/* Left — connect */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Connection</h3>

          {status?.linkedPhoneE164 && (
            <p className="mt-3 text-sm font-medium text-slate-800">{status.linkedPhoneE164}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge ok={connected} label={connected ? 'Connected' : 'Not connected'} />
            {status?.selfChatMode !== false && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Private self-chat
              </span>
            )}
          </div>

          {status?.lastError && (
            <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {status.lastError}
            </div>
          )}

          {login.message && (
            <p className="wa-ai-text mt-4 text-sm text-slate-600">{login.message}</p>
          )}

          <div className="mt-6 flex flex-col items-center">
            {login.qrDataUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-indigo-100/50">
                <img src={login.qrDataUrl} alt="WhatsApp QR" className="h-52 w-52 object-contain sm:h-56 sm:w-56" />
              </div>
            ) : (
              <div className="flex h-52 w-full max-w-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5M3.75 9h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                  </svg>
                </div>
                <p className="wa-ai-muted px-4 text-xs text-slate-500">Tap Show QR to link WhatsApp</p>
              </div>
            )}
            <p className="wa-ai-muted mt-3 text-center text-xs text-slate-500">
              WhatsApp → Linked devices → Scan code
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Btn disabled={login.busy} onClick={() => startQr.mutate(true)} className="col-span-2">
              {login.busy ? 'Please wait…' : 'Show QR code'}
            </Btn>
            <Btn disabled={login.busy || !login.qrDataUrl} onClick={() => waitQr.mutate()} variant="ghost">
              Wait for scan
            </Btn>
            <Btn disabled={login.busy} onClick={() => refetch()} variant="ghost">
              Refresh
            </Btn>
            <Btn disabled={login.busy} onClick={() => logout.mutate()} variant="danger" className="col-span-2">
              End session
            </Btn>
          </div>
        </div>

        {/* Right — messages */}
        {showMessageLog && (
          <div className="flex flex-col bg-white p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inbox</h3>
                <p className="mt-0.5 text-xs text-slate-400">You and OM only</p>
              </div>
              {messages && messages.length > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {messages.length}
                </span>
              )}
            </div>

            <div className="min-h-[280px] flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              {messagesLoading && (
                <div className="flex h-full items-center justify-center">
                  <p className="wa-ai-muted text-sm text-slate-400">Loading messages…</p>
                </div>
              )}
              {!messagesLoading && (!messages || messages.length === 0) && (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">No messages yet</p>
                  <p className="wa-ai-muted mt-1 max-w-xs text-xs text-slate-400">
                    Open WhatsApp on your phone → Message yourself → say hi to OM
                  </p>
                </div>
              )}
              <ul className="space-y-3">
                {(messages || []).map((m) => {
                  const inbound = m.direction === 'inbound';
                  return (
                    <li
                      key={m.id}
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        inbound
                          ? 'wa-ai-msg-in mr-auto bg-white text-slate-800'
                          : 'wa-ai-msg-out ml-auto bg-indigo-600 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-semibold ${inbound ? 'text-slate-500' : 'text-indigo-100'}`}>
                          {label(m)}
                        </span>
                        <span className={`text-[10px] ${inbound ? 'text-slate-400' : 'text-indigo-200'}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {m.text && (
                        <p className={`mt-1.5 leading-relaxed ${inbound ? 'text-slate-700' : 'text-white'}`}>
                          {m.text}
                        </p>
                      )}
                    </li>
                  );
                })}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'wa-ai-badge-ok bg-indigo-50 text-indigo-700' : 'wa-ai-badge-off bg-slate-100 text-slate-600'
      }`}
    >
      <StatusDot on={ok} />
      {label}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
}) {
  const cls =
    variant === 'primary'
      ? 'wa-ai-btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-500 hover:to-violet-500'
      : variant === 'danger'
        ? 'wa-ai-btn-danger border border-red-200 bg-white text-red-600 hover:bg-red-50'
        : 'wa-ai-btn-ghost border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-45 ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

export function WhatsAppAi({
  apiUrl,
  authToken,
  userId,
  wrapProvider = false,
  ...uiProps
}: WhatsAppAiProps) {
  const base =
    apiUrl ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_WHATSAPP_API_URL) ||
    (typeof process !== 'undefined' && process.env?.REACT_APP_OPENCLAW_DEV_URL) ||
    'http://127.0.0.1:9093';

  const [standaloneClient] = useState(() => (wrapProvider ? createWaQueryClient() : null));

  const inner = (
    <WhatsAppAiProvider apiUrl={base} authToken={authToken} userId={userId}>
      <WhatsAppAiInner {...uiProps} />
    </WhatsAppAiProvider>
  );

  if (wrapProvider && standaloneClient) {
    return <QueryClientProvider client={standaloneClient}>{inner}</QueryClientProvider>;
  }

  return inner;
}

export default WhatsAppAi;
