const mysql = require('mysql2/promise');
const config = require('../config');

const db = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit
});

module.exports = db;
