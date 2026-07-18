/**
 * Mail repository — pure data access for the mail_log table.
 *
 * Only raw CRUD operations. Business aggregation (grouped views, KPI
 * computation) lives in the service layer.
 */
const db = require('../db/connection');

/**
 * Check if a pending mail already exists for this recruiter + subject.
 */
async function findPendingDuplicate(recruiterId, subject) {
    const [rows] = await db.query(
        `SELECT id FROM mail_log WHERE recruiter_id = ? AND subject = ? AND status = 'pending' LIMIT 1`,
        [recruiterId, subject]);
    return rows.length > 0;
}

/**
 * Insert a new pending mail entry.
 */
async function insertPending({ userId, recruiterId, companyId, templateId, email, subject, content, attachment }) {
    await db.query(
        `INSERT INTO mail_log (user_id, recruiter_id, company_id, template_id, email, subject, content, attachment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, recruiterId, companyId, templateId, email, subject, content, attachment]);
}

/**
 * Fetch pending mails up to a limit, ordered by ID.
 */
async function findPending(limit) {
    const [rows] = await db.query(
        `SELECT * FROM mail_log WHERE status = 'pending' ORDER BY id ASC LIMIT ?`, [limit]);
    return rows;
}

async function markSent(id, messageId = null) {
    await db.query(
        `UPDATE mail_log SET status = 'sent', sent_on = datetime('now'), error = NULL, message_id = ? WHERE id = ?`,
        [messageId, id]);
}

async function markFailed(id, error) {
    await db.query(`UPDATE mail_log SET status = 'failed', error = ? WHERE id = ?`,
        [String(error).slice(0, 500), id]);
}

async function markBounced(id, error) {
    await db.query(`UPDATE mail_log SET status = 'bounced', error = ? WHERE id = ?`,
        [String(error).slice(0, 500), id]);
}

/**
 * Mark as opened — only forward transitions (sent -> opened).
 */
async function markOpened(id) {
    await db.query(
        `UPDATE mail_log SET status = 'opened', opened_on = COALESCE(opened_on, datetime('now'))
          WHERE id = ? AND status IN ('sent', 'opened')`, [id]);
}

async function markOpenedByMessageId(messageId, when) {
    const [res] = await db.query(
        `UPDATE mail_log SET status = 'opened', opened_on = COALESCE(opened_on, ?)
          WHERE message_id = ? AND status IN ('sent', 'opened')`, [when, messageId]);
    // mysql2 returns affectedRows; better-sqlite3 shim returns RunResult with changes
    return res.affectedRows ?? res.changes ?? 0;
}

async function markBouncedByMessageId(messageId, reason) {
    const [res] = await db.query(
        `UPDATE mail_log SET status = 'bounced', error = ?
          WHERE message_id = ? AND status IN ('sent')`, [String(reason).slice(0, 500), messageId]);
    return res.affectedRows ?? res.changes ?? 0;
}

/**
 * Flat paginated mail logs with recruiter/company joins.
 */
async function findLogs(where, params, limit, offset) {
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM mail_log ml ${clause}`, params);
    const [rows] = await db.query(
        `SELECT ml.id, ml.recruiter_id, ml.company_id, ml.email, ml.subject, ml.status, ml.error,
                ml.created_on, ml.sent_on, ml.opened_on,
                rp.recname, cp.organisation
           FROM mail_log ml
           LEFT JOIN recruiter_profile rp ON rp.id = ml.recruiter_id
           LEFT JOIN company_profile cp ON cp.company_id = ml.company_id
          ${clause}
          ORDER BY ml.id DESC
          LIMIT ? OFFSET ?`,
        [...params, limit, offset]);

    const [statusCounts] = await db.query(
        'SELECT status, COUNT(*) AS n FROM mail_log GROUP BY status');

    return { total, logs: rows, statusCounts };
}

/**
 * All mail logs with recruiter/company joins, ordered for grouping.
 */
async function findAllForGrouping() {
    const [rows] = await db.query(
        `SELECT ml.id, ml.recruiter_id, ml.company_id, ml.email, ml.subject, ml.status, ml.error,
                ml.created_on, ml.sent_on, ml.opened_on, ml.attachment,
                rp.recname, cp.organisation
           FROM mail_log ml
           LEFT JOIN recruiter_profile rp ON rp.id = ml.recruiter_id
           LEFT JOIN company_profile cp ON cp.company_id = ml.company_id
          ORDER BY ml.company_id ASC, ml.recruiter_id ASC, ml.id DESC`);
    return rows;
}

/**
 * Aggregate status counts.
 */
async function getStatusCounts() {
    const [rows] = await db.query('SELECT status, COUNT(*) AS n FROM mail_log GROUP BY status');
    return Object.fromEntries(rows.map(r => [r.status, r.n]));
}

/**
 * KPI aggregates.
 */
async function getKpiAggregates() {
    const today = new Date().toISOString().slice(0, 10);
    const sevenAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const [[kpi]] = await db.query(
        `SELECT
            COUNT(*) AS total,
            SUM(sent_on IS NOT NULL) AS delivered,
            SUM(opened_on IS NOT NULL) AS opened,
            SUM(DATE(sent_on) = ?) AS sentToday,
            SUM(sent_on >= ?) AS sentLast7,
            SUM(DATE(created_on) = ?) AS queuedToday,
            SUM(created_on >= ?) AS queuedLast7
         FROM mail_log`,
        [today, sevenAgo, today, sevenAgo]);
    return kpi;
}

/**
 * Daily counts for a given date column.
 */
async function getDailyCounts(column, days) {
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const [rows] = await db.query(
        `SELECT DATE(${column}) AS d, COUNT(*) AS n FROM mail_log
          WHERE ${column} >= ? GROUP BY DATE(${column})`, [since]);
    return rows;
}

/**
 * Get the current date from MySQL (for timezone-consistent daily breakdowns).
 */
async function getServerDate() {
    return new Date().toISOString().slice(0, 10);
}

module.exports = {
    findPendingDuplicate,
    insertPending,
    findPending,
    markSent,
    markFailed,
    markBounced,
    markOpened,
    markOpenedByMessageId,
    markBouncedByMessageId,
    findLogs,
    findAllForGrouping,
    getStatusCounts,
    getKpiAggregates,
    getDailyCounts,
    getServerDate
};
