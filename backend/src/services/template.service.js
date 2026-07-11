/**
 * Template service — template loading and management.
 *
 * Templates live in constants/templates.json. Re-reads on each call
 * so edits show up without a server restart.
 */
const path = require('path');

const TEMPLATES_PATH = path.join(__dirname, '..', 'constants', 'templates.json');

function getTemplates() {
    delete require.cache[require.resolve(TEMPLATES_PATH)];
    return require(TEMPLATES_PATH);
}

module.exports = { getTemplates };
