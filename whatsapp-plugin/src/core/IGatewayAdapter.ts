/**
 * Gateway Adapter Interface
 *
 * Abstraction layer between the WhatsApp plugin and the underlying
 * transport (OpenClaw Node.js gateway client, HTTP relay, etc.).
 *
 * All I/O methods are async to support both the synchronous Node.js
 * gateway client (wrapped in Promise.resolve) and the async HTTP relay.
 *
 * Each service receives a reference to the adapter from WhatsAppClient
 * rather than creating its own instance.
 */

export interface GatewayStatus {
  linked: boolean;
  running: boolean;
  connected: boolean;
  configured: boolean;
  loggedOut: boolean;
  phone: string | null;
  lastError: string | null;
  statusState: string | null;
  lastConnectedAtMs: number | null;
}

export interface GatewayLoginResult {
  qrDataUrl?: string | null;
  connected?: boolean | null;
  message?: string;
}

export interface GatewayDiagnostics {
  configPath: string;
  configExists: boolean;
  wsUrl: string;
  hasToken: boolean;
  hasWhatsAppCreds: boolean;
}

export interface GatewaySendResult {
  ok: boolean;
  error?: string;
}

export interface GatewayQrWaitResult {
  connected: boolean;
  message?: string;
  phone?: string;
}

/**
 * All gateway adapters must implement this interface.
 */
export interface IGatewayAdapter {
  /** Whether this adapter can actually communicate with a gateway */
  isAvailable(): boolean;

  // ── Connection ──────────────────────────────────────────────

  isGatewayConfigured(): Promise<boolean>;
  isGatewayReachable(): Promise<boolean>;
  getGatewayStatus(): Promise<GatewayStatus | null>;
  ensureWhatsAppChannelRunning(accountId?: string): Promise<GatewayStatus | null>;
  logoutWhatsApp(accountId?: string): Promise<unknown>;
  getDiagnostics(): GatewayDiagnostics;

  // ── Authentication / QR ─────────────────────────────────────

  startQrLogin(force?: boolean): Promise<{ result: GatewayLoginResult; error?: string }>;
  waitForQrScan(timeoutMs?: number): Promise<GatewayQrWaitResult>;

  // ── Messaging ───────────────────────────────────────────────

  sendText(to: string, text: string, accountId?: string): Promise<GatewaySendResult>;
  sendMedia(to: string, mediaPath: string, caption?: string, accountId?: string): Promise<GatewaySendResult>;

  // ── Credentials ─────────────────────────────────────────────
  // All async so HTTP adapters can fetch remotely; Node.js adapters wrap sync calls in Promise.resolve

  hasWhatsAppSessionCreds(): Promise<boolean>;
  readPhoneFromWhatsAppCreds(): Promise<string | null>;
  readWhatsAppSelfJid(): Promise<string | null>;
}
