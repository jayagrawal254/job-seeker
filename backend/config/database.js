require('dotenv').config();
const path = require('path');

// Load DATABASE_URL from environment. If not set, default to the company_profile.sql file in the data directory.
// Users can override with any SQLite file URL or a remote SQL connection string.
const defaultDbPath = path.join(process.cwd(), 'data', 'company_profile.sql');
const DATABASE_URL = process.env.DATABASE_URL || `file://${defaultDbPath}`;

module.exports = {
  DATABASE_URL,
};
