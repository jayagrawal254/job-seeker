/**
 * Recruiter controller — handles HTTP request/response for recruiter endpoints.
 */
const recruiterService = require('../services/recruiter.service');
const { NotFoundError } = require('../utils/errors');

async function getRecruitersByCompanyId(req, res) {
    res.json(await recruiterService.getRecruitersByCompanyId(req.params.companyId, req.query));
}

async function getRecruiter(req, res) {
    const recruiter = await recruiterService.getRecruiter(req.params.id);
    if (!recruiter) throw new NotFoundError('Recruiter', req.params.id);
    res.json(recruiter);
}

module.exports = { getRecruitersByCompanyId, getRecruiter };
