"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const logger_1 = require("../utils/logger");
/**
 * Manages WhatsApp connection state, heartbeat, and reconnection logic.
 * When a gateway adapter is available, it syncs state from the gateway.
 * Falls back to simulated connection for browser-only environments.
 */
class ConnectionManager {
    constructor(config, eventEmitter, gateway) {
        this.eventEmitter = eventEmitter;
        this.isConnectedFlag = false;
        this.reconnectAttempts = 0;
        this.lastConnectedAt = null;
        this.heartbeatInterval = null;
        this.reconnectTimeout = null;
        this.config = config;
        this.maxReconnectAttempts = config.maxReconnectAttempts ?? Infinity;
        this.gateway = gateway;
        logger_1.logger.info('ConnectionManager initialized');
    }
    async initialize() {
        logger_1.logger.info('ConnectionManager initialized');
    }
    /**
     * Connect to WhatsApp service.
     * If gateway is available, checks real gateway status.
     * Otherwise falls back to simulated connection.
     */
    async connect() {
        if (this.isConnectedFlag)
            return true;
        logger_1.logger.info('Attempting to connect to WhatsApp service');
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
            logger_1.logger.info('Connected to WhatsApp service (simulated)');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Connection attempt failed:', error);
            await this.handleConnectionError(error);
            return false;
        }
    }
    /**
     * Connect using the real gateway adapter
     */
    async connectViaGateway() {
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
            logger_1.logger.info('Connected via gateway (phone: ' + status.phone + ')');
        }
        else {
            logger_1.logger.info('Gateway reachable but WhatsApp not connected (status: ' + status.statusState + ')');
        }
        return this.isConnectedFlag;
    }
    /**
     * Sync connection state from the gateway (for heartbeat/status checks)
     */
    async syncFromGateway() {
        if (!this.gateway.isAvailable())
            return this.isConnectedFlag;
        try {
            const reachable = await this.gateway.isGatewayReachable();
            if (!reachable) {
                this.isConnectedFlag = false;
                return false;
            }
            const status = await this.gateway.getGatewayStatus();
            if (!status)
                return this.isConnectedFlag;
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
        }
        catch {
            return this.isConnectedFlag;
        }
    }
    async disconnect() {
        logger_1.logger.info('Disconnecting from WhatsApp service');
        this.stopHeartbeat();
        this.stopReconnectTimer();
        if (this.isConnectedFlag) {
            this.isConnectedFlag = false;
            logger_1.logger.info('Disconnected from WhatsApp service');
        }
    }
    isConnected() {
        return this.isConnectedFlag;
    }
    getLastConnectedAt() {
        return this.lastConnectedAt;
    }
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
    // ── Reconnection ────────────────────────────────────────────
    async handleConnectionError(error) {
        this.isConnectedFlag = false;
        this.stopHeartbeat();
        if (this.config.autoReconnect !== false && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.calculateReconnectDelay();
            logger_1.logger.info(`Connection failed. Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
            this.reconnectTimeout = setTimeout(async () => {
                logger_1.logger.info(`Attempting reconnect #${this.reconnectAttempts}`);
                const success = await this.connect();
                if (success) {
                    this.eventEmitter.emit('reconnected', this.reconnectAttempts);
                }
                else if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.handleConnectionError(new Error('Reconnect failed'));
                }
            }, delay);
        }
        else {
            logger_1.logger.error('Max reconnect attempts reached or auto-reconnect disabled');
            this.eventEmitter.emit('error', error);
        }
    }
    calculateReconnectDelay() {
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 10));
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, 60000);
    }
    // ── Heartbeat ───────────────────────────────────────────────
    startHeartbeat() {
        if (this.heartbeatInterval)
            return;
        const interval = 30000;
        this.heartbeatInterval = setInterval(async () => {
            try {
                if (this.gateway.isAvailable()) {
                    await this.syncFromGateway();
                }
            }
            catch (error) {
                logger_1.logger.warn('Heartbeat failed:', error);
                this.isConnectedFlag = false;
                this.stopHeartbeat();
                this.handleConnectionError(new Error('Heartbeat failed'));
            }
        }, interval);
        logger_1.logger.debug('Heartbeat started');
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            logger_1.logger.debug('Heartbeat stopped');
        }
    }
    stopReconnectTimer() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
    cleanup() {
        this.stopHeartbeat();
        this.stopReconnectTimer();
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=ConnectionManager.js.map