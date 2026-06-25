"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAiProvider = WhatsAppAiProvider;
exports.useWhatsAppAiConfig = useWhatsAppAiConfig;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Ctx = (0, react_1.createContext)(null);
function WhatsAppAiProvider({ apiUrl, authToken, userId, children, }) {
    const value = (0, react_1.useMemo)(() => ({
        apiUrl: apiUrl.replace(/\/$/, ''),
        authToken: authToken ?? null,
        userId: userId ?? null,
    }), [apiUrl, authToken, userId]);
    return (0, jsx_runtime_1.jsx)(Ctx.Provider, { value: value, children: children });
}
function useWhatsAppAiConfig() {
    const ctx = (0, react_1.useContext)(Ctx);
    if (!ctx) {
        throw new Error('WhatsAppAi must be used inside WhatsAppAiProvider');
    }
    return ctx;
}
//# sourceMappingURL=context.js.map