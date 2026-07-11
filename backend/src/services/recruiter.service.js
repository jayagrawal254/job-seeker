/**
 * Recruiter service — business logic for recruiter operations.
 *
 * Thin wrapper over the repository for now, but provides the right
 * abstraction point for future business rules.
 */
const recruiterRepo = require('../repositories/recruiter.repository');

async function getRecruitersByCompanyId(companyId, filters) {
    return recruiterRepo.findByCompanyId(companyId, filters);
}

async function getTopActiveRecruitersByCompanyId(companyId, n) {
    return recruiterRepo.findTopActiveByCompanyId(companyId, n);
}

async function getActiveRecruitersByCompanyId(companyId) {
    return recruiterRepo.findActiveByCompanyId(companyId);
}

async function getRecruitersByIds(ids) {
    return recruiterRepo.findByIds(ids);
}

async function getRecruiter(id) {
    return recruiterRepo.findById(id);
}

module.exports = {
    getRecruitersByCompanyId,
    getTopActiveRecruitersByCompanyId,
    getActiveRecruitersByCompanyId,
    getRecruitersByIds,
    getRecruiter
};
