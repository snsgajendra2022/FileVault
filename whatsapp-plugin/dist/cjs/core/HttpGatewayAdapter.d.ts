/**
 * HTTP Gateway Adapter
 *
 * Browser-safe adapter that talks to the OpenClaw relay endpoint
 * (the `om-whatsapp-relay` plugin on the server side).
 *
 * Environment variables / config used:
 *   WHATSAPP_PLUGIN_API_ENDPOINT  – base URL of the relay (e.g. http://127.0.0.1:9093)
 *   WHATSAPP_PLUGIN_API_KEY       – optional API key / bearer token
 *
 * Endpoints expected on the relay server:
 *   GET  /api/whatsapp/gateway-status    → { status: GatewayStatus }
 *   POST /api/whatsapp/login-start       → { result: GatewayLoginResult }
 *   POST /api/whatsapp/login-wait        → { connected, message, phone }
 *   POST /api/whatsapp/logout           → { ok: true }
 *   POST /api/whatsapp/send-text        → { ok, error }
 *   POST /api/whatsapp/send-media       → { ok, error }
 *   GET  /api/whatsapp/gateway-diag     → { diagnostics }
 *   GET  /api/whatsapp/session-creds    → { has, phone, selfJid }
 */
import type { IGatewayAdapter, GatewayStatus, GatewayLoginResult, GatewayDiagnostics, GatewaySendResult, GatewayQrWaitResult } from './IGatewayAdapter';
export declare class HttpGatewayAdapter implements IGatewayAdapter {
    private baseUrl;
    private authHeader;
    constructor();
    isAvailable(): boolean;
    private request;
    isGatewayConfigured(): Promise<boolean>;
    isGatewayReachable(): Promise<boolean>;
    getGatewayStatus(): Promise<GatewayStatus | null>;
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
//# sourceMappingURL=HttpGatewayAdapter.d.ts.map