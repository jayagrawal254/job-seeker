/**
 * sendPendingMails.js — sends all 'pending' rows in mail_log, one mail per recruiter,
 * with a random 30-60s gap between sends so Gmail doesn't rate-limit or flag spam.
 *
 * Usage:
 *   node scripts/sendPendingMails.js [--limit=100] [--minWait=30000] [--maxWait=60000] [--dryRun]
 *
 * - Reads SMTP creds from .env (Gmail: smtp.gmail.com + App Password).
 * - Personalises {{recname}} / {{organisation}} placeholders from recruiter_profile.
 * - Appends an open-tracking pixel pointing at TRACKING_BASE_URL/api/track/open/<id>.gif.
 * - Updates each row to sent / failed / bounced as it goes; safe to re-run any time
 *   (only 'pending' rows are picked up; a killed run just leaves the rest pending).
 */
const config = require('../src/config');
const mailRepo = require('../src/repositories/mail.repository');
const recruiterRepo = require('../src/repositories/recruiter.repository');
const resumeRepo = require('../src/repositories/resume.repository');
const { createTransporter, DRY_RUN } = require('../src/services/mail.service');
const parseFrom = require('../src/utils/parseFrom');
const personalise = require('../src/utils/personalise');
const logger = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');

const args = {};
for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] === undefined ? true : m[2];
}

const LIMIT = parseInt(args.limit, 10) || config.mail.maxPerRun;
const MIN_WAIT = parseInt(args.minWait, 10) || config.mail.minGapMs;
const MAX_WAIT = parseInt(args.maxWait, 10) || config.mail.maxGapMs;
const USE_BREVO = !!config.mail.brevoApiKey;
const DRY = (!USE_BREVO && DRY_RUN) || !!args.dryRun;

// Each mail row carries its own resume filename (mail_log.attachment). Load lazily + cache.
const attachmentCache = new Map();
function loadResume(filename) {
    if (!filename) return null;
    if (attachmentCache.has(filename)) return attachmentCache.get(filename);
    const full = resumeRepo.resolveResume(filename);
    const att = full
        ? { filename: path.basename(full), contentBase64: fs.readFileSync(full).toString('base64') }
        : null;
    if (!full) logger.warn(`resume not found, sending without attachment: ${filename}`);
    attachmentCache.set(filename, att);
    return att;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = () => MIN_WAIT + Math.floor(Math.random() * (MAX_WAIT - MIN_WAIT));

// Gmail SMTP rejections that mean the address itself is bad -> bounced, not failed
const BOUNCE_HINTS = /(recipient|address|mailbox|user).*(reject|not.?exist|unknown|invalid|unavailable)|550|553/i;

// Brevo transactional send — returns their messageId (used by syncMailEvents.js)
async function sendViaBrevo(to, subject, html, attachment) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': config.mail.brevoApiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
            sender: parseFrom(config.mail.from),
            to: [{ email: to }],
            subject,
            htmlContent: html,
            ...(attachment ? { attachment: [{ name: attachment.filename, content: attachment.contentBase64 }] } : {})
        })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${text}`);
    try { return JSON.parse(text).messageId || null; } catch (e) { return null; }
}

async function main() {
    logger.info(`Start | limit=${LIMIT} gap=${MIN_WAIT / 1000}-${MAX_WAIT / 1000}s ` +
        `via=${USE_BREVO ? 'brevo-api' : 'smtp'} dryRun=${DRY} (resume attached per-mail)`);
    if (!DRY && !config.mail.from) {
        throw new Error('MAIL_FROM is not set in .env (e.g. "Aditya <you@gmail.com>")');
    }

    const transporter = (DRY || USE_BREVO) ? null : createTransporter();
    const pending = await mailRepo.findPending(LIMIT);
    logger.info(`pending mails picked up: ${pending.length}`);

    let sent = 0, failed = 0, bounced = 0;
    for (let i = 0; i < pending.length; i++) {
        const mail = pending[i];
        const recruiter = await recruiterRepo.findPersonalisationData(mail.recruiter_id);

        const subject = personalise(mail.subject, recruiter);
        // Brevo injects its own open-tracking pixel; only add ours on the SMTP path
        const pixel = USE_BREVO ? '' :
            `<img src="${config.mail.trackingBaseUrl}/api/track/open/${mail.id}.gif"` +
            ' width="1" height="1" style="display:none" alt=""/>';
        const html = personalise(mail.content, recruiter) + pixel;
        const attachment = loadResume(mail.attachment);

        if (DRY) {
            logger.info(`[DRY-RUN] #${mail.id} to=${mail.email} subject="${subject}" ` +
                `attach=${attachment ? attachment.filename : 'none'}`);
            sent++;
        } else {
            try {
                let messageId = null;
                if (USE_BREVO) {
                    messageId = await sendViaBrevo(mail.email, subject, html, attachment);
                } else {
                    await transporter.sendMail({
                        from: config.mail.from, to: mail.email, subject, html,
                        ...(attachment ? { attachments: [{ filename: attachment.filename,
                            content: attachment.contentBase64, encoding: 'base64' }] } : {})
                    });
                }
                await mailRepo.markSent(mail.id, messageId);
                sent++;
                logger.info(`sent #${mail.id} to=${mail.email} (${sent + failed + bounced}/${pending.length})`);
            } catch (err) {
                if (BOUNCE_HINTS.test(err.message)) {
                    await mailRepo.markBounced(mail.id, err.message);
                    bounced++;
                    logger.warn(`BOUNCED #${mail.id} to=${mail.email}: ${err.message}`);
                } else {
                    await mailRepo.markFailed(mail.id, err.message);
                    failed++;
                    logger.error(`FAILED #${mail.id} to=${mail.email}: ${err.message}`);
                }
            }
        }

        if (i < pending.length - 1) {
            const wait = jitter();
            logger.info(`waiting ${Math.round(wait / 1000)}s ...`);
            await sleep(wait);
        }
    }

    logger.info(`Done | sent=${sent} failed=${failed} bounced=${bounced}` +
        (pending.length === LIMIT ? ' | more pending may remain — run again' : ''));
}

main()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
