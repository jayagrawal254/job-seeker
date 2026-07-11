// SMTP / Brevo transport. The API only queues into mail_log; the send script does the
// bulk send. The one exception is sendMailNow() below, used by the "send test email" button.
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config/config');
const resumeDao = require('../dao/resume');

const DRY_RUN = !config.mail.host && !config.mail.brevoApiKey;

function createTransporter() {
    if (!config.mail.host) return null;
    return nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined
    });
}

function parseFrom(from) {
    const m = String(from).match(/^(.*?)\s*<(.+@.+)>$/);
    return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: String(from).trim() };
}

function loadResume(filename) {
    const full = resumeDao.resolveResume(filename);
    if (!full) return null;
    return { filename: path.basename(full), contentBase64: fs.readFileSync(full).toString('base64') };
}

/**
 * Send one email immediately (used by the test-email button). Returns { via, dryRun }.
 * Uses Brevo API when a key is set, else SMTP; attaches the named resume if given.
 */
async function sendMailNow({ to, subject, html, attachment: attachmentName = null }) {
    if (!to || !subject || !html) throw Object.assign(new Error('to, subject and html are required'), { statusCode: 400 });
    if (DRY_RUN) {
        console.log(`[mail][DRY-RUN] test to=${to} subject="${subject}"`);
        return { via: 'dry-run', dryRun: true };
    }
    if (!config.mail.from) throw Object.assign(new Error('MAIL_FROM is not set in .env'), { statusCode: 500 });
    const attachment = attachmentName ? loadResume(attachmentName) : null;

    if (config.mail.brevoApiKey) {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': config.mail.brevoApiKey, 'content-type': 'application/json' },
            body: JSON.stringify({
                sender: parseFrom(config.mail.from), to: [{ email: to }], subject, htmlContent: html,
                ...(attachment ? { attachment: [{ name: attachment.filename, content: attachment.contentBase64 }] } : {})
            })
        });
        if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
        return { via: 'brevo-api', dryRun: false };
    }

    await createTransporter().sendMail({
        from: config.mail.from, to, subject, html,
        ...(attachment ? { attachments: [{ filename: attachment.filename, content: attachment.contentBase64, encoding: 'base64' }] } : {})
    });
    return { via: 'smtp', dryRun: false };
}

module.exports = { createTransporter, sendMailNow, DRY_RUN };
