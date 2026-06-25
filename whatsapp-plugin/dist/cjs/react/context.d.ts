import React from 'react';
export type WhatsAppAiConfig = {
    apiUrl: string;
    authToken?: string | null;
    userId?: string | null;
};
export declare function WhatsAppAiProvider({ apiUrl, authToken, userId, children, }: WhatsAppAiConfig & {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useWhatsAppAiConfig(): WhatsAppAiConfig;
//# sourceMappingURL=context.d.ts.map