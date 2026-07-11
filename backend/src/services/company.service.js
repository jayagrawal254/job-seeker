/**
 * Company service — business logic for company operations.
 *
 * Handles filter building, pagination math, and sort validation.
 * Delegates raw data access to the company repository.
 */
const companyRepo = require('../repositories/company.repository');

/**
 * Build WHERE clause + params from filter query params.
 * Containment semantics for experience/salary (not overlap).
 */
function buildFilters(q) {
    const where = [];
    const params = [];

    if (q.search) {
        where.push('(company_name LIKE ? OR organisation LIKE ? OR domain LIKE ?)');
        const like = `%${q.search}%`;
        params.push(like, like, like);
    }
    // Default to ACTIVE companies; pass status=all to disable, status=0 for inactive.
    const status = (q.status === undefined || q.status === '') ? '1' : String(q.status);
    if (status === '0' || status === '1') {
        where.push('status = ?');
        params.push(Number(status));
    }
    if (q.lastPostedFrom) {
        where.push('last_job_posted_date >= ?');
        params.push(q.lastPostedFrom + ' 00:00:00');
    }
    if (q.lastPostedTo) {
        where.push('last_job_posted_date <= ?');
        params.push(q.lastPostedTo + ' 23:59:59');
    }
    if (q.locations) {
        const ids = String(q.locations).split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (ids.length) {
            where.push('(' + ids.map(() => 'FIND_IN_SET(?, company_location_ids)').join(' OR ') + ')');
            params.push(...ids);
        }
    }
    if (q.minExp !== undefined && q.minExp !== '') {
        where.push('`min` >= ?');
        params.push(Number(q.minExp));
    }
    if (q.maxExp !== undefined && q.maxExp !== '') {
        where.push('`max` <= ?');
        params.push(Number(q.maxExp));
    }
    if (q.minSal !== undefined && q.minSal !== '') {
        where.push('minsal >= ?');
        params.push(Number(q.minSal));
    }
    if (q.maxSal !== undefined && q.maxSal !== '') {
        where.push('maxsal <= ?');
        params.push(Number(q.maxSal));
    }

    return { clause: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

/**
 * List companies with filters, sorting, and pagination.
 */
async function listCompanies(query) {
    const { clause, params } = buildFilters(query);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const sortCol = companyRepo.SORTABLE[query.sortBy];
    const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';
    const orderBy = sortCol
        ? `ORDER BY ${sortCol} ${sortDir}, company_id ASC`
        : 'ORDER BY recruiter_count DESC, company_id ASC';

    const total = await companyRepo.countCompanies(clause, params);
    const companies = await companyRepo.findCompanies(clause, params, orderBy, limit, offset);

    return { total, page, limit, companies };
}

/**
 * Search companies for autocomplete.
 */
async function searchCompanies(term, limit = 20) {
    return companyRepo.searchByTerm(term, limit);
}

/**
 * Get a single company by ID. Returns null if not found.
 */
async function getCompany(companyId) {
    return companyRepo.findById(companyId);
}

module.exports = { listCompanies, searchCompanies, getCompany };
