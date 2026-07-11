require('dotenv').config();
const path = require('path');

const config = {
    port: Number(process.env.PORT || 4000),
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'recly_v2',
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5)
    },
    mail: {
        // Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_SECURE=true,
        // SMTP_USER=you@gmail.com, SMTP_PASSWORD=<16-char Google App Password>.
        // When SMTP_HOST is not set the send script runs in DRY-RUN mode.
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== 'false',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.MAIL_FROM || '',
        // Brevo (brevo.com, free 300 mails/day). When set, the send script uses the
        // Brevo API instead of SMTP, and scripts/syncMailEvents.js can poll opens/bounces
        // from their events API — works fully from localhost, no tunnel needed.
        brevoApiKey: process.env.BREVO_API_KEY || '',
        // sender profile id stamped on queued mails (profile table comes later)
        userId: Number(process.env.MAIL_USER_ID || 1),
        // resume store: uploaded PDFs live here; each mail picks one by filename (or none)
        resumesDir: process.env.MAIL_RESUMES_DIR || path.join(__dirname, '..', '..', 'data', 'resumes'),
        // resume attached when a mail/test doesn't specify one (filename inside resumesDir)
        defaultResume: process.env.MAIL_DEFAULT_RESUME || 'Jay_Agrawal_Resume.pdf',
        // pacing between sends — 30-60s so Gmail doesn't rate-limit / flag as spam
        minGapMs: Number(process.env.MAIL_MIN_GAP_MS || 30000),
        maxGapMs: Number(process.env.MAIL_MAX_GAP_MS || 60000),
        // per-run safety cap for the send script (Gmail free tier ~500/day; stay well below)
        maxPerRun: Number(process.env.MAIL_MAX_PER_RUN || 100),
        // public base URL used for the open-tracking pixel; localhost only tracks
        // opens from your own machine — use a tunnel/hosted URL for real tracking
        trackingBaseUrl: (process.env.TRACKING_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
    }
};

module.exports = config;
