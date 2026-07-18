/**
 * Recruiter repository — pure data access for the recruiter_profile table.
 */
const db = require('../db/connection');

/**
 * Find recruiters of a company with optional filters.
 * @param {number} companyId
 * @param {object} filters - { name, status, lastPostedFrom, lastPostedTo }
 */
async function findByCompanyId(companyId, { name, status, lastPostedFrom, lastPostedTo } = {}) {
    const where = ['company_id = ?'];
    const params = [companyId];

    if (name) {
        where.push('(recname LIKE ? OR email LIKE ?)');
        params.push(`%${name}%`, `%${name}%`);
    }
    const st = (status === undefined || status === '') ? '1' : String(status);
    if (st === '0' || st === '1') {
        where.push('status = ?');
        params.push(Number(st));
    }
    if (lastPostedFrom) {
        where.push('last_job_posted_date >= ?');
        params.push(lastPostedFrom + ' 00:00:00');
    }
    if (lastPostedTo) {
        where.push('last_job_posted_date <= ?');
        params.push(lastPostedTo + ' 23:59:59');
    }

    const [rows] = await db.query(
        `SELECT rp.*,
                (SELECT MAX(ml.created_on) FROM mail_log ml WHERE ml.recruiter_id = rp.id) AS last_mailed_date,
                (SELECT COUNT(*) FROM mail_log ml WHERE ml.recruiter_id = rp.id) AS mailed_count
           FROM recruiter_profile rp WHERE ${where.join(' AND ')}
          ORDER BY rp.status DESC, rp.id ASC`, params);
    return rows;
}

/**
 * Top-N most recently active recruiters of a company (status=1, latest job first).
 */
async function findTopActiveByCompanyId(companyId, n = 5) {
    const [rows] = await db.query(
        `SELECT id, recname, email, company_id FROM recruiter_profile
          WHERE company_id = ? AND status = 1 AND email IS NOT NULL AND email != ''
          ORDER BY last_job_posted_date DESC, id ASC
          LIMIT ?`, [companyId, n]);
    return rows;
}

/**
 * All active recruiters of a company with valid emails.
 */
async function findActiveByCompanyId(companyId) {
    const [rows] = await db.query(
        `SELECT id, recname, email, company_id FROM recruiter_profile
          WHERE company_id = ? AND status = 1 AND email IS NOT NULL AND email != ''`,
        [companyId]);
    return rows;
}

/**
 * Find recruiters by a list of IDs (only those with valid emails).
 */
async function findByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await db.query(
        `SELECT id, recname, email, company_id FROM recruiter_profile
          WHERE id IN (${placeholders}) AND email IS NOT NULL AND email != ''`, ids);
    return rows;
}

/**
 * Find a single recruiter by ID.
 */
async function findById(id) {
    const [rows] = await db.query('SELECT * FROM recruiter_profile WHERE id = ?', [id]);
    return rows[0] || null;
}

/**
 * Fetch recruiter name + organisation for mail personalisation.
 */
async function findPersonalisationData(recruiterId) {
    const [rows] = await db.query(
        'SELECT recname, organisation FROM recruiter_profile WHERE id = ?', [recruiterId]);
    return rows[0] || null;
}

module.exports = {
    findByCompanyId,
    findTopActiveByCompanyId,
    findActiveByCompanyId,
    findByIds,
    findById,
    findPersonalisationData
};
