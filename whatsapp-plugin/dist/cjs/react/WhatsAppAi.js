"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAi = WhatsAppAi;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const context_1 = require("./context");
const api_1 = require("./api");
function createWaQueryClient() {
    return new react_query_1.QueryClient({
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
    const config = (0, context_1.useWhatsAppAiConfig)();
    const client = (0, react_1.useMemo)(() => (0, api_1.createWaClient)(config), [config]);
    const queryClient = (0, react_query_1.useQueryClient)();
    const [login, setLogin] = (0, react_1.useState)({
        busy: false,
        message: null,
        qrDataUrl: null,
        connected: null,
    });
    const { data: status, isLoading, refetch } = (0, react_query_1.useQuery)({
        queryKey: ['whatsapp-ai', 'status', config.apiUrl],
        queryFn: () => (0, api_1.waGetStatus)(client),
        refetchInterval: 10000,
    });
    const { data: messages, isLoading: messagesLoading } = (0, react_query_1.useQuery)({
        queryKey: ['whatsapp-ai', 'messages', config.apiUrl],
        queryFn: () => (0, api_1.waMessages)(client),
        refetchInterval: 8000,
        enabled: showMessageLog,
    });
    const startQr = (0, react_query_1.useMutation)({
        mutationFn: (force) => (0, api_1.waStartLogin)(client, force),
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
    const waitQr = (0, react_query_1.useMutation)({
        mutationFn: () => (0, api_1.waWaitLogin)(client),
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
    const logout = (0, react_query_1.useMutation)({
        mutationFn: () => (0, api_1.waLogout)(client),
        onSuccess: () => {
            setLogin({ busy: false, message: 'Logged out', qrDataUrl: null, connected: null });
            queryClient.invalidateQueries({ queryKey: ['whatsapp-ai'] });
        },
    });
    const bootstrap = (0, react_query_1.useMutation)({
        mutationFn: () => (0, api_1.waBootstrap)(client),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-ai'] }),
    });
    const linkAndSync = (0, react_1.useCallback)(async (phone) => {
        if (!phone)
            return;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('waLinkedPhone', phone);
            }
            await (0, api_1.waLinkAuth)(client, phone);
            await (0, api_1.waSyncProject)(client, phone);
        }
        catch {
            /* optional */
        }
    }, [client]);
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if (!messages?.length || !onMessage)
            return;
        const latest = messages[0];
        if (latest?.direction === 'inbound')
            onMessage(latest);
    }, [messages, onMessage]);
    const connected = Boolean(status?.connected && status?.linked);
    return ((0, jsx_runtime_1.jsxs)("div", { className: `wa-ai-root rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`, children: [showHeader && ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-slate-100 bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 text-white", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-bold", children: "WhatsApp AI" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-green-100", children: "Scan QR \u2192 Message yourself \u2192 OM replies" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 p-5", children: [isLoading && !status && ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-slate-500", children: "Connecting to WhatsApp service\u2026" })), status && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2 text-xs", children: [(0, jsx_runtime_1.jsx)(Badge, { ok: connected, label: connected ? 'Connected' : 'Not connected' }), status.linkedPhoneE164 && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700", children: status.linkedPhoneE164 })), status.selfChatMode !== false && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-green-50 px-3 py-1 text-green-700", children: "Self-chat only" }))] })), status?.lastError && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800", children: status.lastError })), login.message && ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-slate-600", children: login.message })), login.qrDataUrl && ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center rounded-xl border border-slate-100 bg-white p-4", children: (0, jsx_runtime_1.jsx)("img", { src: login.qrDataUrl, alt: "WhatsApp QR", className: "h-56 w-56 object-contain" }) })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [(0, jsx_runtime_1.jsx)(Btn, { disabled: login.busy, onClick: () => startQr.mutate(true), children: login.busy ? 'Working…' : 'Show QR' }), (0, jsx_runtime_1.jsx)(Btn, { disabled: login.busy || !login.qrDataUrl, onClick: () => waitQr.mutate(), children: "Wait for scan" }), (0, jsx_runtime_1.jsx)(Btn, { variant: "ghost", disabled: login.busy, onClick: () => refetch(), children: "Refresh" }), (0, jsx_runtime_1.jsx)(Btn, { variant: "danger", disabled: login.busy, onClick: () => logout.mutate(), children: "Logout" })] }), showMessageLog && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-slate-100", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800", children: "Messages (you + OM)" }), (0, jsx_runtime_1.jsxs)("div", { className: "max-h-64 overflow-y-auto", children: [messagesLoading && (0, jsx_runtime_1.jsx)("p", { className: "p-4 text-sm text-slate-400", children: "Loading\u2026" }), !messagesLoading && (!messages || messages.length === 0) && ((0, jsx_runtime_1.jsx)("p", { className: "p-4 text-sm text-slate-400", children: "No messages yet. Chat in Message yourself on your phone." })), (0, jsx_runtime_1.jsx)("ul", { className: "divide-y divide-slate-50", children: (messages || []).map((m) => ((0, jsx_runtime_1.jsxs)("li", { className: "px-4 py-3 text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-slate-800", children: label(m) }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-slate-400", children: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }), m.text && (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-slate-600", children: m.text })] }, m.id))) })] })] }))] })] }));
}
function Badge({ ok, label }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: `rounded-full px-3 py-1 font-medium ${ok ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`, children: label }));
}
function Btn({ children, onClick, disabled, variant = 'primary', }) {
    const cls = variant === 'primary'
        ? 'bg-[#25D366] text-white hover:bg-green-600'
        : variant === 'danger'
            ? 'border border-red-200 text-red-600 hover:bg-red-50'
            : 'border border-slate-200 text-slate-700 hover:bg-slate-50';
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: disabled, onClick: onClick, className: `rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${cls}`, children: children }));
}
/**
 * Drop-in WhatsApp + OM AI UI for any React app.
 *
 * @example
 * import { WhatsAppAi } from 'whatsapp-plugin/react';
 * <WhatsAppAi apiUrl="http://127.0.0.1:9093" />
 */
function WhatsAppAi({ apiUrl, authToken, userId, wrapProvider = false, ...uiProps }) {
    const base = apiUrl ||
        (typeof process !== 'undefined' && process.env?.REACT_APP_WHATSAPP_API_URL) ||
        (typeof process !== 'undefined' && process.env?.REACT_APP_OPENCLAW_DEV_URL) ||
        'http://127.0.0.1:9093';
    const [standaloneClient] = (0, react_1.useState)(() => (wrapProvider ? createWaQueryClient() : null));
    const inner = ((0, jsx_runtime_1.jsx)(context_1.WhatsAppAiProvider, { apiUrl: base, authToken: authToken, userId: userId, children: (0, jsx_runtime_1.jsx)(WhatsAppAiInner, { ...uiProps }) }));
    if (wrapProvider && standaloneClient) {
        return (0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, { client: standaloneClient, children: inner });
    }
    return inner;
}
exports.default = WhatsAppAi;
//# sourceMappingURL=WhatsAppAi.js.map