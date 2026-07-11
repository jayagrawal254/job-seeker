/**
 * Mail routes — /api/mail and /api/templates endpoints.
 */
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const mailCtrl = require('../controllers/mail.controller');

// Templates
router.get('/templates', mailCtrl.getTemplates);

// Queue mail for all active recruiters of a company
router.post('/mail/company/:companyId/active', asyncHandler(mailCtrl.mailCompanyActive));

// Bulk queue for top-N per company (home-page bulk send)
router.post('/mail/companies/top-active', asyncHandler(mailCtrl.mailCompaniesTopActive));

// Queue mail for specific recruiters
router.post('/mail/recruiters', asyncHandler(mailCtrl.mailRecruiters));

// Send a one-off test email immediately (does NOT queue / touch mail_log)
router.post('/mail/test', asyncHandler(mailCtrl.sendTestMail));

// Mail logs (flat paginated)
router.get('/mail/logs', asyncHandler(mailCtrl.getMailLogs));

// Mail logs grouped: company -> recruiters -> mails tree
router.get('/mail/logs/grouped', asyncHandler(mailCtrl.getMailLogsGrouped));

// KPIs + daily breakdown for the mail dashboard
router.get('/mail/stats', asyncHandler(mailCtrl.getMailStats));

module.exports = router;
