import type { WhatsAppPluginConfig, MessageResponse } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
import { logger } from '../utils/logger';

/**
 * Handles sending WhatsApp files/media.
 * Uses the gateway adapter for real media sends when available.
 *
 * NOTE: The OpenClaw gateway requires a file path on disk for media sends.
 * For browser environments, you'll need to upload the file first
 * and then pass the server-side path to sendMediaFromPath().
 */
export class FileService {
  private gateway: IGatewayAdapter;

  constructor(_config: WhatsAppPluginConfig, private eventEmitter: any, gateway: IGatewayAdapter) {
    this.gateway = gateway;
    logger.info('FileService initialized');
  }

  async initialize(): Promise<void> {
    logger.info('FileService initialized');
  }

  /**
   * Send a file/media
   * @param to - Recipient phone number
   * @param file - File to send (File object in browser, Buffer/path in Node.js)
   * @param caption - Optional caption
   */
  async sendFile(to: string, file: File | Buffer, caption?: string): Promise<MessageResponse> {
    const fileName = (file as File)?.name || 'Buffer';
    logger.info(`Sending file to ${to}: ${fileName}`);

    if (this.gateway.isAvailable()) {
      // Gateway requires a file path on disk
      // If we have a Buffer, we'd need to write it first
      const filePath = (file as any)?.path || null;

      if (!filePath) {
        logger.warn('Gateway media send requires a file path on disk. Upload file first.');
        return {
          success: false,
          error: 'File path required for gateway media send. Upload to server first.',
          timestamp: new Date(),
        };
      }

      const result = await this.gateway.sendMedia(to, filePath, caption);
      if (result.ok) {
        return { success: true, messageId: `gw_${Date.now()}`, timestamp: new Date() };
      }
      return { success: false, error: result.error || 'Gateway media send failed', timestamp: new Date() };
    }

    // Fallback: simulated send
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const messageId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`File sent (simulated) to ${to} with ID: ${messageId}`);
    return { success: true, messageId, timestamp: new Date() };
  }

  /**
   * Send media using a server-side file path (Node.js only)
   */
  async sendMediaFromPath(to: string, mediaPath: string, caption?: string): Promise<MessageResponse> {
    logger.info(`Sending media from path to ${to}: ${mediaPath}`);

    if (this.gateway.isAvailable()) {
      const result = await this.gateway.sendMedia(to, mediaPath, caption);
      if (result.ok) {
        return { success: true, messageId: `gw_${Date.now()}`, timestamp: new Date() };
      }
      return { success: false, error: result.error || 'Gateway media send failed', timestamp: new Date() };
    }

    return { success: false, error: 'Gateway not available', timestamp: new Date() };
  }

  /**
   * Handle inbound media (called by webhook or relay)
   */
  async handleInboundMedia(mediaData: any): Promise<void> {
    logger.info('Received inbound media', mediaData);
    this.eventEmitter.emit('message', mediaData);
  }
}
