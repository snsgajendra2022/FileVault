import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
const Ctx = createContext(null);
export function WhatsAppAiProvider({ apiUrl, authToken, userId, children, }) {
    const value = useMemo(() => ({
        apiUrl: apiUrl.replace(/\/$/, ''),
        authToken: authToken ?? null,
        userId: userId ?? null,
    }), [apiUrl, authToken, userId]);
    return _jsx(Ctx.Provider, { value: value, children: children });
}
export function useWhatsAppAiConfig() {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error('WhatsAppAi must be used inside WhatsAppAiProvider');
    }
    return ctx;
}
