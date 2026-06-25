import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient, } from '@tanstack/react-query';
import { WhatsAppAiProvider, useWhatsAppAiConfig } from './context';
import { createWaClient, waBootstrap, waGetStatus, waLinkAuth, waLogout, waMessages, waStartLogin, waSyncProject, waWaitLogin, } from './api';
function createWaQueryClient() {
    return new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
    });
}
function label(entry) {
    if (entry.from === 'om' || entry.from === 'system')
        return 'OM';
    if (entry.direction === 'inbound')
        return 'You';
    return 'OM';
}
function WhatsAppAiInner({ className = '', showHeader = true, showMessageLog = true, autoConnect = true, onConnected, onError, onMessage, }) {
    const config = useWhatsAppAiConfig();
    const client = useMemo(() => createWaClient(config), [config]);
    const queryClient = useQueryClient();
    const [login, setLogin] = useState({
        busy: false,
        message: null,
        qrDataUrl: null,
        connected: null,
    });
    const { data: status, isLoading, refetch } = useQuery({
        queryKey: ['whatsapp-ai', 'status', config.apiUrl],
        queryFn: () => waGetStatus(client),
        refetchInterval: 10000,
    });
    const { data: messages, isLoading: messagesLoading } = useQuery({
        queryKey: ['whatsapp-ai', 'messages', config.apiUrl],
        queryFn: () => waMessages(client),
        refetchInterval: 8000,
        enabled: showMessageLog,
    });
    const startQr = useMutation({
        mutationFn: (force) => waStartLogin(client, force),
        onMutate: () => setLogin((p) => ({ ...p, busy: true, connected: null })),
        onSuccess: (data) => {
            setLogin({
                busy: false,
                message: data.message || null,
                qrDataUrl: data.qrDataUrl ?? null,
                connected: null,
            });
        },
        onError: (e) => {
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
        onError: (e) => {
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
    const linkAndSync = useCallback(async (phone) => {
        if (!phone)
            return;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('waLinkedPhone', phone);
            }
            await waLinkAuth(client, phone);
            await waSyncProject(client, phone);
        }
        catch {
            /* optional */
        }
    }, [client]);
    useEffect(() => {
        if (!status?.connected || !status?.linked)
            return;
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
        if (!messages?.length || !onMessage)
            return;
        const latest = messages[0];
        if (latest?.direction === 'inbound')
            onMessage(latest);
    }, [messages, onMessage]);
    const connected = Boolean(status?.connected && status?.linked);
    return (_jsxs("div", { className: `wa-ai-root rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`, children: [showHeader && (_jsxs("div", { className: "border-b border-slate-100 bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 text-white", children: [_jsx("h2", { className: "text-lg font-bold", children: "WhatsApp AI" }), _jsx("p", { className: "text-sm text-green-100", children: "Scan QR \u2192 Message yourself \u2192 OM replies" })] })), _jsxs("div", { className: "space-y-4 p-5", children: [isLoading && !status && (_jsx("p", { className: "text-sm text-slate-500", children: "Connecting to WhatsApp service\u2026" })), status && (_jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [_jsx(Badge, { ok: connected, label: connected ? 'Connected' : 'Not connected' }), status.linkedPhoneE164 && (_jsx("span", { className: "rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700", children: status.linkedPhoneE164 })), status.selfChatMode !== false && (_jsx("span", { className: "rounded-full bg-green-50 px-3 py-1 text-green-700", children: "Self-chat only" }))] })), status?.lastError && (_jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800", children: status.lastError })), login.message && (_jsx("p", { className: "text-sm text-slate-600", children: login.message })), login.qrDataUrl && (_jsx("div", { className: "flex justify-center rounded-xl border border-slate-100 bg-white p-4", children: _jsx("img", { src: login.qrDataUrl, alt: "WhatsApp QR", className: "h-56 w-56 object-contain" }) })), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Btn, { disabled: login.busy, onClick: () => startQr.mutate(true), children: login.busy ? 'Working…' : 'Show QR' }), _jsx(Btn, { disabled: login.busy || !login.qrDataUrl, onClick: () => waitQr.mutate(), children: "Wait for scan" }), _jsx(Btn, { variant: "ghost", disabled: login.busy, onClick: () => refetch(), children: "Refresh" }), _jsx(Btn, { variant: "danger", disabled: login.busy, onClick: () => logout.mutate(), children: "Logout" })] }), showMessageLog && (_jsxs("div", { className: "rounded-xl border border-slate-100", children: [_jsx("div", { className: "border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800", children: "Messages (you + OM)" }), _jsxs("div", { className: "max-h-64 overflow-y-auto", children: [messagesLoading && _jsx("p", { className: "p-4 text-sm text-slate-400", children: "Loading\u2026" }), !messagesLoading && (!messages || messages.length === 0) && (_jsx("p", { className: "p-4 text-sm text-slate-400", children: "No messages yet. Chat in Message yourself on your phone." })), _jsx("ul", { className: "divide-y divide-slate-50", children: (messages || []).map((m) => (_jsxs("li", { className: "px-4 py-3 text-sm", children: [_jsxs("div", { className: "flex justify-between gap-2", children: [_jsx("span", { className: "font-medium text-slate-800", children: label(m) }), _jsx("span", { className: "text-xs text-slate-400", children: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }), m.text && _jsx("p", { className: "mt-1 text-slate-600", children: m.text })] }, m.id))) })] })] }))] })] }));
}
function Badge({ ok, label }) {
    return (_jsx("span", { className: `rounded-full px-3 py-1 font-medium ${ok ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`, children: label }));
}
function Btn({ children, onClick, disabled, variant = 'primary', }) {
    const cls = variant === 'primary'
        ? 'bg-[#25D366] text-white hover:bg-green-600'
        : variant === 'danger'
            ? 'border border-red-200 text-red-600 hover:bg-red-50'
            : 'border border-slate-200 text-slate-700 hover:bg-slate-50';
    return (_jsx("button", { type: "button", disabled: disabled, onClick: onClick, className: `rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${cls}`, children: children }));
}
/**
 * Drop-in WhatsApp + OM AI UI for any React app.
 *
 * @example
 * import { WhatsAppAi } from 'whatsapp-plugin/react';
 * <WhatsAppAi apiUrl="http://127.0.0.1:9093" />
 */
export function WhatsAppAi({ apiUrl, authToken, userId, wrapProvider = false, ...uiProps }) {
    const base = apiUrl ||
        (typeof process !== 'undefined' && process.env?.REACT_APP_WHATSAPP_API_URL) ||
        (typeof process !== 'undefined' && process.env?.REACT_APP_OPENCLAW_DEV_URL) ||
        'http://127.0.0.1:9093';
    const [standaloneClient] = useState(() => (wrapProvider ? createWaQueryClient() : null));
    const inner = (_jsx(WhatsAppAiProvider, { apiUrl: base, authToken: authToken, userId: userId, children: _jsx(WhatsAppAiInner, { ...uiProps }) }));
    if (wrapProvider && standaloneClient) {
        return _jsx(QueryClientProvider, { client: standaloneClient, children: inner });
    }
    return inner;
}
export default WhatsAppAi;
