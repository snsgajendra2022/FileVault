/**
 * Mock Gateway Adapter
 *
 * Fallback adapter used when neither the OpenClaw Node.js gateway client
 * nor the HTTP relay endpoint are available.
 *
 * All methods return safe defaults. This allows the plugin to be imported
 * and instantiated in any environment without crashing.
 */
import { logger } from '../utils/logger';
export class MockGatewayAdapter {
    isAvailable() {
        return false;
    }
    // ── Connection ──────────────────────────────────────────────
    async isGatewayConfigured() {
        return false;
    }
    async isGatewayReachable() {
        return false;
    }
    async getGatewayStatus() {
        return null;
    }
    async ensureWhatsAppChannelRunning(_accountId) {
        return null;
    }
    async logoutWhatsApp(_accountId) {
        return null;
    }
    getDiagnostics() {
        return {
            configPath: 'N/A (mock adapter)',
            configExists: false,
            wsUrl: 'N/A',
            hasToken: false,
            hasWhatsAppCreds: false,
        };
    }
    // ── Authentication / QR ─────────────────────────────────────
    async startQrLogin(_force = false) {
        logger.warn('MockGatewayAdapter: startQrLogin called — no real gateway available');
        return {
            result: { message: 'No gateway configured. Set WHATSAPP_PLUGIN_API_ENDPOINT or run in Node.js with OpenClaw.' },
            error: 'No gateway available',
        };
    }
    async waitForQrScan(_timeoutMs) {
        return { connected: false, message: 'No gateway configured' };
    }
    // ── Messaging ───────────────────────────────────────────────
    async sendText(_to, _text, _accountId) {
        return { ok: false, error: 'No gateway configured' };
    }
    async sendMedia(_to, _mediaPath, _caption, _accountId) {
        return { ok: false, error: 'No gateway configured' };
    }
    // ── Credentials ─────────────────────────────────────────────
    async hasWhatsAppSessionCreds() {
        return false;
    }
    async readPhoneFromWhatsAppCreds() {
        return null;
    }
    async readWhatsAppSelfJid() {
        return null;
    }
}
