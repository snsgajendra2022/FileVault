/**
 * OpenClaw Gateway Adapter (Node.js)
 *
 * Wraps the Node.js CommonJS gateway client for use in the TypeScript plugin.
 * This adapter calls the OpenClaw gateway WebSocket API via the
 * server/openclaw-gateway-client.js module.
 *
 * NOTE: This adapter only works in Node.js. For browser environments,
 * use HttpGatewayAdapter instead.
 */
import type { IGatewayAdapter, GatewayStatus, GatewayLoginResult, GatewayDiagnostics, GatewaySendResult, GatewayQrWaitResult } from './IGatewayAdapter';
export declare class OpenClawGatewayAdapter implements IGatewayAdapter {
    private client;
    private available;
    constructor();
    isAvailable(): boolean;
    isGatewayConfigured(): Promise<boolean>;
    isGatewayReachable(): Promise<boolean>;
    getGatewayStatus(): Promise<GatewayStatus | null>;
    ensureGatewayOperatorScopes(): Promise<unknown>;
    ensureWhatsAppChannelRunning(accountId?: string): Promise<GatewayStatus | null>;
    logoutWhatsApp(accountId?: string): Promise<unknown>;
    getDiagnostics(): GatewayDiagnostics;
    startQrLogin(force?: boolean): Promise<{
        result: GatewayLoginResult;
        error?: string;
    }>;
    waitForQrScan(timeoutMs?: number): Promise<GatewayQrWaitResult>;
    sendText(to: string, text: string, accountId?: string): Promise<GatewaySendResult>;
    sendMedia(to: string, mediaPath: string, caption?: string, accountId?: string): Promise<GatewaySendResult>;
    hasWhatsAppSessionCreds(): Promise<boolean>;
    readPhoneFromWhatsAppCreds(): Promise<string | null>;
    readWhatsAppSelfJid(): Promise<string | null>;
}
//# sourceMappingURL=OpenClawGatewayAdapter.d.ts.map