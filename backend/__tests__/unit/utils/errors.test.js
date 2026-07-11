const { AppError, NotFoundError, ValidationError, ConflictError, ConfigError } = require('../../../src/utils/errors');

describe('Custom Errors', () => {
    it('AppError has correct properties', () => {
        const err = new AppError('Something went wrong', 503, { reason: 'timeout' });
        expect(err.name).toBe('AppError');
        expect(err.message).toBe('Something went wrong');
        expect(err.statusCode).toBe(503);
        expect(err.details).toEqual({ reason: 'timeout' });
        expect(err).toBeInstanceOf(Error);
    });

    it('NotFoundError has 404 status code', () => {
        const err = new NotFoundError('Company', 123);
        expect(err.name).toBe('NotFoundError');
        expect(err.message).toBe('Company (123) not found');
        expect(err.statusCode).toBe(404);
    });

    it('NotFoundError formats properly without id', () => {
        const err = new NotFoundError('Route');
        expect(err.message).toBe('Route not found');
    });

    it('ValidationError has 400 status code', () => {
        const err = new ValidationError('Invalid input');
        expect(err.name).toBe('ValidationError');
        expect(err.message).toBe('Invalid input');
        expect(err.statusCode).toBe(400);
    });

    it('ConflictError has 409 status code', () => {
        const err = new ConflictError();
        expect(err.name).toBe('ConflictError');
        expect(err.message).toBe('Conflict');
        expect(err.statusCode).toBe(409);
    });

    it('ConfigError has 500 status code', () => {
        const err = new ConfigError('Missing DB config');
        expect(err.name).toBe('ConfigError');
        expect(err.message).toBe('Missing DB config');
        expect(err.statusCode).toBe(500);
    });
});
