import type { WhatsAppPluginConfig, WhatsAppStatus, MessageResponse, WhatsAppEvent } from '../types';
import { EventEmitter } from './EventEmitter';
/**
 * Main WhatsApp Plugin Client
 *
 * Encapsulates all WhatsApp functionality into a single importable module.
 *
 * Gateway adapter selection (priority order):
 * 1. User-provided adapter via config.gatewayAdapter
 * 2. OpenClaw Node.js gateway client (auto-detected in Node.js)
 * 3. HTTP relay adapter (when WHATSAPP_PLUGIN_API_ENDPOINT is set)
 * 4. Mock adapter (safe fallback — all calls return errors, no crashes)
 */
export declare class WhatsAppPlugin extends EventEmitter {
    private config;
    private gateway;
    private authService;
    private connectionManager;
    private messageService;
    private fileService;
    private statusService;
    private initialized;
    constructor(config?: WhatsAppPluginConfig);
    /**
     * Initialize the plugin (called automatically on first connect)
     */
    private initialize;
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    startQRLogin(force?: boolean): Promise<{
        qrCode: string;
        message: string;
    }>;
    waitForQRScan(): Promise<boolean>;
    logout(): Promise<void>;
    sendMessage(to: string, text: string): Promise<MessageResponse>;
    sendFile(to: string, file: File | Buffer, caption?: string): Promise<MessageResponse>;
    sendMediaFromPath(to: string, mediaPath: string, caption?: string): Promise<MessageResponse>;
    getStatus(): WhatsAppStatus;
    getGatewayDiagnostics(): import("./IGatewayAdapter").GatewayDiagnostics;
    isGatewayAvailable(): boolean;
    saveSession(): Promise<void>;
    loadSession(): Promise<boolean>;
    static createInstance(tenantId: string, config?: WhatsAppPluginConfig): WhatsAppPlugin;
}
export type { WhatsAppPluginConfig, WhatsAppStatus, MessageResponse, WhatsAppEvent };
export default WhatsAppPlugin;
//# sourceMappingURL=WhatsAppClient.d.ts.map