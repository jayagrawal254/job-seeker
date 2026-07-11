/**
 * syncMailEvents.js — pulls open/bounce events from the Brevo API and updates mail_log.
 * Works entirely from localhost (polling, no webhooks/tunnel needed).
 *
 * Usage:
 *   node scripts/syncMailEvents.js [--days=7]
 *
 * Requires BREVO_API_KEY in .env. Run it any time after sending (e.g. next morning):
 *   - 'opened'                          -> mail_log.status = opened
 *   - hardBounces/softBounces/blocked/
 *     invalid/spam                      -> mail_log.status = bounced (reason in error)
 * Matching is by mail_log.message_id (stored by sendPendingMails.js on the Brevo path).
 */
const config = require('../src/config');
const mailRepo = require('../src/repositories/mail.repository');
const logger = require('../src/utils/logger');

const args = {};
for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] === undefined ? true : m[2];
}
const DAYS = parseInt(args.days, 10) || 7;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const EVENT_MAP = [
    { event: 'opened', kind: 'opened' },
    { event: 'hardBounces', kind: 'bounced' },
    { event: 'softBounces', kind: 'bounced' },
    { event: 'blocked', kind: 'bounced' },
    { event: 'invalid', kind: 'bounced' },
    { event: 'spam', kind: 'bounced' }
];

async function fetchEvents(event, offset) {
    const url = `https://api.brevo.com/v3/smtp/statistics/events?limit=100&offset=${offset}` +
        `&days=${DAYS}&event=${event}&sort=desc`;
    const res = await fetch(url, { headers: { 'api-key': config.mail.brevoApiKey } });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.events || [];
}

const toSqlDate = iso => new Date(iso).toISOString().replace('T', ' ').slice(0, 19);

async function main() {
    if (!config.mail.brevoApiKey) {
        throw new Error('BREVO_API_KEY is not set in .env — event sync only works with the Brevo send path');
    }
    logger.info(`Start | pulling last ${DAYS} day(s) of events from Brevo`);

    let opened = 0, bounced = 0;
    for (const { event, kind } of EVENT_MAP) {
        let offset = 0;
        while (true) {
            const events = await fetchEvents(event, offset);
            for (const ev of events) {
                if (!ev.messageId) continue;
                if (kind === 'opened') {
                    opened += await mailRepo.markOpenedByMessageId(ev.messageId, toSqlDate(ev.date));
                } else {
                    bounced += await mailRepo.markBouncedByMessageId(
                        ev.messageId, `${event}${ev.reason ? ': ' + ev.reason : ''}`);
                }
            }
            if (events.length < 100) break;
            offset += 100;
            await sleep(300);
        }
        logger.info(`${event}: done`);
    }

    logger.info(`Done | marked opened=${opened} bounced=${bounced}`);
}

main()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
