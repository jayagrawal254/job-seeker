/**
 * Tracking controller — handles the open-tracking pixel endpoint.
 */
const mailRepo = require('../repositories/mail.repository');
const logger = require('../utils/logger');

// 1x1 transparent gif
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

function trackOpen(req, res) {
    const id = parseInt(req.params.id, 10);
    if (id) {
        mailRepo.markOpened(id).catch(err => logger.error('track/open:', err.message));
    }
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
    res.end(PIXEL);
}

module.exports = { trackOpen };
