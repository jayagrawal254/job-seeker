/**
 * Company repository — pure data access for the company_profile table.
 *
 * Business logic (filter building, pagination math) lives in the service layer.
 * This module only executes SQL queries and returns raw rows.
 */
const db = require('../db/connection');

// Subqueries used to enrich company listings with related data
const ACTIVE_COUNT_SUBQUERY =
    '(SELECT COUNT(*) FROM recruiter_profile r WHERE r.company_id = company_profile.company_id AND r.status = 1)';
const LAST_MAILED_SUBQUERY =
    '(SELECT MAX(ml.created_on) FROM mail_log ml WHERE ml.company_id = company_profile.company_id)';
const MAILED_COUNT_SUBQUERY =
    '(SELECT COUNT(*) FROM mail_log ml WHERE ml.company_id = company_profile.company_id)';

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

/**
 * Count companies matching the given WHERE clause.
 */
async function countCompanies(whereClause, params) {
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM company_profile ${whereClause}`, params);
    return total;
}

/**
 * Fetch a page of companies with enrichment subqueries.
 * @param {string} whereClause - SQL WHERE clause (e.g. "WHERE status = ?")
 * @param {Array} params - Bound parameters for the WHERE clause
 * @param {string} orderBy - SQL ORDER BY clause
 * @param {number} limit
 * @param {number} offset
 */
async function findCompanies(whereClause, params, orderBy, limit, offset) {
    const [rows] = await db.query(
        `SELECT company_profile.*, ${ACTIVE_COUNT_SUBQUERY} AS active_recruiter_count,
                ${LAST_MAILED_SUBQUERY} AS last_mailed_date,
                ${MAILED_COUNT_SUBQUERY} AS mailed_count
           FROM company_profile ${whereClause}
          ${orderBy}
          LIMIT ? OFFSET ?`,
        [...params, limit, offset]);
    return rows;
}

/**
 * Search companies by name, organisation, or domain for autocomplete.
 */
async function searchByTerm(term, limit = 20) {
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

/**
 * Find a single company by ID with enrichment subqueries.
 */
async function findById(companyId) {
    const [rows] = await db.query(
        `SELECT company_profile.*, ${ACTIVE_COUNT_SUBQUERY} AS active_recruiter_count,
                ${LAST_MAILED_SUBQUERY} AS last_mailed_date, ${MAILED_COUNT_SUBQUERY} AS mailed_count
           FROM company_profile WHERE company_id = ?`, [companyId]);
    return rows[0] || null;
}

module.exports = { SORTABLE, countCompanies, findCompanies, searchByTerm, findById };
