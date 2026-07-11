/**
 * Company controller — handles HTTP request/response for company endpoints.
 *
 * Parses request params, calls the service, sends the response.
 * Throws errors that the centralized errorHandler middleware catches.
 */
const companyService = require('../services/company.service');
const { NotFoundError } = require('../utils/errors');

async function listCompanies(req, res) {
    res.json(await companyService.listCompanies(req.query));
}

async function searchCompanies(req, res) {
    res.json(await companyService.searchCompanies(req.params.term));
}

async function getCompany(req, res) {
    const company = await companyService.getCompany(req.params.companyId);
    if (!company) throw new NotFoundError('Company', req.params.companyId);
    res.json(company);
}

module.exports = { listCompanies, searchCompanies, getCompany };
