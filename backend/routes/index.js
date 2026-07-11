const express = require('express');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const companyDao = require('../dao/company');
const recruiterDao = require('../dao/recruiter');
const mailDao = require('../dao/mail');
const resumeDao = require('../dao/resume');
const mailService = require('../services/mail');
const { locations } = require('../global/locations');

// Resume uploads -> data/resumes, original name kept (sanitised), .pdf/.doc/.docx only.
resumeDao.ensureDir();
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, resumeDao.DIR),
        filename: (req, file, cb) => cb(null, path.basename(file.originalname).replace(/[^\w.() -]/g, '_'))
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.(pdf|docx?|)$/i.test(file.originalname))
});

const wrap = fn => (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
});

router.get('/healthz', (req, res) => res.json({ ok: true }));

// Hardcoded location list (from recruiter-admin src/models/location.js)
router.get('/locations', (req, res) => res.json(locations));

// Companies list with filters:
// ?search= &status= &locations=3,37 &minExp= &maxExp= &minSal= &maxSal=
// &lastPostedFrom= &lastPostedTo= &sortBy= &sortDir= &page= &limit=
router.get('/companies', wrap(async (req, res) => {
    res.json(await companyDao.listCompanies(req.query));
}));

// Autocomplete for company/domain search box
router.get('/companies/search/:term', wrap(async (req, res) => {
    res.json(await companyDao.searchCompanies(req.params.term));
}));

router.get('/companies/:companyId', wrap(async (req, res) => {
    const company = await companyDao.getCompany(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'company not found' });
    res.json(company);
}));

// Recruiters of a company: ?name=<search> &status=0|1|all &lastPostedFrom= &lastPostedTo=
router.get('/companies/:companyId/recruiters', wrap(async (req, res) => {
    res.json(await recruiterDao.getRecruitersByCompanyId(req.params.companyId, req.query));
}));

router.get('/recruiters/:id', wrap(async (req, res) => {
    const recruiter = await recruiterDao.getRecruiter(req.params.id);
    if (!recruiter) return res.status(404).json({ error: 'recruiter not found' });
    res.json(recruiter);
}));

// ---- mail templates (read from global/templates.json — edit that file to customise)
router.get('/templates', (req, res) => res.json(mailDao.getTemplates()));

// ---- resumes (saved attachments)
router.get('/resumes', (req, res) => res.json(resumeDao.listResumes()));
router.post('/resumes', upload.single('resume'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded (field name must be "resume", pdf/doc/docx)' });
    res.json({ filename: req.file.filename });
});

// ---- mail queueing (nothing is sent here — run scripts/sendPendingMails.js to send)

// 1) Queue mail for ALL ACTIVE recruiters of the selected company.
//    body: { subject, body, templateId? }
router.post('/mail/company/:companyId/active', wrap(async (req, res) => {
    const { subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });
    const company = await companyDao.getCompany(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'company not found' });
    const recipients = await recruiterDao.getActiveRecruitersByCompanyId(req.params.companyId);
    if (!recipients.length) return res.status(400).json({ error: 'no active recruiters with emails in this company' });
    const result = await mailDao.queueMails(
        recipients.map(r => ({ ...r, company_id: company.company_id })),
        { subject, body, templateId, attachment: attachment || null });
    res.json({ company_id: company.company_id, ...result });
}));

// 1b) Queue mail for the top-N most recently active recruiters of EACH selected company
//     (home-page bulk send). body: { companyIds: [..], topN?, subject, body, templateId?, attachment? }
router.post('/mail/companies/top-active', wrap(async (req, res) => {
    const { companyIds, topN = 5, subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });
    if (!Array.isArray(companyIds) || !companyIds.length) {
        return res.status(400).json({ error: 'companyIds must be a non-empty array' });
    }
    const n = Math.min(50, Math.max(1, parseInt(topN, 10) || 5));
    let totalQueued = 0, totalSkipped = 0, companiesWithRecruiters = 0;
    for (const companyId of companyIds) {
        const recipients = await recruiterDao.getTopActiveRecruitersByCompanyId(companyId, n);
        if (!recipients.length) continue;
        companiesWithRecruiters++;
        const r = await mailDao.queueMails(recipients,
            { subject, body, templateId, attachment: attachment || null });
        totalQueued += r.queued;
        totalSkipped += r.skippedAlreadyPending;
    }
    res.json({ companies: companyIds.length, companiesWithRecruiters,
        topNPerCompany: n, queued: totalQueued, skippedAlreadyPending: totalSkipped });
}));

// 2) Queue mail for specific recruiters (selected in the UI).
//    body: { recruiterIds: [..], subject, body, templateId? }
router.post('/mail/recruiters', wrap(async (req, res) => {
    const { recruiterIds, subject, body, templateId, attachment } = req.body || {};
    if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });
    if (!Array.isArray(recruiterIds) || !recruiterIds.length) {
        return res.status(400).json({ error: 'recruiterIds must be a non-empty array' });
    }
    const recipients = await recruiterDao.getRecruitersByIds(recruiterIds);
    if (!recipients.length) return res.status(400).json({ error: 'no recruiters with emails found for given ids' });
    res.json(await mailDao.queueMails(recipients, { subject, body, templateId, attachment: attachment || null }));
}));

// Send a one-off test email immediately (does NOT queue / touch mail_log).
// body: { to, subject, body, attachResume? (default true) }
router.post('/mail/test', wrap(async (req, res) => {
    const { to, subject, body, attachment } = req.body || {};
    if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject and body are required' });
    const result = await mailService.sendMailNow({ to, subject, html: body, attachment: attachment || null });
    res.json(result);
}));

// ---- mail log / tracking
router.get('/mail/logs', wrap(async (req, res) => {
    res.json(await mailDao.listLogs(req.query));
}));

// grouped: company -> recruiters -> mails
router.get('/mail/logs/grouped', wrap(async (req, res) => {
    res.json(await mailDao.listLogsGrouped());
}));

// KPIs + daily breakdown for the mail dashboard
router.get('/mail/stats', wrap(async (req, res) => {
    res.json(await mailDao.mailStats(parseInt(req.query.days, 10) || 7));
}));

// Open-tracking pixel (1x1 transparent gif) embedded by the send script.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
router.get('/track/open/:id.gif', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id) mailDao.markOpened(id).catch(err => console.error('track/open:', err.message));
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
    res.end(PIXEL);
});

module.exports = router;
