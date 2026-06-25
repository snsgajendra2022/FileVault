import type { WhatsAppPluginConfig } from '../types';
/**
 * Configuration management for WhatsApp plugin
 */
export declare class Config {
    private static defaults;
    /**
     * Merge user config with defaults and environment variables
     * @param userConfig - User provided configuration
     * @returns Merged configuration
     */
    static merge(userConfig?: WhatsAppPluginConfig): WhatsAppPluginConfig;
    /**
     * Load configuration from environment variables
     * @returns Configuration object from environment
     */
    private static loadFromEnvironment;
    /**
     * Get default configuration
     * @returns Default configuration object
     */
    static getDefaults(): WhatsAppPluginConfig;
    /**
     * Validate configuration
     * @param config - Configuration to validate
     * @returns Array of validation errors (empty if valid)
     */
    static validate(config: WhatsAppPluginConfig): string[];
}
//# sourceMappingURL=Config.d.ts.map