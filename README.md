# Recly v3

Company / recruiter explorer over the hirist export data (`company_profile` + `recruiter_profile`),
with filters and recruiter mailing. Modeled on the original `recly` / `recly-fe` projects.

```
backend/   Express + mysql2 + nodemailer API (port 4000) using a layered Service/Repository architecture
frontend/  Vite + React 19 + antd UI (port 5173, proxies /api to the backend) using Domain-driven components
```

## Data

`backend/data/` contains the SQL dumps generated from
`companies_recruiters_hirist_merged_active.json` (recruiter-api repo):

- `company_profile.sql` - `status` = 1 if any recruiter posted a job
  between 2025-01-01 and 2026-07-01; `min`/`max` = experience range across its posted jobs;
  `minsal`/`maxsal` = salary range; `company_location_ids` = union of job location ids.
- `recruiter_profile.sql` — `status` = 1 if that recruiter posted a job
  in the window; `location_ids` = union of location ids of jobs they posted.

> Import into a **local analysis DB only** — the dumps `DROP TABLE IF EXISTS
> recruiter_profile`, which collides with the real portal table name.

## Setup

```bash
# backend
cd backend
cp .env.example .env        # fill DB creds; leave SMTP_HOST empty for mail DRY-RUN
npm install
npm run import:data         # creates DB (default recly_v2) and imports both dumps
npm run dev                 # or: npm start

# frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## Features

- **Companies page** — filters: experience range, salary range, locations (multi-select,
  hardcoded from recruiter-admin `src/models/location.js`), company status (active =
  posted jobs in window), plus company/domain autocomplete search that jumps to the
  company page.
- **Company page** — company summary + all its recruiters; search recruiters by
  name/email; filter by recruiter status; select rows.
- **Mail** —
  1. *Mail all active recruiters* of the company (one button).
  2. *Mail selected* recruiters (row selection).
  Mails are sent individually (no shared To list), sequentially with a `MAIL_GAP_MS`
  pause, deduped by email, capped by `MAIL_MAX_RECIPIENTS`. Without `SMTP_HOST` the
  backend runs in **DRY-RUN** mode: it logs each mail and reports success without sending.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/locations` | hardcoded location list |
| GET | `/api/companies` | `?search=&status=&locations=3,37&minExp=&maxExp=&minSal=&maxSal=&page=&limit=` |
| GET | `/api/companies/search/:term` | autocomplete |
| GET | `/api/companies/:companyId` | company detail |
| GET | `/api/companies/:companyId/recruiters` | `?name=&status=` |
| GET | `/api/recruiters/:id` | recruiter detail |
| POST | `/api/mail/company/:companyId/active` | `{subject, body}` → all active recruiters |
| POST | `/api/mail/recruiters` | `{recruiterIds: [], subject, body}` |


Here are all the run commands for recly-v2.

One-time setup

cd ~/Documents/Projects/recly-v2/backend
npm install                 # backend deps
cp .env.example .env        # (already done — .env exists with your Gmail creds)
npm run import:data         # create recly_v2 DB + import company/recruiter tables
npm run setup:mail          # create the mail_log table

cd ~/Documents/Projects/recly-v2/frontend
npm install                 # frontend deps

Every-day: run the app (two terminals)

# terminal 1 — backend API on http://localhost:4000
cd ~/Documents/Projects/recly-v2/backend
npm run dev                 # (or: npm start)

# terminal 2 — frontend UI on http://localhost:5173
cd ~/Documents/Projects/recly-v2/frontend
npm run dev

Then open http://localhost:5173.

Sending mail (from backend dir)

cd ~/Documents/Projects/recly-v2/backend

npm run send:mails          # send all pending mails (30–60s gaps, attaches resume)
# variations:
node scripts/sendPendingMails.js --dryRun          # log only, send nothing
node scripts/sendPendingMails.js --limit=20        # send at most 20 this run
node scripts/sendPendingMails.js --minWait=45000 --maxWait=90000   # slower pacing

npm run sync:events         # (only if you switch to Brevo) pull opens/bounces into mail_log

Typical workflow

1. UI → filter companies → open a company → Queue mails (all-active or selected) — this only writes pending rows.
2. Go to Mail Logs tab → ✉ Send a test email to yourself first, confirm it lands in inbox with the PDF.
3. Back in the backend terminal: npm run send:mails.
4. Watch statuses update on the Mail Logs page.

Customizing (no restart / rerun needed)

- Templates → edit backend/global/templates.json
- Resume → replace backend/data/Jay_Agrawal_Resume.pdf (or change MAIL_ATTACHMENT_PATH in .env).
- Pacing / from-address / SMTP → edit backend/.eno apply).

One reminder: send:mails is live right now (your v), so it will really send. Use --dryRun or thetest-email box first.
# job-seeker
