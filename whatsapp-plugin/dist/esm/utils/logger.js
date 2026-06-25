/**
 * Simple logger utility for the WhatsApp plugin
 */
export class Logger {
    constructor(level = 'info', prefix = '[WhatsAppPlugin]') {
        this.level = 'info';
        this.prefix = '[WhatsAppPlugin]';
        this.level = level;
        this.prefix = prefix;
    }
    /**
     * Set log level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Log error message
     */
    error(...args) {
        if (this.shouldLog('error')) {
            console.error(this.prefix, 'ERROR:', ...args);
        }
    }
    /**
     * Log warning message
     */
    warn(...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.prefix, 'WARN:', ...args);
        }
    }
    /**
     * Log info message
     */
    info(...args) {
        if (this.shouldLog('info')) {
            console.info(this.prefix, 'INFO:', ...args);
        }
    }
    /**
     * Log debug message
     */
    debug(...args) {
        if (this.shouldLog('debug')) {
            console.debug(this.prefix, 'DEBUG:', ...args);
        }
    }
    /**
     * Check if we should log at the given level
     */
    shouldLog(level) {
        const levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        return levels[level] <= levels[this.level];
    }
}
// Default logger instance
export const logger = new Logger();
/**
 * Set the global logger instance
 * @param newLogger - New logger instance to use
 */
export function setLogger(newLogger) {
    // In a more sophisticated implementation, we might update all services
    // For now, we just replace the global instance
    // Note: This is a simplified approach - in production you might want
    // to use dependency injection or a logger provider pattern
    logger.setLevel(newLogger.level);
}
