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

import type {
  IGatewayAdapter,
  GatewayStatus,
  GatewayLoginResult,
  GatewayDiagnostics,
  GatewaySendResult,
  GatewayQrWaitResult,
} from './IGatewayAdapter';
import { logger } from '../utils/logger';

function tryRequireGatewayClient(): any | null {
  // Guard: only works in Node.js where global require is available
  if (typeof (globalThis as any).require === 'undefined') {
    return null;
  }
  try {
    const path = require('path');
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    return require(path.join(repoRoot, 'server', 'openclaw-gateway-client'));
  } catch {
    return null;
  }
}

export class OpenClawGatewayAdapter implements IGatewayAdapter {
  private client: any;
  private available: boolean;

  constructor() {
    this.client = tryRequireGatewayClient();
    this.available = this.client !== null;

    if (!this.available) {
      logger.warn('OpenClaw gateway client not available — falling back to mock mode');
    } else {
      logger.info('OpenClaw gateway client loaded');
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  // ── Connection ──────────────────────────────────────────────

  async isGatewayConfigured(): Promise<boolean> {
    if (!this.available) return false;
    try {
      return this.client.isGatewayConfigured();
    } catch {
      return false;
    }
  }

  async isGatewayReachable(): Promise<boolean> {
    if (!this.available) return false;
    try {
      return await this.client.isGatewayReachable();
    } catch {
      return false;
    }
  }

  async getGatewayStatus(): Promise<GatewayStatus | null> {
    if (!this.available) return null;
    try {
      const channelsStatus = await this.client.gatewayChannelsStatus();
      return this.client.parseWhatsAppGatewayAccount(channelsStatus);
    } catch (error: any) {
      logger.error('Failed to get gateway status:', error.message);
      return null;
    }
  }

  async ensureGatewayOperatorScopes(): Promise<unknown> {
    if (!this.available) return null;
    try {
      return await this.client.ensureGatewayOperatorScopes();
    } catch (error: any) {
      logger.error('Failed to ensure operator scopes:', error.message);
      throw error;
    }
  }

  async ensureWhatsAppChannelRunning(accountId = 'default'): Promise<GatewayStatus | null> {
    if (!this.available) return null;
    try {
      return await this.client.ensureWhatsAppChannelRunning(accountId);
    } catch (error: any) {
      logger.error('Failed to ensure WhatsApp channel running:', error.message);
      throw error;
    }
  }

  async logoutWhatsApp(accountId = 'default'): Promise<unknown> {
    if (!this.available) return null;
    try {
      return await this.client.gatewayLogoutWhatsApp(accountId);
    } catch (error: any) {
      logger.error('Failed to logout WhatsApp:', error.message);
      throw error;
    }
  }

  getDiagnostics(): GatewayDiagnostics {
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

  async startQrLogin(force = false): Promise<{ result: GatewayLoginResult; error?: string }> {
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
      } catch (loginErr: any) {
        if (!this.client.isGatewayPairingError(loginErr)) throw loginErr;
        await this.client.ensureGatewayOperatorScopes();
        raw = await this.client.gatewayCall('web.login.start', {
          force,
          timeoutMs: 60000,
          verbose: false,
        });
      }

      const result = this.client.normalizeGatewayLoginResult(raw);
      return { result: result as GatewayLoginResult };
    } catch (error: any) {
      return {
        result: { message: error.message },
        error: error.message,
      };
    }
  }

  async waitForQrScan(timeoutMs = 120000): Promise<GatewayQrWaitResult> {
    if (!this.available) {
      return { connected: false, message: 'Gateway not available' };
    }

    try {
      const raw = await this.client.gatewayCall(
        'web.login.wait',
        { timeoutMs },
        timeoutMs + 10000,
      );
      const result = this.client.normalizeGatewayLoginResult(raw);
      const connected = Boolean(result?.connected);

      let phone: string | undefined;
      if (result?.message) {
        phone = this.client.parsePhoneFromGatewayText(result.message) || undefined;
      }

      return {
        connected,
        message: result?.message,
        phone,
      };
    } catch (error: any) {
      return { connected: false, message: error.message };
    }
  }

  // ── Messaging ───────────────────────────────────────────────

  async sendText(to: string, text: string, accountId = 'default'): Promise<GatewaySendResult> {
    if (!this.available) {
      return { ok: false, error: 'Gateway not available' };
    }

    try {
      await this.client.gatewaySendWhatsApp({ to, text, accountId });
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  async sendMedia(
    to: string,
    mediaPath: string,
    caption?: string,
    accountId = 'default',
  ): Promise<GatewaySendResult> {
    if (!this.available) {
      return { ok: false, error: 'Gateway not available' };
    }

    try {
      await this.client.gatewaySendWhatsAppMedia({ to, mediaPath, text: caption, accountId });
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  // ── Credentials ─────────────────────────────────────────────
  // Wrap synchronous Node.js calls in Promise.resolve for interface compatibility

  async hasWhatsAppSessionCreds(): Promise<boolean> {
    if (!this.available) return false;
    try {
      return this.client.hasWhatsAppSessionCreds();
    } catch {
      return false;
    }
  }

  async readPhoneFromWhatsAppCreds(): Promise<string | null> {
    if (!this.available) return null;
    try {
      return this.client.readPhoneFromWhatsAppCreds();
    } catch {
      return null;
    }
  }

  async readWhatsAppSelfJid(): Promise<string | null> {
    if (!this.available) return null;
    try {
      return this.client.readWhatsAppSelfJid();
    } catch {
      return null;
    }
  }
}
