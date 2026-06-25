import type { WhatsAppPluginConfig } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
/**
 * Handles WhatsApp authentication including QR login and session management.
 * Uses the gateway adapter for real QR login when available,
 * falls back to mock mode for browser-only environments.
 */
export declare class AuthService {
    private eventEmitter;
    private config;
    private isAuthenticatedFlag;
    private phoneNumber;
    private gateway;
    constructor(config: WhatsAppPluginConfig, eventEmitter: any, gateway: IGatewayAdapter);
    initialize(): Promise<void>;
    /**
     * Start QR login process via gateway adapter
     */
    startQRLogin(force?: boolean): Promise<{
        qrCode: string;
        message: string;
    }>;
    /**
     * Wait for QR code to be scanned via gateway adapter
     */
    waitForQRScan(): Promise<boolean>;
    /**
     * Logout from WhatsApp
     */
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getPhoneNumber(): string | null;
    /**
     * Get the gateway adapter (for use by other services)
     */
    getGateway(): IGatewayAdapter;
    saveSession(): Promise<void>;
    loadSession(): Promise<boolean>;
    clearSession(): Promise<void>;
    private getMockQRCode;
}
//# sourceMappingURL=AuthService.d.ts.map