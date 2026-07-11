/**
 * Custom error classes for structured error handling.
 *
 * All application errors extend AppError so the centralized error handler
 * can distinguish expected errors (validation, not-found) from unexpected
 * crashes and respond with the right HTTP status + JSON body.
 */

class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource', id = '') {
        super(`${resource}${id ? ` (${id})` : ''} not found`, 404);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, details);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}

class ConfigError extends AppError {
    constructor(message = 'Configuration error') {
        super(message, 500);
    }
}

module.exports = { AppError, NotFoundError, ValidationError, ConflictError, ConfigError };
