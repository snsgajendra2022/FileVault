"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
const logger_1 = require("../utils/logger");
/**
 * Handles WhatsApp connection status and health monitoring
 */
class StatusService {
    constructor(config, eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.lastError = null;
        this.statusCheckInterval = null;
        this.config = config;
        logger_1.logger.info('StatusService initialized');
    }
    async initialize() {
        logger_1.logger.info('StatusService initialized');
    }
    getLastError() {
        return this.lastError;
    }
    setError(error) {
        this.lastError = error;
        if (error) {
            logger_1.logger.error('Status error:', error);
            this.eventEmitter.emit('error', new Error(error));
        }
        else {
            logger_1.logger.info('Status error cleared');
        }
        this.eventEmitter.emit('status-update', this.getStatus());
    }
    getStatus() {
        return {
            lastError: this.lastError,
            timestamp: new Date(),
        };
    }
    startStatusChecks() {
        if (this.statusCheckInterval)
            return;
        const interval = this.config.statusCheckInterval ?? 30000;
        this.statusCheckInterval = setInterval(() => {
            this.performStatusCheck();
        }, interval);
        logger_1.logger.debug('Status checks started');
    }
    stopStatusChecks() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
            logger_1.logger.debug('Status checks stopped');
        }
    }
    async performStatusCheck() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (this.lastError) {
                this.setError(null);
            }
        }
        catch (error) {
            this.setError(`Status check failed: ${error.message}`);
        }
    }
    cleanup() {
        this.stopStatusChecks();
    }
}
exports.StatusService = StatusService;
//# sourceMappingURL=StatusService.js.map