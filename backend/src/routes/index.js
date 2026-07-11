/**
 * Route aggregator — mounts all domain route files under /api.
 *
 * This is the single entry point that app.js uses: `app.use('/api', routes)`.
 * Each domain router handles its own sub-paths.
 */
const express = require('express');
const router = express.Router();
const { locations } = require('../constants/locations');

const companyRoutes = require('./company.routes');
const recruiterRoutes = require('./recruiter.routes');
const mailRoutes = require('./mail.routes');
const resumeRoutes = require('./resume.routes');
const trackingRoutes = require('./tracking.routes');

// Health check
router.get('/healthz', (req, res) => res.json({ ok: true }));

// Hardcoded location list
router.get('/locations', (req, res) => res.json(locations));

// Mount domain routes
router.use('/companies', companyRoutes);
router.use('/', recruiterRoutes);   // /companies/:id/recruiters and /recruiters/:id
router.use('/', mailRoutes);        // /templates, /mail/*
router.use('/resumes', resumeRoutes);
router.use('/track', trackingRoutes);

module.exports = router;
