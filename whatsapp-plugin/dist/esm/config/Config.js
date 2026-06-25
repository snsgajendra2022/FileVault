import { logger } from '../utils/logger';
/**
 * Configuration management for WhatsApp plugin
 */
export class Config {
    /**
     * Merge user config with defaults and environment variables
     * @param userConfig - User provided configuration
     * @returns Merged configuration
     */
    static merge(userConfig = {}) {
        // Start with defaults
        const config = { ...this.defaults };
        // Override with environment variables
        const envConfig = this.loadFromEnvironment();
        // Override with user config (highest priority)
        Object.assign(config, envConfig, userConfig);
        logger.debug('Configuration merged:', config);
        return config;
    }
    /**
     * Load configuration from environment variables
     * @returns Configuration object from environment
     */
    static loadFromEnvironment() {
        const envConfig = {};
        // Connection settings
        if (process.env.WHATSAPP_PLUGIN_API_ENDPOINT) {
            envConfig.apiEndpoint = process.env.WHATSAPP_PLUGIN_API_ENDPOINT;
        }
        if (process.env.WHATSAPP_PLUGIN_WEBSOCKET_ENDPOINT) {
            envConfig.websocketEndpoint = process.env.WHATSAPP_PLUGIN_WEBSOCKET_ENDPOINT;
        }
        // Authentication
        if (process.env.WHATSAPP_PLUGIN_API_KEY) {
            envConfig.apiKey = process.env.WHATSAPP_PLUGIN_API_KEY;
        }
        if (process.env.WHATSAPP_PLUGIN_API_SECRET) {
            envConfig.apiSecret = process.env.WHATSAPP_PLUGIN_API_SECRET;
        }
        if (process.env.WHATSAPP_PLUGIN_VERIFY_TOKEN) {
            envConfig.verifyToken = process.env.WHATSAPP_PLUGIN_VERIFY_TOKEN;
        }
        // Session management
        if (process.env.WHATSAPP_PLUGIN_SESSION_PATH) {
            envConfig.sessionPath = process.env.WHATSAPP_PLUGIN_SESSION_PATH;
        }
        // Note: sessionStorage can't be set from env directly, needs to be passed as object
        // Behavior
        if (process.env.WHATSAPP_PLUGIN_AUTO_RECONNECT !== undefined) {
            envConfig.autoReconnect = process.env.WHATSAPP_PLUGIN_AUTO_RECONNECT === 'true';
        }
        if (process.env.WHATSAPP_PLUGIN_RECONNECT_INTERVAL) {
            envConfig.reconnectInterval = parseInt(process.env.WHATSAPP_PLUGIN_RECONNECT_INTERVAL, 10);
        }
        if (process.env.WHATSAPP_PLUGIN_MAX_RECONNECT_ATTEMPTS) {
            envConfig.maxReconnectAttempts = parseInt(process.env.WHATSAPP_PLUGIN_MAX_RECONNECT_ATTEMPTS, 10);
        }
        // Logging
        if (process.env.WHATSAPP_PLUGIN_LOG_LEVEL) {
            const level = process.env.WHATSAPP_PLUGIN_LOG_LEVEL.toLowerCase();
            if (['error', 'warn', 'info', 'debug'].includes(level)) {
                envConfig.logLevel = level;
            }
        }
        // Multi-tenant
        if (process.env.WHATSAPP_PLUGIN_TENANT_ID) {
            envConfig.tenantId = process.env.WHATSAPP_PLUGIN_TENANT_ID;
        }
        // OM AI Integration
        if (process.env.WHATSAPP_PLUGIN_OM_API_ENDPOINT) {
            envConfig.omApiEndpoint = process.env.WHATSAPP_PLUGIN_OM_API_ENDPOINT;
        }
        if (process.env.WHATSAPP_PLUGIN_OM_API_TOKEN) {
            envConfig.omApiToken = process.env.WHATSAPP_PLUGIN_OM_API_TOKEN;
        }
        return envConfig;
    }
    /**
     * Get default configuration
     * @returns Default configuration object
     */
    static getDefaults() {
        return { ...this.defaults };
    }
    /**
     * Validate configuration
     * @param config - Configuration to validate
     * @returns Array of validation errors (empty if valid)
     */
    static validate(config) {
        const errors = [];
        // Validate reconnect interval
        if (config.reconnectInterval !== undefined && config.reconnectInterval <= 0) {
            errors.push('reconnectInterval must be positive');
        }
        // Validate max reconnect attempts
        if (config.maxReconnectAttempts !== undefined && config.maxReconnectAttempts < 0) {
            errors.push('maxReconnectAttempts must be non-negative');
        }
        // Validate log level
        if (config.logLevel !== undefined &&
            !['error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
            errors.push('logLevel must be one of: error, warn, info, debug');
        }
        return errors;
    }
}
Config.defaults = {
    // Connection settings
    apiEndpoint: undefined,
    websocketEndpoint: undefined,
    // Authentication
    apiKey: undefined,
    apiSecret: undefined,
    verifyToken: undefined,
    // Session management
    sessionStorage: undefined,
    sessionPath: undefined,
    // Behavior
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: Infinity,
    // Logging
    logger: undefined,
    logLevel: 'info',
    // Multi-tenant
    tenantId: undefined,
    // OM AI Integration (optional)
    omApiEndpoint: undefined,
    omApiToken: undefined
};
