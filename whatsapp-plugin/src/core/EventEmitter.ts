import type { WhatsAppEvent, WhatsAppEventMap } from '../types';

/**
 * Simple EventEmitter implementation for the WhatsApp plugin
 */
export class EventEmitter {
  private events: Map<WhatsAppEvent, Set<Function>> = new Map();

  /**
   * Register an event listener
   */
  on<T extends WhatsAppEvent>(event: T, listener: WhatsAppEventMap[T]): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(listener);
  }

  /**
   * Remove an event listener
   */
  off<T extends WhatsAppEvent>(event: T, listener: WhatsAppEventMap[T]): void {
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
  emit<T extends WhatsAppEvent>(event: T, ...args: Parameters<WhatsAppEventMap[T]>): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          // Prevent one listener error from affecting others
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: WhatsAppEvent): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: WhatsAppEvent): number {
    return this.events.get(event)?.size || 0;
  }
}