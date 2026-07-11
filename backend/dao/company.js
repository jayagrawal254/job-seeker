const db = require('../db/createconnection');

// Build WHERE clause + params from filter query params.
// Filters: search (name/organisation/domain), status (0/1), locations (csv of ids),
// experience containment (company.min/max inside [minExp, maxExp]),
// salary containment (company.minsal/maxsal inside [minSal, maxSal]).
// Containment (not overlap) — otherwise companies with wide job ranges
// (e.g. 0-20 yrs) match every filter and the list never visibly changes.
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

// Whitelist of sortable keys -> SQL expression (never interpolate raw user input)
const SORTABLE = {
    company_id: 'company_id',
    company: 'organisation',
    domain: 'domain',
    status: 'status',
    min: '`min`',
    max: '`max`',
    minsal: 'minsal',
    maxsal: 'maxsal',
    last_job_posted_date: 'last_job_posted_date',
    recruiter_count: 'recruiter_count',
    active_recruiter_count: 'active_recruiter_count',
    last_mailed_date: '(SELECT MAX(ml.created_on) FROM mail_log ml WHERE ml.company_id = company_profile.company_id)'
};

const ACTIVE_COUNT_SUBQUERY =
    '(SELECT COUNT(*) FROM recruiter_profile r WHERE r.company_id = company_profile.company_id AND r.status = 1)';
// latest date we mailed anyone at this company (badge on home page)
const LAST_MAILED_SUBQUERY =
    '(SELECT MAX(ml.created_on) FROM mail_log ml WHERE ml.company_id = company_profile.company_id)';
const MAILED_COUNT_SUBQUERY =
    '(SELECT COUNT(*) FROM mail_log ml WHERE ml.company_id = company_profile.company_id)';

async function listCompanies(q) {
    const { clause, params } = buildFilters(q);
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const sortCol = SORTABLE[q.sortBy];
    const sortDir = q.sortDir === 'asc' ? 'ASC' : 'DESC';
    const orderBy = sortCol
        ? `ORDER BY ${sortCol} ${sortDir}, company_id ASC`
        : 'ORDER BY recruiter_count DESC, company_id ASC';

    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM company_profile ${clause}`, params);
    const [rows] = await db.query(
        `SELECT company_profile.*, ${ACTIVE_COUNT_SUBQUERY} AS active_recruiter_count,
                ${LAST_MAILED_SUBQUERY} AS last_mailed_date,
                ${MAILED_COUNT_SUBQUERY} AS mailed_count
           FROM company_profile ${clause}
          ${orderBy}
          LIMIT ? OFFSET ?`,
        [...params, limit, offset]);

    return { total, page, limit, companies: rows };
}

// Autocomplete for the company/domain search box.
async function searchCompanies(term, limit = 20) {
    const like = `%${term}%`;
    const [rows] = await db.query(
        `SELECT company_id, company_name, organisation, domain, status, recruiter_count
           FROM company_profile
          WHERE company_name LIKE ? OR organisation LIKE ? OR domain LIKE ?
          ORDER BY recruiter_count DESC
          LIMIT ?`,
        [like, like, like, limit]);
    return rows;
}

async function getCompany(companyId) {
    const [rows] = await db.query(
        `SELECT company_profile.*, ${ACTIVE_COUNT_SUBQUERY} AS active_recruiter_count,
                ${LAST_MAILED_SUBQUERY} AS last_mailed_date, ${MAILED_COUNT_SUBQUERY} AS mailed_count
           FROM company_profile WHERE company_id = ?`, [companyId]);
    return rows[0] || null;
}

module.exports = { listCompanies, searchCompanies, getCompany };
