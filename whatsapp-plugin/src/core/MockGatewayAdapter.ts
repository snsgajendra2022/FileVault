/**
 * Mock Gateway Adapter
 *
 * Fallback adapter used when neither the OpenClaw Node.js gateway client
 * nor the HTTP relay endpoint are available.
 *
 * All methods return safe defaults. This allows the plugin to be imported
 * and instantiated in any environment without crashing.
 */

import type {
  IGatewayAdapter,
  GatewayStatus,
  GatewayLoginResult,
  GatewayDiagnostics,
  GatewaySendResult,
  GatewayQrWaitResult,
} from './IGatewayAdapter';
import { logger } from '../utils/logger';

export class MockGatewayAdapter implements IGatewayAdapter {
  isAvailable(): boolean {
    return false;
  }

  // ── Connection ──────────────────────────────────────────────

  async isGatewayConfigured(): Promise<boolean> {
    return false;
  }

  async isGatewayReachable(): Promise<boolean> {
    return false;
  }

  async getGatewayStatus(): Promise<GatewayStatus | null> {
    return null;
  }

  async ensureWhatsAppChannelRunning(_accountId?: string): Promise<GatewayStatus | null> {
    return null;
  }

  async logoutWhatsApp(_accountId?: string): Promise<unknown> {
    return null;
  }

  getDiagnostics(): GatewayDiagnostics {
    return {
      configPath: 'N/A (mock adapter)',
      configExists: false,
      wsUrl: 'N/A',
      hasToken: false,
      hasWhatsAppCreds: false,
    };
  }

  // ── Authentication / QR ─────────────────────────────────────

  async startQrLogin(_force = false): Promise<{ result: GatewayLoginResult; error?: string }> {
    logger.warn('MockGatewayAdapter: startQrLogin called — no real gateway available');
    return {
      result: { message: 'No gateway configured. Set WHATSAPP_PLUGIN_API_ENDPOINT or run in Node.js with OpenClaw.' },
      error: 'No gateway available',
    };
  }

  async waitForQrScan(_timeoutMs?: number): Promise<GatewayQrWaitResult> {
    return { connected: false, message: 'No gateway configured' };
  }

  // ── Messaging ───────────────────────────────────────────────

  async sendText(_to: string, _text: string, _accountId?: string): Promise<GatewaySendResult> {
    return { ok: false, error: 'No gateway configured' };
  }

  async sendMedia(
    _to: string,
    _mediaPath: string,
    _caption?: string,
    _accountId?: string,
  ): Promise<GatewaySendResult> {
    return { ok: false, error: 'No gateway configured' };
  }

  // ── Credentials ─────────────────────────────────────────────

  async hasWhatsAppSessionCreds(): Promise<boolean> {
    return false;
  }

  async readPhoneFromWhatsAppCreds(): Promise<string | null> {
    return null;
  }

  async readWhatsAppSelfJid(): Promise<string | null> {
    return null;
  }
}
