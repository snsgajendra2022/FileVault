import type { WhatsAppEvent, WhatsAppEventMap } from '../types';
/**
 * Simple EventEmitter implementation for the WhatsApp plugin
 */
export declare class EventEmitter {
    private events;
    /**
     * Register an event listener
     */
    on<T extends WhatsAppEvent>(event: T, listener: WhatsAppEventMap[T]): void;
    /**
     * Remove an event listener
     */
    off<T extends WhatsAppEvent>(event: T, listener: WhatsAppEventMap[T]): void;
    /**
     * Emit an event to all registered listeners
     */
    emit<T extends WhatsAppEvent>(event: T, ...args: Parameters<WhatsAppEventMap[T]>): void;
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event?: WhatsAppEvent): void;
    /**
     * Get the number of listeners for an event
     */
    listenerCount(event: WhatsAppEvent): number;
}
//# sourceMappingURL=EventEmitter.d.ts.map