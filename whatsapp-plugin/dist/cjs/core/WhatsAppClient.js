"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppPlugin = void 0;
const EventEmitter_1 = require("./EventEmitter");
const AuthService_1 = require("../services/AuthService");
const ConnectionManager_1 = require("../services/ConnectionManager");
const MessageService_1 = require("../services/MessageService");
const FileService_1 = require("../services/FileService");
const StatusService_1 = require("../services/StatusService");
const OpenClawGatewayAdapter_1 = require("./OpenClawGatewayAdapter");
const HttpGatewayAdapter_1 = require("./HttpGatewayAdapter");
const MockGatewayAdapter_1 = require("./MockGatewayAdapter");
const Config_1 = require("../config/Config");
const logger_1 = require("../utils/logger");
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
class WhatsAppPlugin extends EventEmitter_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.initialized = false;
        this.config = Config_1.Config.merge(config);
        // ── Gateway adapter selection ──────────────────────────────
        if (config.gatewayAdapter) {
            // User-provided adapter (highest priority)
            this.gateway = config.gatewayAdapter;
            logger_1.logger.info('WhatsAppPlugin: using user-provided gateway adapter');
        }
        else {
            // Try Node.js OpenClaw gateway client first
            const nodeAdapter = new OpenClawGatewayAdapter_1.OpenClawGatewayAdapter();
            if (nodeAdapter.isAvailable()) {
                this.gateway = nodeAdapter;
                logger_1.logger.info('WhatsAppPlugin: using OpenClawNode gateway adapter');
            }
            else {
                // Try HTTP relay if endpoint is configured
                const envEndpoint = typeof process !== 'undefined' && process.env
                    ? process.env.WHATSAPP_PLUGIN_API_ENDPOINT
                    : undefined;
                const httpEndpoint = config.apiEndpoint || envEndpoint;
                if (httpEndpoint) {
                    this.gateway = new HttpGatewayAdapter_1.HttpGatewayAdapter();
                    logger_1.logger.info('WhatsAppPlugin: using HTTP relay adapter (endpoint: ' + httpEndpoint + ')');
                }
                else {
                    this.gateway = new MockGatewayAdapter_1.MockGatewayAdapter();
                    logger_1.logger.info('WhatsAppPlugin: using mock gateway adapter (no real gateway configured)');
                }
            }
        }
        // ── Services (share the single gateway adapter) ────────────
        this.authService = new AuthService_1.AuthService(this.config, this, this.gateway);
        this.connectionManager = new ConnectionManager_1.ConnectionManager(this.config, this, this.gateway);
        this.messageService = new MessageService_1.MessageService(this.config, this, this.gateway);
        this.fileService = new FileService_1.FileService(this.config, this, this.gateway);
        this.statusService = new StatusService_1.StatusService(this.config, this);
        logger_1.logger.info('WhatsAppPlugin instance created');
    }
    /**
     * Initialize the plugin (called automatically on first connect)
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            await this.connectionManager.initialize();
            await this.authService.initialize();
            await this.messageService.initialize();
            await this.fileService.initialize();
            await this.statusService.initialize();
            this.initialized = true;
            logger_1.logger.info('WhatsAppPlugin initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize WhatsAppPlugin:', error);
            throw error;
        }
    }
    // ── Connection ──────────────────────────────────────────────
    async connect() {
        try {
            await this.initialize();
            const connected = await this.connectionManager.connect();
            if (connected) {
                this.emit('connected', this.getStatus());
            }
            return connected;
        }
        catch (error) {
            logger_1.logger.error('Connection failed:', error);
            this.emit('error', error);
            return false;
        }
    }
    async disconnect() {
        try {
            await this.connectionManager.disconnect();
            this.emit('disconnected', null);
            logger_1.logger.info('WhatsAppPlugin disconnected');
        }
        catch (error) {
            logger_1.logger.error('Error during disconnect:', error);
            this.emit('error', error);
        }
    }
    isConnected() {
        return this.connectionManager.isConnected();
    }
    // ── Authentication ──────────────────────────────────────────
    async startQRLogin(force = false) {
        if (!this.initialized)
            await this.initialize();
        return this.authService.startQRLogin(force);
    }
    async waitForQRScan() {
        if (!this.initialized)
            await this.initialize();
        return this.authService.waitForQRScan();
    }
    async logout() {
        if (!this.initialized)
            await this.initialize();
        await this.authService.logout();
        await this.connectionManager.disconnect();
        this.emit('disconnected', null);
        logger_1.logger.info('WhatsAppPlugin logged out');
    }
    // ── Messaging ───────────────────────────────────────────────
    async sendMessage(to, text) {
        if (!this.initialized)
            await this.initialize();
        if (!this.isConnected()) {
            throw new Error('WhatsApp is not connected. Call connect() first.');
        }
        try {
            const result = await this.messageService.sendText(to, text);
            if (result.success) {
                this.emit('message-sent', result.messageId || '');
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to send message:', error);
            this.emit('error', error);
            throw error;
        }
    }
    async sendFile(to, file, caption) {
        if (!this.initialized)
            await this.initialize();
        if (!this.isConnected()) {
            throw new Error('WhatsApp is not connected. Call connect() first.');
        }
        try {
            const result = await this.fileService.sendFile(to, file, caption);
            if (result.success) {
                this.emit('message-sent', result.messageId || '');
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to send file:', error);
            this.emit('error', error);
            throw error;
        }
    }
    async sendMediaFromPath(to, mediaPath, caption) {
        if (!this.initialized)
            await this.initialize();
        if (!this.isConnected()) {
            throw new Error('WhatsApp is not connected. Call connect() first.');
        }
        return this.fileService.sendMediaFromPath(to, mediaPath, caption);
    }
    // ── Status & Session ────────────────────────────────────────
    getStatus() {
        return {
            connected: this.connectionManager.isConnected(),
            authenticated: this.authService.isAuthenticated(),
            phoneNumber: this.authService.getPhoneNumber() ?? undefined,
            tenantId: this.config.tenantId ?? undefined,
            lastConnectedAt: this.connectionManager.getLastConnectedAt() ?? undefined,
            lastError: this.statusService.getLastError() ?? undefined,
            reconnectAttempts: this.connectionManager.getReconnectAttempts(),
        };
    }
    getGatewayDiagnostics() {
        if (this.gateway instanceof OpenClawGatewayAdapter_1.OpenClawGatewayAdapter) {
            return this.gateway.getDiagnostics();
        }
        if (this.gateway instanceof HttpGatewayAdapter_1.HttpGatewayAdapter) {
            return this.gateway.getDiagnostics();
        }
        return {
            configPath: 'N/A',
            configExists: false,
            wsUrl: 'N/A',
            hasToken: false,
            hasWhatsAppCreds: false,
        };
    }
    isGatewayAvailable() {
        return this.gateway.isAvailable();
    }
    async saveSession() {
        if (!this.initialized)
            await this.initialize();
        await this.authService.saveSession();
        this.emit('session-save');
        logger_1.logger.info('Session saved');
    }
    async loadSession() {
        if (!this.initialized)
            await this.initialize();
        const loaded = await this.authService.loadSession();
        if (loaded) {
            this.emit('session-load');
            logger_1.logger.info('Session loaded');
        }
        return loaded;
    }
    // ── Multi-tenant factory ────────────────────────────────────
    static createInstance(tenantId, config = {}) {
        return new WhatsAppPlugin({ ...config, tenantId });
    }
}
exports.WhatsAppPlugin = WhatsAppPlugin;
exports.default = WhatsAppPlugin;
//# sourceMappingURL=WhatsAppClient.js.map