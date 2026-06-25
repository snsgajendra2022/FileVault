import { logger } from '../utils/logger';
/**
 * Handles sending WhatsApp text messages.
 * Uses the gateway adapter for real sends when available.
 */
export class MessageService {
    constructor(_config, eventEmitter, gateway) {
        this.eventEmitter = eventEmitter;
        this.gateway = gateway;
        logger.info('MessageService initialized');
    }
    async initialize() {
        logger.info('MessageService initialized');
    }
    /**
     * Send a text message via the gateway adapter
     */
    async sendText(to, text) {
        logger.info(`Sending message to ${to}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
        if (this.gateway.isAvailable()) {
            const result = await this.gateway.sendText(to, text);
            if (result.ok) {
                const messageId = `gw_${Date.now()}`;
                logger.info(`Message sent via gateway to ${to}`);
                return { success: true, messageId, timestamp: new Date() };
            }
            return { success: false, error: result.error || 'Gateway send failed', timestamp: new Date() };
        }
        // Fallback: simulated send
        await new Promise((resolve) => setTimeout(resolve, 500));
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger.info(`Message sent (simulated) to ${to} with ID: ${messageId}`);
        return { success: true, messageId, timestamp: new Date() };
    }
    /**
     * Handle inbound messages (called by webhook or relay)
     */
    async handleInboundMessage(messageData) {
        logger.info('Received inbound message', messageData);
        this.eventEmitter.emit('message', messageData);
    }
}
