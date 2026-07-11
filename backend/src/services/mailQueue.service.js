/**
 * Mail queue service — orchestration logic for queueing mails and
 * assembling log views / KPI stats.
 *
 * This is where the business logic that was previously split between
 * routes/index.js and dao/mail.js now lives.
 */
const config = require('../config');
const mailRepo = require('../repositories/mail.repository');

/**
 * Queue mails for a list of recipients. Skips recipients that already
 * have a pending entry with the same subject (double-click guard).
 *
 * @param {Array} recipients - [{ id, email, company_id, ... }]
 * @param {object} options - { subject, body, templateId?, attachment?, userId? }
 * @returns {{ queued: number, skippedAlreadyPending: number }}
 */
async function queueMails(recipients, { subject, body, templateId = null, attachment = null, userId = config.mail.userId }) {
    let queued = 0, skipped = 0;

    for (const r of recipients) {
        const isDupe = await mailRepo.findPendingDuplicate(r.id, subject);
        if (isDupe) { skipped++; continue; }

        await mailRepo.insertPending({
            userId,
            recruiterId: r.id,
            companyId: r.company_id,
            templateId,
            email: r.email,
            subject,
            content: body,
            attachment
        });
        queued++;
    }

    return { queued, skippedAlreadyPending: skipped };
}

/**
 * Flat paginated mail logs with filters.
 */
async function listLogs(query) {
    const where = [];
    const params = [];
    if (query.status) { where.push('ml.status = ?'); params.push(query.status); }
    if (query.companyId) { where.push('ml.company_id = ?'); params.push(query.companyId); }
    if (query.recruiterId) { where.push('ml.recruiter_id = ?'); params.push(query.recruiterId); }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const result = await mailRepo.findLogs(where, params, limit, offset);
    return { ...result, page, limit };
}

/**
 * Logs grouped: company -> its recruiters -> their mails. For the Mail Logs page tree.
 */
async function listLogsGrouped() {
    const rows = await mailRepo.findAllForGrouping();

    const companies = new Map();
    for (const r of rows) {
        let co = companies.get(r.company_id);
        if (!co) {
            co = {
                company_id: r.company_id, organisation: r.organisation, total: 0,
                recruiterMap: new Map()
            };
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

/**
 * KPIs + daily breakdown for the mail dashboard.
 */
async function mailStats(days = 7) {
    const byStatus = await mailRepo.getStatusCounts();
    const kpi = await mailRepo.getKpiAggregates();

    const [queuedRows, sentRows, openedRows] = await Promise.all([
        mailRepo.getDailyCounts('created_on', days),
        mailRepo.getDailyCounts('sent_on', days),
        mailRepo.getDailyCounts('opened_on', days)
    ]);

    const toMap = rows => Object.fromEntries(rows.map(r => [
        r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10), r.n
    ]));
    const q = toMap(queuedRows), s = toMap(sentRows), o = toMap(openedRows);

    // Anchor the date series to MySQL's CURDATE (server tz) so buckets align
    const todayStr = await mailRepo.getServerDate();
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

module.exports = { queueMails, listLogs, listLogsGrouped, mailStats };
