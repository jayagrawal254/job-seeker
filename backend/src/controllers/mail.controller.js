/**
 * Mail controller — handles HTTP request/response for mail endpoints.
 *
 * Business orchestration (queueing, bulk sends) is delegated to the
 * mailQueue service. This controller only handles HTTP concerns.
 */
const companyService = require('../services/company.service');
const recruiterService = require('../services/recruiter.service');
const mailQueueService = require('../services/mailQueue.service');
const mailService = require('../services/mail.service');
const templateService = require('../services/template.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * GET /templates — list mail templates.
 */
function getTemplates(req, res) {
    res.json(templateService.getTemplates());
}

/**
 * POST /mail/company/:companyId/active — queue mail for ALL active recruiters.
 */
async function mailCompanyActive(req, res) {
    const { subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) throw new ValidationError('subject and body are required');

    const company = await companyService.getCompany(req.params.companyId);
    if (!company) throw new NotFoundError('Company', req.params.companyId);

    const recipients = await recruiterService.getActiveRecruitersByCompanyId(req.params.companyId);
    if (!recipients.length) throw new ValidationError('no active recruiters with emails in this company');

    const result = await mailQueueService.queueMails(
        recipients.map(r => ({ ...r, company_id: company.company_id })),
        { subject, body, templateId, attachment: attachment || null });

    res.json({ company_id: company.company_id, ...result });
}

/**
 * POST /mail/companies/top-active — bulk queue for top-N per company.
 */
async function mailCompaniesTopActive(req, res) {
    const { companyIds, topN = 5, subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) throw new ValidationError('subject and body are required');
    if (!Array.isArray(companyIds) || !companyIds.length) {
        throw new ValidationError('companyIds must be a non-empty array');
    }

    const n = Math.min(50, Math.max(1, parseInt(topN, 10) || 5));
    let totalQueued = 0, totalSkipped = 0, companiesWithRecruiters = 0;

    for (const companyId of companyIds) {
        const recipients = await recruiterService.getTopActiveRecruitersByCompanyId(companyId, n);
        if (!recipients.length) continue;
        companiesWithRecruiters++;
        const r = await mailQueueService.queueMails(recipients,
            { subject, body, templateId, attachment: attachment || null });
        totalQueued += r.queued;
        totalSkipped += r.skippedAlreadyPending;
    }

    res.json({
        companies: companyIds.length, companiesWithRecruiters,
        topNPerCompany: n, queued: totalQueued, skippedAlreadyPending: totalSkipped
    });
}

/**
 * POST /mail/recruiters — queue mail for specific recruiters.
 */
async function mailRecruiters(req, res) {
    const { recruiterIds, subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) throw new ValidationError('subject and body are required');
    if (!Array.isArray(recruiterIds) || !recruiterIds.length) {
        throw new ValidationError('recruiterIds must be a non-empty array');
    }

    const recipients = await recruiterService.getRecruitersByIds(recruiterIds);
    if (!recipients.length) throw new ValidationError('no recruiters with emails found for given ids');

    res.json(await mailQueueService.queueMails(recipients, { subject, body, templateId, attachment: attachment || null }));
}

/**
 * POST /mail/test — send one test email immediately.
 */
async function sendTestMail(req, res) {
    const { to, subject, body, attachment } = req.body || {};
    if (!to || !subject || !body) throw new ValidationError('to, subject and body are required');

    const result = await mailService.sendMailNow({ to, subject, html: body, attachment: attachment || null });
    res.json(result);
}

/**
 * GET /mail/logs — flat paginated mail logs.
 */
async function getMailLogs(req, res) {
    res.json(await mailQueueService.listLogs(req.query));
}

/**
 * GET /mail/logs/grouped — company -> recruiters -> mails tree.
 */
async function getMailLogsGrouped(req, res) {
    res.json(await mailQueueService.listLogsGrouped());
}

/**
 * GET /mail/stats — KPIs + daily breakdown.
 */
async function getMailStats(req, res) {
    res.json(await mailQueueService.mailStats(parseInt(req.query.days, 10) || 7));
}

module.exports = {
    getTemplates,
    mailCompanyActive,
    mailCompaniesTopActive,
    mailRecruiters,
    sendTestMail,
    getMailLogs,
    getMailLogsGrouped,
    getMailStats
};
