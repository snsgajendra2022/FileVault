import type { WhatsAppPluginConfig } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
import { logger } from '../utils/logger';

/**
 * Handles WhatsApp authentication including QR login and session management.
 * Uses the gateway adapter for real QR login when available,
 * falls back to mock mode for browser-only environments.
 */
export class AuthService {
  private config: WhatsAppPluginConfig;
  private isAuthenticatedFlag: boolean = false;
  private phoneNumber: string | null = null;
  private gateway: IGatewayAdapter;

  constructor(config: WhatsAppPluginConfig, private eventEmitter: any, gateway: IGatewayAdapter) {
    this.config = config;
    this.gateway = gateway;
    logger.info('AuthService initialized (gateway available: ' + gateway.isAvailable() + ')');
  }

  async initialize(): Promise<void> {
    try {
      await this.loadSession();

      // If gateway is available, try to read phone from creds
      if (this.gateway.isAvailable()) {
        const phoneFromCreds = await this.gateway.readPhoneFromWhatsAppCreds();
        if (phoneFromCreds && !this.phoneNumber) {
          this.phoneNumber = phoneFromCreds;
        }
        const hasCreds = await this.gateway.hasWhatsAppSessionCreds();
        if (hasCreds && !this.isAuthenticatedFlag) {
          this.isAuthenticatedFlag = true;
        }
      }

      logger.info('AuthService initialized');
    } catch (error) {
      logger.error('Failed to initialize AuthService:', error);
      throw error;
    }
  }

  /**
   * Start QR login process via gateway adapter
   */
  async startQRLogin(force = false): Promise<{ qrCode: string; message: string }> {
    logger.info('Starting QR login process (force: ' + force + ')');

    if (this.gateway.isAvailable()) {
      const { result, error } = await this.gateway.startQrLogin(force);

      if (error && !result?.qrDataUrl) {
        throw new Error(error);
      }

      const qrCode = result?.qrDataUrl || '';
      const message = result?.message || 'Scan this QR code with WhatsApp';

      this.eventEmitter.emit('qr-code', { qrCode, message });

      return { qrCode, message };
    }

    // Fallback: mock QR code
    return this.getMockQRCode();
  }

  /**
   * Wait for QR code to be scanned via gateway adapter
   */
  async waitForQRScan(): Promise<boolean> {
    logger.info('Waiting for QR code scan');

    if (this.gateway.isAvailable()) {
      const { connected, phone } = await this.gateway.waitForQrScan();

      if (connected) {
        this.isAuthenticatedFlag = true;
        if (phone) {
          this.phoneNumber = phone;
        } else {
          this.phoneNumber = await this.gateway.readPhoneFromWhatsAppCreds();
        }
        await this.saveSession();
        logger.info('QR code scanned successfully, phone: ' + this.phoneNumber);
      }

      return connected;
    }

    // Fallback: mock scan
    return new Promise((resolve) => {
      setTimeout(async () => {
        this.isAuthenticatedFlag = true;
        this.phoneNumber = '+1234567890';
        await this.saveSession();
        logger.info('QR code scanned successfully (mock)');
        resolve(true);
      }, 5000);
    });
  }

  /**
   * Logout from WhatsApp
   */
  async logout(): Promise<void> {
    logger.info('Logging out from WhatsApp');

    if (this.gateway.isAvailable()) {
      try {
        await this.gateway.logoutWhatsApp();
      } catch (error: any) {
        logger.warn('Gateway logout failed:', error.message);
      }
    }

    this.isAuthenticatedFlag = false;
    this.phoneNumber = null;
    await this.clearSession();
    this.eventEmitter.emit('disconnected', null);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedFlag;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  /**
   * Get the gateway adapter (for use by other services)
   */
  getGateway(): IGatewayAdapter {
    return this.gateway;
  }

  // ── Session persistence ─────────────────────────────────────

  async saveSession(): Promise<void> {
    try {
      const sessionData = {
        isAuthenticated: this.isAuthenticatedFlag,
        phoneNumber: this.phoneNumber,
        timestamp: Date.now(),
      };

      if (this.config.sessionStorage) {
        this.config.sessionStorage.setItem('whatsapp-session', JSON.stringify(sessionData));
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('whatsapp-session', JSON.stringify(sessionData));
      } else if (this.config.sessionPath) {
        logger.info(`Would save session to ${this.config.sessionPath}`);
      }

      logger.info('Session saved');
    } catch (error) {
      logger.error('Failed to save session:', error);
      throw error;
    }
  }

  async loadSession(): Promise<boolean> {
    try {
      let sessionData = null;

      if (this.config.sessionStorage) {
        const stored = this.config.sessionStorage.getItem('whatsapp-session');
        sessionData = stored ? JSON.parse(stored) : null;
      } else if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('whatsapp-session');
        sessionData = stored ? JSON.parse(stored) : null;
      } else if (this.config.sessionPath) {
        logger.info(`Would load session from ${this.config.sessionPath}`);
      }

      if (sessionData?.isAuthenticated) {
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000;

        if (sessionAge < maxAge) {
          this.isAuthenticatedFlag = sessionData.isAuthenticated;
          this.phoneNumber = sessionData.phoneNumber;
          logger.info('Session loaded successfully');
          return true;
        } else {
          logger.info('Session expired, clearing');
          await this.clearSession();
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to load session:', error);
      return false;
    }
  }

  async clearSession(): Promise<void> {
    try {
      if (this.config.sessionStorage) {
        this.config.sessionStorage.removeItem('whatsapp-session');
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('whatsapp-session');
      }

      this.isAuthenticatedFlag = false;
      this.phoneNumber = null;
      logger.info('Session cleared');
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
  }

  // ── Mock QR (fallback) ──────────────────────────────────────

  private async getMockQRCode(): Promise<{ qrCode: string; message: string }> {
    const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#f0f0f0"/>
      <text x="100" y="90" text-anchor="middle" font-size="14" fill="#333">WhatsApp QR</text>
      <text x="100" y="115" text-anchor="middle" font-size="11" fill="#666">Start OpenClaw gateway</text>
      <text x="100" y="140" text-anchor="middle" font-size="10" fill="#999">Dev mode — not scannable</text>
    </svg>`;

    const btoaFn = typeof btoa !== 'undefined' ? btoa : (s: string) => Buffer.from(s).toString('base64');

    return {
      qrCode: `data:image/svg+xml;base64,${btoaFn(qrSvg)}`,
      message: 'Scan this QR code with WhatsApp to connect your device',
    };
  }
}
