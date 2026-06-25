import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaWhatsapp, FaExclamationTriangle } from 'react-icons/fa';
import {
  WhatsAppChannelCard,
  WhatsAppConfigForm,
  WhatsAppMessageLog,
  WhatsAppOmChatGuide,
  WhatsAppInboundOmBanner,
  type WhatsAppStatus,
  type WhatsAppLoginState,
  type WhatsAppConfigValues,
  type WhatsAppLogEntry,
} from '../components/OmAiWhatsappConfig';
import {
  getWhatsAppStatus,
  startWhatsAppLogin,
  waitWhatsAppLogin,
  logoutWhatsApp,
  saveWhatsAppConfig,
  getWhatsAppConfig,
  getWhatsAppMessages,
  bootstrapOmWhatsApp,
  sendOmWhatsAppToPhone,
  linkWhatsAppAuth,
  syncWhatsAppProject,
} from '../api/services/whatsappService';
import { useWhatsAppNotifications } from '../hooks/useWhatsAppNotifications';

function newQrPayload(): string {
  return `om-wa-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
}

export default function WhatsAppConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [loginState, setLoginState] = useState<WhatsAppLoginState>({
    busy: false,
    message: null,
    qrDataUrl: null,
    qrPayload: null,
    connected: null,
  });

  // ── Fetch status ────────────────────────────────────────────────────────
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp', 'status'],
    queryFn: getWhatsAppStatus,
    refetchInterval: 10_000,
  });

  // ── Fetch config ────────────────────────────────────────────────────────
  const { data: config, isLoading: configLoading } = useQuery<WhatsAppConfigValues>({
    queryKey: ['whatsapp', 'config'],
    queryFn: getWhatsAppConfig,
  });

  // ── Fetch messages ──────────────────────────────────────────────────────
  const { data: messages, isLoading: messagesLoading } = useQuery<WhatsAppLogEntry[]>({
    queryKey: ['whatsapp', 'messages'],
    queryFn: () => getWhatsAppMessages({ limit: 50 }),
    refetchInterval: 8_000,
  });

  useWhatsAppNotifications(messages, Boolean(status?.connected && status?.linked));

  // ── Mutations ───────────────────────────────────────────────────────────
  const startLoginMutation = useMutation({
    mutationFn: (force: boolean) => startWhatsAppLogin(force),
    onMutate: () => {
      setLoginState((prev) => ({ ...prev, busy: true, connected: null }));
    },
    onSuccess: (data) => {
      const qrDataUrl = data.qrDataUrl ?? null;
      const qrPayload = qrDataUrl ? null : data.qrPayload || newQrPayload();
      setLoginState((prev) => ({
        ...prev,
        busy: false,
        message: data.message || null,
        qrDataUrl,
        qrPayload,
        connected: null,
      }));
      if (data.source === 'openclaw-gateway' && qrDataUrl) {
        toast.success('Real WhatsApp QR — scan with your phone (Linked devices)');
      } else if (qrDataUrl) {
        toast.success(t('whatsapp.qrGenerated'));
      } else {
        toast.error(t('whatsapp.scanQrHint'));
      }
    },
    onError: (err: Error) => {
      const qrPayload = newQrPayload();
      setLoginState((prev) => ({
        ...prev,
        busy: false,
        message: `${err.message} (local QR shown — restart Java backend if this persists)`,
        qrDataUrl: null,
        qrPayload,
        connected: false,
      }));
      toast.error(err.message);
    },
  });

  const waitLoginMutation = useMutation({
    mutationFn: () => waitWhatsAppLogin(),
    onMutate: () => {
      setLoginState((prev) => ({ ...prev, busy: true }));
    },
    onSuccess: (data) => {
      setLoginState((prev) => ({
        ...prev,
        busy: false,
        message: data.message || null,
        connected: data.connected ?? null,
        qrDataUrl: data.connected ? null : prev.qrDataUrl,
        qrPayload: data.connected ? null : prev.qrPayload,
      }));
      if (data.connected) {
        toast.success(t('whatsapp.linkedSuccess'));
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
        bootstrapMutation.mutate();
      }
    },
    onError: (err: Error) => {
      setLoginState((prev) => ({
        ...prev,
        busy: false,
        message: err.message,
        connected: false,
      }));
      toast.error(err.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutWhatsApp(),
    onMutate: () => {
      setLoginState((prev) => ({ ...prev, busy: true }));
    },
    onSuccess: () => {
      setLoginState({
        busy: false,
        message: t('whatsapp.loggedOut'),
        qrDataUrl: null,
        qrPayload: null,
        connected: null,
      });
      toast.success(t('whatsapp.loggedOut'));
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
    },
    onError: (err: Error) => {
      setLoginState((prev) => ({ ...prev, busy: false, message: err.message }));
      toast.error(err.message);
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapOmWhatsApp(),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(data.message || t('whatsapp.omSetupDone'));
      } else if (data.error) {
        toast.error(data.error);
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => sendOmWhatsAppToPhone(text),
    onSuccess: () => {
      toast.success(t('whatsapp.manualSendSuccess'));
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status', 'messages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (values: WhatsAppConfigValues) => saveWhatsAppConfig(values),
    onSuccess: () => {
      toast.success(t('whatsapp.configSaved'));
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStartLogin = useCallback(
    (force: boolean) => startLoginMutation.mutate(force),
    [startLoginMutation],
  );

  const handleWaitLogin = useCallback(() => waitLoginMutation.mutate(), [waitLoginMutation]);

  const handleLogout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  const handleRefresh = useCallback(() => {
    refetchStatus();
    queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
  }, [refetchStatus, queryClient]);

  const handleSaveConfig = useCallback(
    (values: WhatsAppConfigValues) => saveConfigMutation.mutate(values),
    [saveConfigMutation],
  );

  const handleInboundOmToggle = useCallback(
    (inboundOmEnabled: boolean) => {
      if (!config) return;
      saveConfigMutation.mutate({ ...config, inboundOmEnabled });
    },
    [config, saveConfigMutation],
  );

  useEffect(() => {
    if (status?.connected && status?.linked) {
      setLoginState((prev) => ({
        ...prev,
        qrDataUrl: null,
        qrPayload: null,
        connected: true,
        message: prev.message?.includes('Invalid QR') ? null : prev.message,
      }));
    }
  }, [status?.connected, status?.linked]);

  useEffect(() => {
    if (
      status?.connected &&
      status?.linked &&
      status?.gatewayReachable !== false &&
      !status?.needsRelink &&
      (!status?.omSetupComplete || !status?.welcomeSentAt) &&
      !bootstrapMutation.isPending
    ) {
      bootstrapMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-setup once when linked
  }, [
    status?.connected,
    status?.linked,
    status?.gatewayReachable,
    status?.needsRelink,
    status?.omSetupComplete,
    status?.welcomeSentAt,
  ]);

  /** Link session + auto-read project APIs when WhatsApp connects. */
  useEffect(() => {
    if (!status?.connected || !status?.linked || status?.needsRelink) return;
    linkWhatsAppAuth(status.linkedPhoneE164)
      .then(() => syncWhatsAppProject({ phone: status.linkedPhoneE164, notify: false }))
      .catch(() => {
        /* device session or env auto-login may still work server-side */
      });
  }, [status?.connected, status?.linked, status?.needsRelink, status?.linkedPhoneE164]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 px-4 py-8 sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
              <FaWhatsapp className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                {t('whatsapp.pageTitle')}
              </h1>
              <p className="mt-1 text-base text-green-100/90 font-medium">
                {t('whatsapp.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-2 py-8 sm:px-4 space-y-8">
        {/* OM inbound switch — top of page */}
        {!configLoading && config && (
          <WhatsAppInboundOmBanner
            enabled={config.inboundOmEnabled !== false}
            onToggle={handleInboundOmToggle}
            saving={saveConfigMutation.isPending}
          />
        )}

        {/* Loading state */}
        {statusLoading && !status && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4" />
              <p className="text-slate-500 font-medium">{t('whatsapp.loading')}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!statusLoading && !status && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
            <FaExclamationTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-amber-800">{t('whatsapp.loadError')}</p>
            <button
              type="button"
              onClick={() => refetchStatus()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Channel card */}
        {status && (
          <WhatsAppChannelCard
            status={status}
            loginState={loginState}
            onStartLogin={handleStartLogin}
            onWaitLogin={handleWaitLogin}
            onLogout={handleLogout}
            onRefresh={handleRefresh}
          />
        )}

        {status && (
          <WhatsAppOmChatGuide
            status={status}
            gatewayReachable={status.gatewayReachable ?? undefined}
            onRetrySetup={() => bootstrapMutation.mutate()}
            setupBusy={bootstrapMutation.isPending}
            onSendMessage={(text) => sendMessageMutation.mutate(text)}
            sendBusy={sendMessageMutation.isPending}
          />
        )}

        {/* Config form */}
        {configLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
            {t('whatsapp.loadingConfig')}
          </div>
        ) : (
          <WhatsAppConfigForm
            initial={config}
            onSave={handleSaveConfig}
            saving={saveConfigMutation.isPending}
          />
        )}

        {/* Message log */}
        <WhatsAppMessageLog entries={messages || []} loading={messagesLoading} />
      </div>
    </div>
  );
}
