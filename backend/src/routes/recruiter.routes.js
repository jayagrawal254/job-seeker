/**
 * Recruiter routes — /api/companies/:companyId/recruiters and /api/recruiters endpoints.
 */
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const recruiterCtrl = require('../controllers/recruiter.controller');

// Recruiters of a company: ?name=<search> &status=0|1|all &lastPostedFrom= &lastPostedTo=
router.get('/companies/:companyId/recruiters', asyncHandler(recruiterCtrl.getRecruitersByCompanyId));

// Single recruiter detail
router.get('/recruiters/:id', asyncHandler(recruiterCtrl.getRecruiter));

module.exports = router;
