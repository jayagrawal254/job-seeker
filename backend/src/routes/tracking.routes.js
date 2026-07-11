/**
 * Tracking routes — /api/track endpoints.
 */
const express = require('express');
const router = express.Router();
const trackingCtrl = require('../controllers/tracking.controller');

// Open-tracking pixel (1x1 transparent gif) embedded by the send script
router.get('/open/:id.gif', trackingCtrl.trackOpen);

module.exports = router;
