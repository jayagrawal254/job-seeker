// Imports data/company_profile.sql and data/recruiter_profile.sql into the configured DB.
// Creates the database if it doesn't exist. Usage: npm run import:data
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');
const logger = require('../src/utils/logger');

async function main() {
    const conn = await mysql.createConnection({
        host: config.db.host,
        user: config.db.user,
        password: config.db.password,
        multipleStatements: true
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` DEFAULT CHARSET utf8mb4`);
    await conn.query(`USE \`${config.db.database}\``);

    for (const file of ['company_profile.sql', 'recruiter_profile.sql']) {
        const sqlPath = path.join(__dirname, '..', 'data', file);
        logger.info(`importing ${file} ...`);
        await conn.query(fs.readFileSync(sqlPath, 'utf8'));
        logger.info(`${file} imported`);
    }

    const [[c]] = await conn.query('SELECT COUNT(*) AS n FROM company_profile');
    const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM recruiter_profile');
    logger.info(`Done | company_profile=${c.n} rows, recruiter_profile=${r.n} rows`);
    await conn.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
