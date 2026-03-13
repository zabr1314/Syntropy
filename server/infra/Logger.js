/**
 * Observability & Tracing.
 * Logs structured events for debugging and monitoring.
 */
export class Logger {
    constructor(storage) {
        this.storage = storage;
    }

    info(module, message, metadata = {}) {
        const log = { level: 'INFO', module, message, ...metadata };
        console.log(`[${module}] ${message}`, Object.keys(metadata).length ? metadata : '');
        this.persist(log);
    }

    error(module, message, error, metadata = {}) {
        const log = { level: 'ERROR', module, message, error: error.message, ...metadata };
        console.error(`[${module}] ${message}`, error);
        this.persist(log);
    }

    async persist(log) {
        if (this.storage) {
            try {
                await this.storage.append('logs', log);
            } catch (err) {
                console.error('Logger failed to persist:', err);
            }
        }
    }
}
