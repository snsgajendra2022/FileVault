import type { WhatsAppPluginConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Handles WhatsApp connection status and health monitoring
 */
export class StatusService {
  private config: WhatsAppPluginConfig;
  private lastError: string | null = null;
  private statusCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: WhatsAppPluginConfig, private eventEmitter: any) {
    this.config = config;
    logger.info('StatusService initialized');
  }

  async initialize(): Promise<void> {
    logger.info('StatusService initialized');
  }

  getLastError(): string | null {
    return this.lastError;
  }

  setError(error: string | null): void {
    this.lastError = error;
    if (error) {
      logger.error('Status error:', error);
      this.eventEmitter.emit('error', new Error(error));
    } else {
      logger.info('Status error cleared');
    }

    this.eventEmitter.emit('status-update', this.getStatus());
  }

  getStatus(): any {
    return {
      lastError: this.lastError,
      timestamp: new Date(),
    };
  }

  startStatusChecks(): void {
    if (this.statusCheckInterval) return;

    const interval = (this.config as any).statusCheckInterval ?? 30000;
    this.statusCheckInterval = setInterval(() => {
      this.performStatusCheck();
    }, interval);

    logger.debug('Status checks started');
  }

  stopStatusChecks(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
      logger.debug('Status checks stopped');
    }
  }

  private async performStatusCheck(): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (this.lastError) {
        this.setError(null);
      }
    } catch (error: any) {
      this.setError(`Status check failed: ${error.message}`);
    }
  }

  cleanup(): void {
    this.stopStatusChecks();
  }
}
