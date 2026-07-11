/**
 * Lightweight structured logger.
 *
 * Wraps console methods with ISO-timestamp prefixes and level tags.
 * Swap this for winston/pino later without changing call sites — every
 * other module imports `const log = require('./logger')` and calls
 * `log.info(...)`, `log.error(...)`, etc.
 */

const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const logger = {
    info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
    warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
    error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
    debug: (...args) => {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(`[${timestamp()}] [DEBUG]`, ...args);
        }
    }
};

module.exports = logger;
