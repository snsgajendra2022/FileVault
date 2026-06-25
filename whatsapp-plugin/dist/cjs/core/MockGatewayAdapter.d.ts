/**
 * Mock Gateway Adapter
 *
 * Fallback adapter used when neither the OpenClaw Node.js gateway client
 * nor the HTTP relay endpoint are available.
 *
 * All methods return safe defaults. This allows the plugin to be imported
 * and instantiated in any environment without crashing.
 */
import type { IGatewayAdapter, GatewayStatus, GatewayLoginResult, GatewayDiagnostics, GatewaySendResult, GatewayQrWaitResult } from './IGatewayAdapter';
export declare class MockGatewayAdapter implements IGatewayAdapter {
    isAvailable(): boolean;
    isGatewayConfigured(): Promise<boolean>;
    isGatewayReachable(): Promise<boolean>;
    getGatewayStatus(): Promise<GatewayStatus | null>;
    ensureWhatsAppChannelRunning(_accountId?: string): Promise<GatewayStatus | null>;
    logoutWhatsApp(_accountId?: string): Promise<unknown>;
    getDiagnostics(): GatewayDiagnostics;
    startQrLogin(_force?: boolean): Promise<{
        result: GatewayLoginResult;
        error?: string;
    }>;
    waitForQrScan(_timeoutMs?: number): Promise<GatewayQrWaitResult>;
    sendText(_to: string, _text: string, _accountId?: string): Promise<GatewaySendResult>;
    sendMedia(_to: string, _mediaPath: string, _caption?: string, _accountId?: string): Promise<GatewaySendResult>;
    hasWhatsAppSessionCreds(): Promise<boolean>;
    readPhoneFromWhatsAppCreds(): Promise<string | null>;
    readWhatsAppSelfJid(): Promise<string | null>;
}
//# sourceMappingURL=MockGatewayAdapter.d.ts.map