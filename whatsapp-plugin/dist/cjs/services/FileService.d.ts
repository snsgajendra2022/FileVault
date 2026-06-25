import type { WhatsAppPluginConfig, MessageResponse } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
/**
 * Handles sending WhatsApp files/media.
 * Uses the gateway adapter for real media sends when available.
 *
 * NOTE: The OpenClaw gateway requires a file path on disk for media sends.
 * For browser environments, you'll need to upload the file first
 * and then pass the server-side path to sendMediaFromPath().
 */
export declare class FileService {
    private eventEmitter;
    private gateway;
    constructor(_config: WhatsAppPluginConfig, eventEmitter: any, gateway: IGatewayAdapter);
    initialize(): Promise<void>;
    /**
     * Send a file/media
     * @param to - Recipient phone number
     * @param file - File to send (File object in browser, Buffer/path in Node.js)
     * @param caption - Optional caption
     */
    sendFile(to: string, file: File | Buffer, caption?: string): Promise<MessageResponse>;
    /**
     * Send media using a server-side file path (Node.js only)
     */
    sendMediaFromPath(to: string, mediaPath: string, caption?: string): Promise<MessageResponse>;
    /**
     * Handle inbound media (called by webhook or relay)
     */
    handleInboundMedia(mediaData: any): Promise<void>;
}
//# sourceMappingURL=FileService.d.ts.map