"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
/**
 * Simple EventEmitter implementation for the WhatsApp plugin
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    /**
     * Register an event listener
     */
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)?.add(listener);
    }
    /**
     * Remove an event listener
     */
    off(event, listener) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
    }
    /**
     * Emit an event to all registered listeners
     */
    emit(event, ...args) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    // Prevent one listener error from affecting others
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        }
        else {
            this.events.clear();
        }
    }
    /**
     * Get the number of listeners for an event
     */
    listenerCount(event) {
        return this.events.get(event)?.size || 0;
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=EventEmitter.js.map