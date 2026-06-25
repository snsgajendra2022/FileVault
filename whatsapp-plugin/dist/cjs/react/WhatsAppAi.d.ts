import React from 'react';
import { type WaLogEntry, type WaStatus } from './api';
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
    /**
     * Wrap in an internal QueryClientProvider. Default false — use your app's
     * existing QueryClientProvider (recommended). Set true only if the host app
     * has no react-query provider.
     */
    wrapProvider?: boolean;
};
/**
 * Drop-in WhatsApp + OM AI UI for any React app.
 *
 * @example
 * import { WhatsAppAi } from 'whatsapp-plugin/react';
 * <WhatsAppAi apiUrl="http://127.0.0.1:9093" />
 */
export declare function WhatsAppAi({ apiUrl, authToken, userId, wrapProvider, ...uiProps }: WhatsAppAiProps): React.JSX.Element;
export default WhatsAppAi;
//# sourceMappingURL=WhatsAppAi.d.ts.map