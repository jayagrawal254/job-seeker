/**
 * Company routes — /api/companies endpoints.
 */
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const companyCtrl = require('../controllers/company.controller');

// Companies list with filters:
// ?search= &status= &locations=3,37 &minExp= &maxExp= &minSal= &maxSal=
// &lastPostedFrom= &lastPostedTo= &sortBy= &sortDir= &page= &limit=
router.get('/', asyncHandler(companyCtrl.listCompanies));

// Autocomplete for company/domain search box
router.get('/search/:term', asyncHandler(companyCtrl.searchCompanies));

// Company detail
router.get('/:companyId', asyncHandler(companyCtrl.getCompany));

module.exports = router;
