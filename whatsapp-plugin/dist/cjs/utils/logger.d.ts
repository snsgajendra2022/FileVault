/**
 * Simple logger utility for the WhatsApp plugin
 */
export declare class Logger {
    level: 'error' | 'warn' | 'info' | 'debug';
    private prefix;
    constructor(level?: 'error' | 'warn' | 'info' | 'debug', prefix?: string);
    /**
     * Set log level
     */
    setLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
    /**
     * Log error message
     */
    error(...args: any[]): void;
    /**
     * Log warning message
     */
    warn(...args: any[]): void;
    /**
     * Log info message
     */
    info(...args: any[]): void;
    /**
     * Log debug message
     */
    debug(...args: any[]): void;
    /**
     * Check if we should log at the given level
     */
    private shouldLog;
}
export declare const logger: Logger;
/**
 * Set the global logger instance
 * @param newLogger - New logger instance to use
 */
export declare function setLogger(newLogger: Logger): void;
//# sourceMappingURL=logger.d.ts.map