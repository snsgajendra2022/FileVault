import type { WhatsAppPluginConfig } from '../types';
/**
 * Handles WhatsApp connection status and health monitoring
 */
export declare class StatusService {
    private eventEmitter;
    private config;
    private lastError;
    private statusCheckInterval;
    constructor(config: WhatsAppPluginConfig, eventEmitter: any);
    initialize(): Promise<void>;
    getLastError(): string | null;
    setError(error: string | null): void;
    getStatus(): any;
    startStatusChecks(): void;
    stopStatusChecks(): void;
    private performStatusCheck;
    cleanup(): void;
}
//# sourceMappingURL=StatusService.d.ts.map