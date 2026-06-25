import type { WhatsAppPluginConfig } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
/**
 * Manages WhatsApp connection state, heartbeat, and reconnection logic.
 * When a gateway adapter is available, it syncs state from the gateway.
 * Falls back to simulated connection for browser-only environments.
 */
export declare class ConnectionManager {
    private eventEmitter;
    private config;
    private isConnectedFlag;
    private reconnectAttempts;
    private lastConnectedAt;
    private heartbeatInterval;
    private reconnectTimeout;
    private readonly maxReconnectAttempts;
    private gateway;
    constructor(config: WhatsAppPluginConfig, eventEmitter: any, gateway: IGatewayAdapter);
    initialize(): Promise<void>;
    /**
     * Connect to WhatsApp service.
     * If gateway is available, checks real gateway status.
     * Otherwise falls back to simulated connection.
     */
    connect(): Promise<boolean>;
    /**
     * Connect using the real gateway adapter
     */
    private connectViaGateway;
    /**
     * Sync connection state from the gateway (for heartbeat/status checks)
     */
    syncFromGateway(): Promise<boolean>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getLastConnectedAt(): Date | null;
    getReconnectAttempts(): number;
    private handleConnectionError;
    private calculateReconnectDelay;
    private startHeartbeat;
    private stopHeartbeat;
    private stopReconnectTimer;
    cleanup(): void;
}
//# sourceMappingURL=ConnectionManager.d.ts.map