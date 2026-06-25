"use strict";
/**
 * OpenClaw Gateway Adapter (Node.js)
 *
 * Wraps the Node.js CommonJS gateway client for use in the TypeScript plugin.
 * This adapter calls the OpenClaw gateway WebSocket API via the
 * server/openclaw-gateway-client.js module.
 *
 * NOTE: This adapter only works in Node.js. For browser environments,
 * use HttpGatewayAdapter instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenClawGatewayAdapter = void 0;
const logger_1 = require("../utils/logger");
function tryRequireGatewayClient() {
    // Guard: only works in Node.js where global require is available
    if (typeof globalThis.require === 'undefined') {
        return null;
    }
    try {
        const path = require('path');
        const repoRoot = path.resolve(__dirname, '..', '..', '..');
        return require(path.join(repoRoot, 'server', 'openclaw-gateway-client'));
    }
    catch {
        return null;
    }
}
class OpenClawGatewayAdapter {
    constructor() {
        this.client = tryRequireGatewayClient();
        this.available = this.client !== null;
        if (!this.available) {
            logger_1.logger.warn('OpenClaw gateway client not available — falling back to mock mode');
        }
        else {
            logger_1.logger.info('OpenClaw gateway client loaded');
        }
    }
    isAvailable() {
        return this.available;
    }
    // ── Connection ──────────────────────────────────────────────
    async isGatewayConfigured() {
        if (!this.available)
            return false;
        try {
            return this.client.isGatewayConfigured();
        }
        catch {
            return false;
        }
    }
    async isGatewayReachable() {
        if (!this.available)
            return false;
        try {
            return await this.client.isGatewayReachable();
        }
        catch {
            return false;
        }
    }
    async getGatewayStatus() {
        if (!this.available)
            return null;
        try {
            const channelsStatus = await this.client.gatewayChannelsStatus();
            return this.client.parseWhatsAppGatewayAccount(channelsStatus);
        }
        catch (error) {
            logger_1.logger.error('Failed to get gateway status:', error.message);
            return null;
        }
    }
    async ensureGatewayOperatorScopes() {
        if (!this.available)
            return null;
        try {
            return await this.client.ensureGatewayOperatorScopes();
        }
        catch (error) {
            logger_1.logger.error('Failed to ensure operator scopes:', error.message);
            throw error;
        }
    }
    async ensureWhatsAppChannelRunning(accountId = 'default') {
        if (!this.available)
            return null;
        try {
            return await this.client.ensureWhatsAppChannelRunning(accountId);
        }
        catch (error) {
            logger_1.logger.error('Failed to ensure WhatsApp channel running:', error.message);
            throw error;
        }
    }
    async logoutWhatsApp(accountId = 'default') {
        if (!this.available)
            return null;
        try {
            return await this.client.gatewayLogoutWhatsApp(accountId);
        }
        catch (error) {
            logger_1.logger.error('Failed to logout WhatsApp:', error.message);
            throw error;
        }
    }
    getDiagnostics() {
        if (!this.available) {
            return {
                configPath: 'N/A',
                configExists: false,
                wsUrl: 'N/A',
                hasToken: false,
                hasWhatsAppCreds: false,
            };
        }
        return this.client.getGatewayDiagnostics();
    }
    // ── Authentication / QR ─────────────────────────────────────
    async startQrLogin(force = false) {
        if (!this.available) {
            return {
                result: { message: 'Gateway not available' },
                error: 'OpenClaw gateway client not loaded',
            };
        }
        try {
            const reachable = await this.client.isGatewayReachable();
            if (!reachable) {
                return {
                    result: { message: 'Gateway not reachable on port 18789' },
                    error: 'Gateway not reachable',
                };
            }
            // Check if already linked
            if (!force) {
                const channelsStatus = await this.client.gatewayChannelsStatus();
                const wa = this.client.parseWhatsAppGatewayAccount(channelsStatus);
                const hasCreds = this.client.hasWhatsAppSessionCreds();
                const sessionOk = hasCreds && !wa?.loggedOut && (wa?.linked || wa?.running || wa?.connected);
                if (sessionOk) {
                    return {
                        result: {
                            message: 'WhatsApp is already linked.',
                            qrDataUrl: null,
                            connected: true,
                        },
                    };
                }
            }
            // Handle operator scopes if needed
            let raw;
            try {
                raw = await this.client.gatewayCall('web.login.start', {
                    force,
                    timeoutMs: 60000,
                    verbose: false,
                });
            }
            catch (loginErr) {
                if (!this.client.isGatewayPairingError(loginErr))
                    throw loginErr;
                await this.client.ensureGatewayOperatorScopes();
                raw = await this.client.gatewayCall('web.login.start', {
                    force,
                    timeoutMs: 60000,
                    verbose: false,
                });
            }
            const result = this.client.normalizeGatewayLoginResult(raw);
            return { result: result };
        }
        catch (error) {
            return {
                result: { message: error.message },
                error: error.message,
            };
        }
    }
    async waitForQrScan(timeoutMs = 120000) {
        if (!this.available) {
            return { connected: false, message: 'Gateway not available' };
        }
        try {
            const raw = await this.client.gatewayCall('web.login.wait', { timeoutMs }, timeoutMs + 10000);
            const result = this.client.normalizeGatewayLoginResult(raw);
            const connected = Boolean(result?.connected);
            let phone;
            if (result?.message) {
                phone = this.client.parsePhoneFromGatewayText(result.message) || undefined;
            }
            return {
                connected,
                message: result?.message,
                phone,
            };
        }
        catch (error) {
            return { connected: false, message: error.message };
        }
    }
    // ── Messaging ───────────────────────────────────────────────
    async sendText(to, text, accountId = 'default') {
        if (!this.available) {
            return { ok: false, error: 'Gateway not available' };
        }
        try {
            await this.client.gatewaySendWhatsApp({ to, text, accountId });
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    }
    async sendMedia(to, mediaPath, caption, accountId = 'default') {
        if (!this.available) {
            return { ok: false, error: 'Gateway not available' };
        }
        try {
            await this.client.gatewaySendWhatsAppMedia({ to, mediaPath, text: caption, accountId });
            return { ok: true };
        }
        catch (error) {
            return { ok: false, error: error.message };
        }
    }
    // ── Credentials ─────────────────────────────────────────────
    // Wrap synchronous Node.js calls in Promise.resolve for interface compatibility
    async hasWhatsAppSessionCreds() {
        if (!this.available)
            return false;
        try {
            return this.client.hasWhatsAppSessionCreds();
        }
        catch {
            return false;
        }
    }
    async readPhoneFromWhatsAppCreds() {
        if (!this.available)
            return null;
        try {
            return this.client.readPhoneFromWhatsAppCreds();
        }
        catch {
            return null;
        }
    }
    async readWhatsAppSelfJid() {
        if (!this.available)
            return null;
        try {
            return this.client.readWhatsAppSelfJid();
        }
        catch {
            return null;
        }
    }
}
exports.OpenClawGatewayAdapter = OpenClawGatewayAdapter;
//# sourceMappingURL=OpenClawGatewayAdapter.js.map