const path = require('path');
const db = require('../db/createconnection');
const config = require('../config/config');

// ---- templates: read from global/templates.json (edit that file to customise).
// Re-read on each call so edits show up without a server restart.
const TEMPLATES_PATH = path.join(__dirname, '..', 'global', 'templates.json');
function getTemplates() {
    delete require.cache[require.resolve(TEMPLATES_PATH)];
    return require(TEMPLATES_PATH);
}

// ---- queueing: "send" from the UI only inserts pending rows; the send script mails them.
// Skips recipients that already have a pending entry with the same subject (double-click guard).
async function queueMails(recipients,
    { subject, body, templateId = null, attachment = null, userId = config.mail.userId }) {
    let queued = 0, skipped = 0;
    for (const r of recipients) {
        const [dupe] = await db.query(
            `SELECT id FROM mail_log WHERE recruiter_id = ? AND subject = ? AND status = 'pending' LIMIT 1`,
            [r.id, subject]);
        if (dupe.length) { skipped++; continue; }
        await db.query(
            `INSERT INTO mail_log (user_id, recruiter_id, company_id, template_id, email, subject, content, attachment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, r.id, r.company_id, templateId, r.email, subject, body, attachment]);
        queued++;
    }
    return { queued, skippedAlreadyPending: skipped };
}

// ---- send-script helpers
async function getPendingMails(limit) {
    const [rows] = await db.query(
        `SELECT * FROM mail_log WHERE status = 'pending' ORDER BY id ASC LIMIT ?`, [limit]);
    return rows;
}

async function markSent(id, messageId = null) {
    await db.query(
        `UPDATE mail_log SET status = 'sent', sent_on = NOW(), error = NULL, message_id = ? WHERE id = ?`,
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

// tracking pixel hit — only forward transitions (sent -> opened)
async function markOpened(id) {
    await db.query(
        `UPDATE mail_log SET status = 'opened', opened_on = IFNULL(opened_on, NOW())
          WHERE id = ? AND status IN ('sent', 'opened')`, [id]);
}

// ---- log listing for the UI
async function listLogs(q) {
    const where = [];
    const params = [];
    if (q.status) { where.push('ml.status = ?'); params.push(q.status); }
    if (q.companyId) { where.push('ml.company_id = ?'); params.push(q.companyId); }
    if (q.recruiterId) { where.push('ml.recruiter_id = ?'); params.push(q.recruiterId); }
    const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));

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
        [...params, limit, (page - 1) * limit]);

    const [statusCounts] = await db.query(
        'SELECT status, COUNT(*) AS n FROM mail_log GROUP BY status');

    return { total, page, limit, logs: rows, statusCounts };
}

// event sync (Brevo): match by provider message id; only forward transitions
async function markOpenedByMessageId(messageId, when) {
    const [res] = await db.query(
        `UPDATE mail_log SET status = 'opened', opened_on = IFNULL(opened_on, ?)
          WHERE message_id = ? AND status IN ('sent', 'opened')`, [when, messageId]);
    return res.affectedRows;
}

async function markBouncedByMessageId(messageId, reason) {
    const [res] = await db.query(
        `UPDATE mail_log SET status = 'bounced', error = ?
          WHERE message_id = ? AND status IN ('sent')`, [String(reason).slice(0, 500), messageId]);
    return res.affectedRows;
}

// Logs grouped: company -> its recruiters -> their mails. For the Mail Logs page tree.
async function listLogsGrouped() {
    const [rows] = await db.query(
        `SELECT ml.id, ml.recruiter_id, ml.company_id, ml.email, ml.subject, ml.status, ml.error,
                ml.created_on, ml.sent_on, ml.opened_on, ml.attachment,
                rp.recname, cp.organisation
           FROM mail_log ml
           LEFT JOIN recruiter_profile rp ON rp.id = ml.recruiter_id
           LEFT JOIN company_profile cp ON cp.company_id = ml.company_id
          ORDER BY ml.company_id ASC, ml.recruiter_id ASC, ml.id DESC`);

    const companies = new Map();
    for (const r of rows) {
        let co = companies.get(r.company_id);
        if (!co) {
            co = { company_id: r.company_id, organisation: r.organisation, total: 0,
                recruiterMap: new Map() };
            companies.set(r.company_id, co);
        }
        co.total++;
        let rec = co.recruiterMap.get(r.recruiter_id);
        if (!rec) {
            rec = { recruiter_id: r.recruiter_id, recname: r.recname, email: r.email, mails: [] };
            co.recruiterMap.set(r.recruiter_id, rec);
        }
        rec.mails.push({
            id: r.id, subject: r.subject, status: r.status, error: r.error, attachment: r.attachment,
            created_on: r.created_on, sent_on: r.sent_on, opened_on: r.opened_on
        });
    }
    return [...companies.values()].map(co => ({
        company_id: co.company_id, organisation: co.organisation, total: co.total,
        recruiters: [...co.recruiterMap.values()]
    }));
}

// KPIs + daily breakdown for the mail dashboard.
async function mailStats(days = 7) {
    const [statusRows] = await db.query('SELECT status, COUNT(*) AS n FROM mail_log GROUP BY status');
    const byStatus = Object.fromEntries(statusRows.map(r => [r.status, r.n]));

    const [[kpi]] = await db.query(
        `SELECT
            COUNT(*) AS total,
            SUM(sent_on IS NOT NULL) AS delivered,
            SUM(opened_on IS NOT NULL) AS opened,
            SUM(DATE(sent_on) = CURDATE()) AS sentToday,
            SUM(sent_on >= CURDATE() - INTERVAL 6 DAY) AS sentLast7,
            SUM(DATE(created_on) = CURDATE()) AS queuedToday,
            SUM(created_on >= CURDATE() - INTERVAL 6 DAY) AS queuedLast7
         FROM mail_log`);

    // daily counts keyed by date for queued / sent / opened
    const dailyQuery = (col) => db.query(
        `SELECT DATE(${col}) AS d, COUNT(*) AS n FROM mail_log
          WHERE ${col} >= CURDATE() - INTERVAL ? DAY GROUP BY DATE(${col})`, [days - 1]);
    const [[queuedRows], [sentRows], [openedRows]] = await Promise.all([
        dailyQuery('created_on'), dailyQuery('sent_on'), dailyQuery('opened_on')
    ]);
    const toMap = rows => Object.fromEntries(rows.map(r => [r.d instanceof Date
        ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10), r.n]));
    const q = toMap(queuedRows), s = toMap(sentRows), o = toMap(openedRows);

    // Anchor the date series to MySQL's CURDATE (server tz) so buckets align with the
    // DATE() groupings above — a JS new Date() could be a day off.
    const [[{ today }]] = await db.query('SELECT CURDATE() AS today');
    const todayStr = today instanceof Date ? today.toISOString().slice(0, 10) : String(today).slice(0, 10);
    const base = new Date(todayStr + 'T00:00:00Z');
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setUTCDate(base.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        daily.push({ date: key, queued: q[key] || 0, sent: s[key] || 0, opened: o[key] || 0 });
    }

    const delivered = Number(kpi.delivered) || 0;
    const opened = Number(kpi.opened) || 0;
    const bounced = byStatus.bounced || 0;
    return {
        total: Number(kpi.total) || 0,
        byStatus,
        delivered,
        opened,
        openRate: delivered ? Math.round((opened / delivered) * 100) : 0,
        bounceRate: (delivered + bounced) ? Math.round((bounced / (delivered + bounced)) * 100) : 0,
        sentToday: Number(kpi.sentToday) || 0,
        sentLast7: Number(kpi.sentLast7) || 0,
        queuedToday: Number(kpi.queuedToday) || 0,
        queuedLast7: Number(kpi.queuedLast7) || 0,
        daily
    };
}

module.exports = {
    getTemplates, queueMails,
    getPendingMails, markSent, markFailed, markBounced, markOpened, listLogs, listLogsGrouped,
    markOpenedByMessageId, markBouncedByMessageId, mailStats
};
