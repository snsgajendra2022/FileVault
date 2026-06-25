import type { WhatsAppPluginConfig, MessageResponse } from '../types';
import type { IGatewayAdapter } from '../core/IGatewayAdapter';
/**
 * Handles sending WhatsApp text messages.
 * Uses the gateway adapter for real sends when available.
 */
export declare class MessageService {
    private eventEmitter;
    private gateway;
    constructor(_config: WhatsAppPluginConfig, eventEmitter: any, gateway: IGatewayAdapter);
    initialize(): Promise<void>;
    /**
     * Send a text message via the gateway adapter
     */
    sendText(to: string, text: string): Promise<MessageResponse>;
    /**
     * Handle inbound messages (called by webhook or relay)
     */
    handleInboundMessage(messageData: any): Promise<void>;
}
//# sourceMappingURL=MessageService.d.ts.map