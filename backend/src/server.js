const app = require('./app');
const config = require('./config');
const { DRY_RUN } = require('./services/mail.service');

app.listen(config.port, () => {
    console.log(`recly-v2 backend listening on :${config.port}`);
    console.log('mail: UI queues into mail_log; run `npm run send:mails` to send ' +
        `(${DRY_RUN ? 'currently DRY-RUN — set SMTP_* in .env' : 'SMTP configured'})`);
});
