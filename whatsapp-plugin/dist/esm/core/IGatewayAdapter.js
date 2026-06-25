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
export {};
