// Creates mail_log table (idempotent) and ensures required columns exist.
// Usage: npm run setup:mail
const mysql = require('mysql2/promise');
const config = require('../src/config');
const logger = require('../src/utils/logger');

async function main() {
    const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });

    // templates now live in constants/templates.json (no table needed)
    await conn.query(`
CREATE TABLE IF NOT EXISTS mail_log (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL DEFAULT 1 COMMENT 'sender profile id (profile table comes later)',
  recruiter_id INT NOT NULL,
  company_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  email VARCHAR(255) NOT NULL COMMENT 'recipient snapshot at queue time',
  subject VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  status ENUM('pending','sent','opened','bounced','failed') NOT NULL DEFAULT 'pending',
  error VARCHAR(512) DEFAULT NULL,
  created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_on DATETIME DEFAULT NULL,
  opened_on DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_recruiter (recruiter_id),
  KEY idx_company (company_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    // provider message id (Brevo) used by syncMailEvents.js to match open/bounce events
    const [cols] = await conn.query("SHOW COLUMNS FROM mail_log LIKE 'message_id'");
    if (!cols.length) {
        await conn.query(
            'ALTER TABLE mail_log ADD COLUMN message_id VARCHAR(191) DEFAULT NULL, ADD KEY idx_message (message_id)');
        logger.info('added mail_log.message_id column');
    }

    // resume filename attached to this mail (inside resumesDir); NULL = no attachment
    const [attCols] = await conn.query("SHOW COLUMNS FROM mail_log LIKE 'attachment'");
    if (!attCols.length) {
        await conn.query('ALTER TABLE mail_log ADD COLUMN attachment VARCHAR(255) DEFAULT NULL');
        logger.info('added mail_log.attachment column');
    }

    logger.info('mail_log table ready (templates live in constants/templates.json)');
    await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
