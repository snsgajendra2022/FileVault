import type { WhatsAppPluginConfig } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
import { logger } from '../utils/logger';

/**
 * Manages WhatsApp connection state, heartbeat, and reconnection logic.
 * When a gateway adapter is available, it syncs state from the gateway.
 * Falls back to simulated connection for browser-only environments.
 */
export class ConnectionManager {
  private config: WhatsAppPluginConfig;
  private isConnectedFlag: boolean = false;
  private reconnectAttempts: number = 0;
  private lastConnectedAt: Date | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly maxReconnectAttempts: number;
  private gateway: IGatewayAdapter;

  constructor(config: WhatsAppPluginConfig, private eventEmitter: any, gateway: IGatewayAdapter) {
    this.config = config;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? Infinity;
    this.gateway = gateway;
    logger.info('ConnectionManager initialized');
  }

  async initialize(): Promise<void> {
    logger.info('ConnectionManager initialized');
  }

  /**
   * Connect to WhatsApp service.
   * If gateway is available, checks real gateway status.
   * Otherwise falls back to simulated connection.
   */
  async connect(): Promise<boolean> {
    if (this.isConnectedFlag) return true;

    logger.info('Attempting to connect to WhatsApp service');

    try {
      if (this.gateway.isAvailable()) {
        return await this.connectViaGateway();
      }

      // Fallback: simulated connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.isConnectedFlag = true;
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      logger.info('Connected to WhatsApp service (simulated)');
      return true;
    } catch (error) {
      logger.error('Connection attempt failed:', error);
      await this.handleConnectionError(error as Error);
      return false;
    }
  }

  /**
   * Connect using the real gateway adapter
   */
  private async connectViaGateway(): Promise<boolean> {
    const reachable = await this.gateway.isGatewayReachable();
    if (!reachable) {
      throw new Error('Gateway not reachable');
    }

    const status = await this.gateway.getGatewayStatus();
    if (!status) {
      throw new Error('Could not read gateway status');
    }

    this.isConnectedFlag = status.connected;
    this.reconnectAttempts = 0;

    if (status.connected) {
      this.lastConnectedAt = status.lastConnectedAtMs
        ? new Date(status.lastConnectedAtMs)
        : new Date();
      this.startHeartbeat();
      logger.info('Connected via gateway (phone: ' + status.phone + ')');
    } else {
      logger.info('Gateway reachable but WhatsApp not connected (status: ' + status.statusState + ')');
    }

    return this.isConnectedFlag;
  }

  /**
   * Sync connection state from the gateway (for heartbeat/status checks)
   */
  async syncFromGateway(): Promise<boolean> {
    if (!this.gateway.isAvailable()) return this.isConnectedFlag;

    try {
      const reachable = await this.gateway.isGatewayReachable();
      if (!reachable) {
        this.isConnectedFlag = false;
        return false;
      }

      const status = await this.gateway.getGatewayStatus();
      if (!status) return this.isConnectedFlag;

      const wasConnected = this.isConnectedFlag;
      this.isConnectedFlag = status.connected;

      if (status.connected && !wasConnected) {
        this.lastConnectedAt = status.lastConnectedAtMs
          ? new Date(status.lastConnectedAtMs)
          : new Date();
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      }

      if (!status.connected && wasConnected) {
        this.stopHeartbeat();
        this.handleConnectionError(new Error('WhatsApp disconnected'));
      }

      return this.isConnectedFlag;
    } catch {
      return this.isConnectedFlag;
    }
  }

  async disconnect(): Promise<void> {
    logger.info('Disconnecting from WhatsApp service');
    this.stopHeartbeat();
    this.stopReconnectTimer();

    if (this.isConnectedFlag) {
      this.isConnectedFlag = false;
      logger.info('Disconnected from WhatsApp service');
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  getLastConnectedAt(): Date | null {
    return this.lastConnectedAt;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // ── Reconnection ────────────────────────────────────────────

  private async handleConnectionError(error: Error): Promise<void> {
    this.isConnectedFlag = false;
    this.stopHeartbeat();

    if (this.config.autoReconnect !== false && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.calculateReconnectDelay();

      logger.info(`Connection failed. Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

      this.reconnectTimeout = setTimeout(async () => {
        logger.info(`Attempting reconnect #${this.reconnectAttempts}`);
        const success = await this.connect();

        if (success) {
          this.eventEmitter.emit('reconnected', this.reconnectAttempts);
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleConnectionError(new Error('Reconnect failed'));
        }
      }, delay);
    } else {
      logger.error('Max reconnect attempts reached or auto-reconnect disabled');
      this.eventEmitter.emit('error', error);
    }
  }

  private calculateReconnectDelay(): number {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 10));
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 60000);
  }

  // ── Heartbeat ───────────────────────────────────────────────

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    const interval = 30000;
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.gateway.isAvailable()) {
          await this.syncFromGateway();
        }
      } catch (error) {
        logger.warn('Heartbeat failed:', error);
        this.isConnectedFlag = false;
        this.stopHeartbeat();
        this.handleConnectionError(new Error('Heartbeat failed'));
      }
    }, interval);

    logger.debug('Heartbeat started');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.debug('Heartbeat stopped');
    }
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  cleanup(): void {
    this.stopHeartbeat();
    this.stopReconnectTimer();
  }
}
