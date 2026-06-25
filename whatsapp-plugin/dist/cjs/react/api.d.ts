import { type AxiosInstance } from 'axios';
import type { WhatsAppAiConfig } from './context';
export type WaStatus = {
    connected?: boolean;
    linked?: boolean;
    running?: boolean;
    linkedPhoneE164?: string | null;
    omSetupComplete?: boolean;
    needsRelink?: boolean;
    gatewayReachable?: boolean | null;
    lastError?: string | null;
    selfChatMode?: boolean;
};
export type WaLogEntry = {
    id: string;
    direction: 'inbound' | 'outbound';
    from?: string;
    to?: string;
    text?: string;
    timestamp: string;
};
export type WaLoginStart = {
    message?: string;
    qrDataUrl?: string | null;
    qrPayload?: string | null;
    source?: string;
};
export declare function createWaClient(config: WhatsAppAiConfig): AxiosInstance;
export declare function waGetStatus(c: AxiosInstance): Promise<WaStatus>;
export declare function waStartLogin(c: AxiosInstance, force?: boolean): Promise<WaLoginStart>;
export declare function waWaitLogin(c: AxiosInstance): Promise<{
    connected?: boolean;
    message?: string;
}>;
export declare function waLogout(c: AxiosInstance): Promise<void>;
export declare function waBootstrap(c: AxiosInstance): Promise<{
    ok?: boolean;
    message?: string;
}>;
export declare function waMessages(c: AxiosInstance, limit?: number): Promise<WaLogEntry[]>;
export declare function waLinkAuth(c: AxiosInstance, phone?: string | null): Promise<void>;
export declare function waSyncProject(c: AxiosInstance, phone?: string | null): Promise<void>;
//# sourceMappingURL=api.d.ts.map