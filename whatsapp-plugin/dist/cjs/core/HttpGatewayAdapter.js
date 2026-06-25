"use strict";
/**
 * HTTP Gateway Adapter
 *
 * Browser-safe adapter that talks to the OpenClaw relay endpoint
 * (the `om-whatsapp-relay` plugin on the server side).
 *
 * Environment variables / config used:
 *   WHATSAPP_PLUGIN_API_ENDPOINT  – base URL of the relay (e.g. http://127.0.0.1:9093)
 *   WHATSAPP_PLUGIN_API_KEY       – optional API key / bearer token
 *
 * Endpoints expected on the relay server:
 *   GET  /api/whatsapp/gateway-status    → { status: GatewayStatus }
 *   POST /api/whatsapp/login-start       → { result: GatewayLoginResult }
 *   POST /api/whatsapp/login-wait        → { connected, message, phone }
 *   POST /api/whatsapp/logout           → { ok: true }
 *   POST /api/whatsapp/send-text        → { ok, error }
 *   POST /api/whatsapp/send-media       → { ok, error }
 *   GET  /api/whatsapp/gateway-diag     → { diagnostics }
 *   GET  /api/whatsapp/session-creds    → { has, phone, selfJid }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpGatewayAdapter = void 0;
const logger_1 = require("../utils/logger");
class HttpGatewayAdapter {
    constructor() {
        // Works both in browser (process.env injected by bundler) and Node.js
        const envApiEndpoint = typeof process !== 'undefined' && process.env
            ? process.env.WHATSAPP_PLUGIN_API_ENDPOINT
            : undefined;
        this.baseUrl = (envApiEndpoint || 'http://127.0.0.1:9093').replace(/\/+$/, '');
        const apiKey = typeof process !== 'undefined' && process.env
            ? process.env.WHATSAPP_PLUGIN_API_KEY
            : undefined;
        this.authHeader = apiKey ? `Bearer ${apiKey}` : null;
        logger_1.logger.info(`HttpGatewayAdapter initialized (endpoint: ${this.baseUrl})`);
    }
    isAvailable() {
        // Always "available" — we'll discover reachability on first call
        return true;
    }
    // ── helpers ─────────────────────────────────────────────────
    async request(path, body) {
        try {
            const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
            const headers = {
                'Content-Type': 'application/json',
            };
            if (this.authHeader)
                headers['Authorization'] = this.authHeader;
            const res = await fetch(url, {
                method: body ? 'POST' : 'GET',
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!res.ok) {
                logger_1.logger.warn(`HTTP adapter ${path} → ${res.status}`);
                return null;
            }
            return await res.json();
        }
        catch (error) {
            logger_1.logger.warn(`HTTP adapter ${path} failed:`, error.message);
            return null;
        }
    }
    // ── Connection ──────────────────────────────────────────────
    async isGatewayConfigured() {
        const diag = await this.request('/api/openclaw/gateway-status');
        return diag?.configured ?? false;
    }
    async isGatewayReachable() {
        const status = await this.getGatewayStatus();
        return status !== null;
    }
    async getGatewayStatus() {
        const data = await this.request('/api/openclaw/gateway-status');
        return data?.status ?? null;
    }
    async ensureWhatsAppChannelRunning(accountId = 'default') {
        const data = await this.request('/api/openclaw/ensure-channel', { accountId });
        return data?.status ?? null;
    }
    async logoutWhatsApp(accountId = 'default') {
        return this.request('/api/openclaw/logout', { accountId });
    }
    getDiagnostics() {
        return {
            configPath: 'N/A (HTTP adapter)',
            configExists: false,
            wsUrl: this.baseUrl,
            hasToken: !!this.authHeader,
            hasWhatsAppCreds: false,
        };
    }
    // ── Authentication / QR ─────────────────────────────────────
    async startQrLogin(force = false) {
        const data = await this.request('/api/openclaw/login-start', { force, timeoutMs: 60000 });
        if (!data) {
            return {
                result: { message: 'Relay endpoint unreachable' },
                error: 'Could not reach relay at ' + this.baseUrl,
            };
        }
        return data;
    }
    async waitForQrScan(timeoutMs = 120000) {
        const data = await this.request('/api/openclaw/login-wait', { timeoutMs });
        if (!data) {
            return { connected: false, message: 'Relay endpoint unreachable' };
        }
        return data;
    }
    // ── Messaging ───────────────────────────────────────────────
    async sendText(to, text, accountId = 'default') {
        const data = await this.request('/api/openclaw/send-text', {
            to,
            text,
            accountId,
        });
        if (!data)
            return { ok: false, error: 'Relay endpoint unreachable' };
        return data;
    }
    async sendMedia(to, mediaPath, caption, accountId = 'default') {
        const data = await this.request('/api/openclaw/send-media', {
            to,
            mediaPath,
            caption,
            accountId,
        });
        if (!data)
            return { ok: false, error: 'Relay endpoint unreachable' };
        return data;
    }
    // ── Credentials ─────────────────────────────────────────────
    async hasWhatsAppSessionCreds() {
        const data = await this.request('/api/openclaw/session-creds');
        return data?.has ?? false;
    }
    async readPhoneFromWhatsAppCreds() {
        const data = await this.request('/api/openclaw/session-creds');
        return data?.phone ?? null;
    }
    async readWhatsAppSelfJid() {
        const data = await this.request('/api/openclaw/session-creds');
        return data?.selfJid ?? null;
    }
}
exports.HttpGatewayAdapter = HttpGatewayAdapter;
//# sourceMappingURL=HttpGatewayAdapter.js.map