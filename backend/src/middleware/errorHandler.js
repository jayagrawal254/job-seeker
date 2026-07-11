/**
 * Centralized Express error handler.
 *
 * Catches all errors thrown or passed via next(err) from route handlers.
 * - AppError subclasses → respond with their statusCode + JSON body
 * - Unknown errors → 500 Internal Server Error (no stack leak in production)
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
    // Log the full error for debugging
    if (err instanceof AppError) {
        logger.warn(`${err.name}: ${err.message}`, err.details || '');
    } else {
        logger.error('Unhandled error:', err);
    }

    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const body = {
        error: err.message || 'Internal server error',
        ...(err.details ? { details: err.details } : {})
    };

    // Never leak stack traces in production
    if (process.env.NODE_ENV === 'development' && !(err instanceof AppError)) {
        body.stack = err.stack;
    }

    res.status(statusCode).json(body);
}

module.exports = errorHandler;
