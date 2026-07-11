/**
 * HTTP request logger middleware.
 *
 * Logs method, URL, status code, and response time for every request.
 */
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const level = status >= 400 ? 'warn' : 'info';
        logger[level](`${method} ${originalUrl} → ${status} (${duration}ms)`);
    });

    next();
}

module.exports = requestLogger;
