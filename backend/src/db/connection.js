/**
 * Database connection — supports two modes:
 *
 *  1. SQLite (default / demo)
 *     - Used when DATABASE_URL is not set or starts with "file://"
 *     - Falls back to backend/data/dummy.db if no path is specified
 *     - Exposes a db.query() shim so all repositories work unchanged
 *
 *  2. MySQL (production / custom)
 *     - Used when DATABASE_URL starts with "mysql://"
 *     - E.g. DATABASE_URL=mysql://user:pass@host:3306/dbname
 *
 * Users can also paste a custom URL in the UI (Custom DB URL button).
 * That URL is handled per-request by the API layer (passed as ?dbUrl=...),
 * but this module governs the default server-side connection.
 */

require('dotenv').config();
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';

/* ── MySQL mode ─────────────────────────────────────────────────────────────── */
if (DATABASE_URL.startsWith('mysql://')) {
  const mysql = require('mysql2/promise');
  const url = new URL(DATABASE_URL);
  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ''),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
  });
  console.log(`DB: MySQL @ ${url.hostname}/${url.pathname.replace(/^\//, '')}`);
  module.exports = pool;

/* ── Local MySQL (legacy env vars) ─────────────────────────────────────────── */
} else if (process.env.DB_HOST && !DATABASE_URL.startsWith('file://')) {
  const mysql = require('mysql2/promise');
  const config = require('../config');
  const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
  });
  console.log(`DB: MySQL @ ${config.db.host}/${config.db.database}`);
  module.exports = pool;

/* ── SQLite mode (default for demo / Render) ────────────────────────────────── */
} else {
  const Database = require('better-sqlite3');

  let dbPath;
  if (DATABASE_URL.startsWith('file://')) {
    dbPath = DATABASE_URL.replace('file://', '');
  } else {
    dbPath = path.join(__dirname, '..', '..', 'data', 'dummy.db');
  }

  const sqlite = new Database(dbPath, { readonly: false });
  sqlite.pragma('journal_mode = WAL');
  console.log(`DB: SQLite @ ${dbPath}`);

  /**
   * Shim that matches the mysql2 pool promise API:
   *   const [rows, fields] = await db.query(sql, params)
   * SQLite uses ? placeholders just like MySQL, so queries are compatible.
   */
  const db = {
    query(sql, params = []) {
      return new Promise((resolve, reject) => {
        try {
          // Detect write vs read to use the right better-sqlite3 method
          const trimmed = sql.trim().toUpperCase();
          if (
            trimmed.startsWith('INSERT') ||
            trimmed.startsWith('UPDATE') ||
            trimmed.startsWith('DELETE')
          ) {
            const info = sqlite.prepare(sql).run(...params);
            resolve([info, []]);
          } else {
            const rows = sqlite.prepare(sql).all(...params);
            resolve([rows, []]);
          }
        } catch (err) {
          reject(err);
        }
      });
    },

    // mysql2 pool also exposes execute() — alias it
    execute(sql, params) {
      return this.query(sql, params);
    },

    // Expose raw sqlite instance in case scripts need it
    _sqlite: sqlite,
  };

  module.exports = db;
}
