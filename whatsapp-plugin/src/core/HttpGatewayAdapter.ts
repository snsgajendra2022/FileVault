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

import type {
  IGatewayAdapter,
  GatewayStatus,
  GatewayLoginResult,
  GatewayDiagnostics,
  GatewaySendResult,
  GatewayQrWaitResult,
} from './IGatewayAdapter';
import { logger } from '../utils/logger';

export class HttpGatewayAdapter implements IGatewayAdapter {
  private baseUrl: string;
  private authHeader: string | null;

  constructor() {
    // Works both in browser (process.env injected by bundler) and Node.js
    const envApiEndpoint =
      typeof process !== 'undefined' && process.env
        ? process.env.WHATSAPP_PLUGIN_API_ENDPOINT
        : undefined;

    this.baseUrl = (envApiEndpoint || 'http://127.0.0.1:9093').replace(/\/+$/, '');

    const apiKey =
      typeof process !== 'undefined' && process.env
        ? process.env.WHATSAPP_PLUGIN_API_KEY
        : undefined;

    this.authHeader = apiKey ? `Bearer ${apiKey}` : null;

    logger.info(`HttpGatewayAdapter initialized (endpoint: ${this.baseUrl})`);
  }

  isAvailable(): boolean {
    // Always "available" — we'll discover reachability on first call
    return true;
  }

  // ── helpers ─────────────────────────────────────────────────

  private async request<T>(path: string, body?: unknown): Promise<T | null> {
    try {
      const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authHeader) headers['Authorization'] = this.authHeader;

      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        logger.warn(`HTTP adapter ${path} → ${res.status}`);
        return null;
      }

      return await res.json();
    } catch (error: any) {
      logger.warn(`HTTP adapter ${path} failed:`, error.message);
      return null;
    }
  }

  // ── Connection ──────────────────────────────────────────────

  async isGatewayConfigured(): Promise<boolean> {
    const diag = await this.request<{ configured: boolean }>('/api/openclaw/gateway-status');
    return diag?.configured ?? false;
  }

  async isGatewayReachable(): Promise<boolean> {
    const status = await this.getGatewayStatus();
    return status !== null;
  }

  async getGatewayStatus(): Promise<GatewayStatus | null> {
    const data = await this.request<{ status: GatewayStatus }>('/api/openclaw/gateway-status');
    return data?.status ?? null;
  }

  async ensureWhatsAppChannelRunning(accountId = 'default'): Promise<GatewayStatus | null> {
    const data = await this.request<{ status: GatewayStatus }>(
      '/api/openclaw/ensure-channel',
      { accountId },
    );
    return data?.status ?? null;
  }

  async logoutWhatsApp(accountId = 'default'): Promise<unknown> {
    return this.request('/api/openclaw/logout', { accountId });
  }

  getDiagnostics(): GatewayDiagnostics {
    return {
      configPath: 'N/A (HTTP adapter)',
      configExists: false,
      wsUrl: this.baseUrl,
      hasToken: !!this.authHeader,
      hasWhatsAppCreds: false,
    };
  }

  // ── Authentication / QR ─────────────────────────────────────

  async startQrLogin(force = false): Promise<{ result: GatewayLoginResult; error?: string }> {
    const data = await this.request<{ result: GatewayLoginResult; error?: string }>(
      '/api/openclaw/login-start',
      { force, timeoutMs: 60000 },
    );
    if (!data) {
      return {
        result: { message: 'Relay endpoint unreachable' },
        error: 'Could not reach relay at ' + this.baseUrl,
      };
    }
    return data;
  }

  async waitForQrScan(timeoutMs = 120000): Promise<GatewayQrWaitResult> {
    const data = await this.request<GatewayQrWaitResult>(
      '/api/openclaw/login-wait',
      { timeoutMs },
    );
    if (!data) {
      return { connected: false, message: 'Relay endpoint unreachable' };
    }
    return data;
  }

  // ── Messaging ───────────────────────────────────────────────

  async sendText(to: string, text: string, accountId = 'default'): Promise<GatewaySendResult> {
    const data = await this.request<GatewaySendResult>('/api/openclaw/send-text', {
      to,
      text,
      accountId,
    });
    if (!data) return { ok: false, error: 'Relay endpoint unreachable' };
    return data;
  }

  async sendMedia(
    to: string,
    mediaPath: string,
    caption?: string,
    accountId = 'default',
  ): Promise<GatewaySendResult> {
    const data = await this.request<GatewaySendResult>('/api/openclaw/send-media', {
      to,
      mediaPath,
      caption,
      accountId,
    });
    if (!data) return { ok: false, error: 'Relay endpoint unreachable' };
    return data;
  }

  // ── Credentials ─────────────────────────────────────────────

  async hasWhatsAppSessionCreds(): Promise<boolean> {
    const data = await this.request<{ has: boolean }>('/api/openclaw/session-creds');
    return data?.has ?? false;
  }

  async readPhoneFromWhatsAppCreds(): Promise<string | null> {
    const data = await this.request<{ phone: string | null }>('/api/openclaw/session-creds');
    return data?.phone ?? null;
  }

  async readWhatsAppSelfJid(): Promise<string | null> {
    const data = await this.request<{ selfJid: string | null }>('/api/openclaw/session-creds');
    return data?.selfJid ?? null;
  }
}
