const request = require('supertest');
const app = require('../../../src/app');
const companyRepo = require('../../../src/repositories/company.repository');
const db = require('../../../src/db/connection');

jest.mock('../../../src/repositories/company.repository');
jest.mock('../../../src/utils/logger'); // Silence request logger during tests

describe('Company Routes', () => {
    afterAll(async () => {
        // End the DB pool so Jest exits cleanly, even though we mocked the repo,
        // app.js still imports routes which imports controllers which may trigger DB pool init.
        await db.end();
    });

    describe('GET /api/companies', () => {
        it('returns paginated companies', async () => {
            const mockCompanies = [
                { company_id: 1, organisation: 'Test Org' },
                { company_id: 2, organisation: 'Another Org' }
            ];
            
            companyRepo.countCompanies.mockResolvedValue(2);
            companyRepo.findCompanies.mockResolvedValue(mockCompanies);

            const res = await request(app).get('/api/companies?page=1&limit=20');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                total: 2,
                page: 1,
                limit: 20,
                companies: mockCompanies
            });
            
            expect(companyRepo.countCompanies).toHaveBeenCalled();
            expect(companyRepo.findCompanies).toHaveBeenCalled();
        });
    });

    describe('GET /api/companies/search/:term', () => {
        it('returns search autocomplete results', async () => {
            const mockResults = [
                { company_id: 1, organisation: 'Test Org' }
            ];
            
            companyRepo.searchByTerm.mockResolvedValue(mockResults);

            const res = await request(app).get('/api/companies/search/Test');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResults);
            expect(companyRepo.searchByTerm).toHaveBeenCalledWith('Test', 20);
        });
    });

    describe('GET /api/companies/:companyId', () => {
        it('returns a single company', async () => {
            const mockCompany = { company_id: 1, organisation: 'Test Org' };
            companyRepo.findById.mockResolvedValue(mockCompany);

            const res = await request(app).get('/api/companies/1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCompany);
            expect(companyRepo.findById).toHaveBeenCalledWith('1');
        });

        it('returns 404 if company not found', async () => {
            companyRepo.findById.mockResolvedValue(null);

            const res = await request(app).get('/api/companies/999');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Company (999) not found');
        });
    });
});
