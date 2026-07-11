# recly-v2 — Full Context (data pipeline + backend)

End-to-end reference for the recruiter-outreach system: how data is fetched from the
hirist DB, transformed into JSON, loaded into the `recly_v2` MySQL database, and served
by the backend. Covers every table, field, format, JSON file, script, and API.

> **Layout — everything now lives under `~/Documents/Projects/recly-v2`:**
> - `pipeline/` — portable transform scripts + all JSON/SQL data artifacts.
> - `pipeline/db-exports/` — **reference copies** of the two DB-export scripts.
> - `backend/`, `frontend/` — the app.
>
> **Exception (must stay in the recruiter-api repo):** the *runnable* copies of
> `recruiterProfileJsonExport.js` and `metaRecruiterJsonExport.js` live in
> `~/orca/workspaces/recruiter-api/Relevence-job-data` (branch `jay/Relevence-job-data`)
> because they `require` that repo's `config/index.js`, `db/mysql/index.js`, and
> `utilities/setEnvironment.js` (DB pool + vault). They **cannot execute from `recly-v2`** —
> the copies in `pipeline/db-exports/` are for reference/version-keeping only. Run the exports
> there, then move the produced JSON into `recly-v2/pipeline/`.

---

## 1. Source database (hirist)

Both source tables are **very large**; every export uses **keyset pagination + an id floor**
(binary-searched per run) and never a full scan. Product is read from `config['product']`
and the exports are **hirist-only** (abort otherwise). All exports are **read-only**.

### 1a. `recruiter_profile` (source)
Recruiter accounts. Exported by `recruiterProfileJsonExport.js`, filtered on `date_created`.
- **Fetch:** `SELECT * FROM recruiter_profile WHERE id > ? AND id >= <anchor> AND date_created BETWEEN ? AND ? ORDER BY id ASC LIMIT ?`
- **Excluded fields** (never dumped): `password`, `twitter_token`, `twitter_secret`, `linkedinoauth_token`.
- **Key columns used downstream:** `id`, `recname`, `organisation`, `email`, `phone`, `status`,
  `date_created`, `designation`, `admin_type`, `company_status`, `domain`, `company_id`,
  `reg_source`, `company_name`.
- Dates formatted `YYYY-MM-DD HH:mm:ss`.

### 1b. `meta_recruiter` (source — jobs)
Job postings. **`uid` = the recruiter's `recruiter_profile.id`** (this is the join key that
drives all "active" logic). Exported by `metaRecruiterJsonExport.js`, filtered on `created`.
- **Exactly 24 fields exported:** `id, uid, Location, Min, Max, created, title, catid,
  created_by, created_by_alias, location_ids, other_location, publish, published_id,
  jobfeedrefId, company_name, minsal, maxsal, industry, functional_area, unpublished_date,
  premium_post, designation, ref`.
- `Min`/`Max` = experience range (years); `minsal`/`maxsal` = salary (lakhs, `0` = unspecified);
  `location_ids` = comma-separated location id string.
- Invalid zero-dates (e.g. `unpublished_date` `0000-00-00`) written as `null`.

### Big-table rule
Any date-range query includes an **id floor** so MySQL never scans the whole table. The
export scripts binary-search the floor for `(from-date − 30 days)` via cheap PK probes
(`WHERE id >= ? ORDER BY id ASC LIMIT 1`), then keyset-paginate. iimjobs `meta_recruiter`
has a standing floor of `id >= 1800000` (not relevant to these hirist exports).

---

## 2. Data pipeline (`recly-v2/pipeline/`)

Order of execution: **export → transform → merge → SQL → import**. The two export steps
(2.1, 2.2) run in the recruiter-api repo; steps 2.3–2.5 run from `recly-v2/pipeline/`.

### 2.1 `recruiterProfileJsonExport.js`  *(runs in recruiter-api repo)*
Dumps `recruiter_profile` → `recruiter_profiles_hirist_<from>_to_<to>.json` (JSON array).
```
node recruiterProfileJsonExport.js --connectionLimit=1 --from=YYYY-MM-DD --to=YYYY-MM-DD \
     [--chunkSize=200] [--minWait=1000] [--maxWait=1500] [--out=path.json]
```
Ranges exported (three files):
- `2024-01-01_to_2024-12-17` (this run was interrupted → file missing trailing `]`; the
  transform auto-repairs it)
- `2025-01-01_to_2025-12-30`
- `2026-01-01_to_2026-07-01`

### 2.2 `metaRecruiterJsonExport.js`  *(runs in recruiter-api repo)*
Dumps `meta_recruiter` → `meta_recruiter_hirist_<from>_to_<to>.json`.
```
node metaRecruiterJsonExport.js --connectionLimit=1 --from=2025-01-01 --to=2026-07-01 \
     [--chunkSize=250] [--minWait=1000] [--maxWait=2000] [--out=path.json]
```
Main file: `meta_recruiter_hirist_2025-01-01_to_2026-07-01.json`
(**289,378 jobs, 34,164 distinct posters**, ~146 MB). This is the "activity window".

### 2.3 `companyRecruitersTransform.js`
`recruiter_profiles_hirist_*.json` → `companies_recruiters_hirist_*.json`
(one entry per `company_id`, each with a `recruiters[]` list).
- Keeps **14 recruiter fields** (see 1a).
- Company-level `company_name`/`organisation`/`domain` = first non-empty value seen.
- Recruiters with no `company_id` grouped under a single `company_id: null` entry (dropped later).
- **Drops risky emails** at this stage via `isRiskyEmail()` (see §4).
```
node companyRecruitersTransform.js         # processes all recruiter_profiles_hirist_*.json
```

### 2.4 `mergeCompanyRecruiters.js`
Merges the three `companies_recruiters_hirist_*.json` files **and enriches with job activity**
streamed from the meta_recruiter export → `companies_recruiters_hirist_merged_active.json`.
```
node mergeCompanyRecruiters.js [--jobs=meta_recruiter_hirist_2025-01-01_to_2026-07-01.json]
```
Merge rules: unique by `company_id`; the `company_id: null` group dropped; risky emails
dropped (safety net); recruiters deduped by `id`; companies with zero recruiters dropped.

**Activity enrichment (uid = recruiter id, window = jobs export range):**
| Field | Meaning |
|---|---|
| `recruiter.status` | `1` if the recruiter posted ≥1 job in the window, else `0` (**replaces the DB account status**) |
| `recruiter.location_ids` | array — union of `location_ids` of jobs they posted (`[]` if none) |
| `recruiter.last_job_posted_date` | latest job `created` by that recruiter (`null` if none) |
| `company.status` | `1` if **any** recruiter is active |
| `company.min` / `company.max` | experience range across the company's posted jobs |
| `company.minsal` / `company.maxsal` | salary range (0/unspecified excluded) |
| `company.last_job_posted_date` | latest job across all its recruiters |
| `company.company_location_ids` | array — union of job `location_ids` across the company |
| `company.recruiter_count` | number of recruiters |

### 2.5 `exportSqlTables.js`
`companies_recruiters_hirist_merged_active.json` → **`company_profile.sql`** + **`recruiter_profile.sql`**
(each: `DROP TABLE IF EXISTS` + `CREATE TABLE` + batched `INSERT`s of 500 rows, utf8mb4,
strings escaped, arrays stored as comma-separated `TEXT`).
```
node exportSqlTables.js [--in=companies_recruiters_hirist_merged_active.json]
```

### Final dataset counts (after all filtering)
**28,127 companies · 89,723 recruiters (21,113 active).** 2,335 risky emails dropped total.

---

## 3. JSON files (`recly-v2/pipeline/`)

| File | Produced by | Contents |
|---|---|---|
| `recruiter_profiles_hirist_<range>.json` | export 2.1 | raw recruiter_profile rows (3 files) |
| `meta_recruiter_hirist_2025-01-01_to_2026-07-01.json` | export 2.2 | raw job rows (24 fields), one JSON obj per line |
| `companies_recruiters_hirist_<range>.json` | transform 2.3 | company-grouped (3 files) |
| `companies_recruiters_hirist_merged_active.json` | merge 2.4 | **canonical enriched dataset** |
| `company_profile.sql`, `recruiter_profile.sql` | 2.5 | importable dumps |

> Raw export files still contain internal/portal emails — only the **derived** files
> (`companies_recruiters_*`, merged, SQL, DB) are scrubbed.

---

## 4. Risky-email filter (`isRiskyEmail`)

Applied in both `companyRecruitersTransform.js` and `mergeCompanyRecruiters.js`. A recruiter
is dropped if **any** of:
1. **Brand keyword anywhere in the email:** `iimjobs | hirist | naukri | ambitionbox | infoedge`
   (also catches e.g. `iimjobs@godrej.com`).
2. **Blocked domain (exact):** disposable — `yopmail.com, mailinator.com, getnada.com,
   getairmail.com, clowmail.com, testmail.com`; Infoedge-family — `zwayam.com, doselect.com,
   bigshyft.com`; typo/undeliverable — `gamil.com, gmil.com, abc.com`.
3. **Test-style local part:** starts with `test/demo/dummy/fake/sample/asdf/qwerty/abc/xyz/aaa/temp`,
   or matches `(test|demo|dummy)\d*@`.

---

## 5. recly_v2 database

MySQL 8.4 in Docker container **`hrms-lite-mysql`**.
- root: `root` / `password` (works only via `docker exec`, not from host)
- app user: **`recly` / `recly_password`**, DB **`recly_v2`**
- Created + imported by `npm run import:data`; mail tables by `npm run setup:mail`.

### 5.1 `company_profile`
| Column | Type | Notes |
|---|---|---|
| `company_id` | INT PK | from hirist `recruiter_profile.company_id` |
| `company_name` | VARCHAR(255) | often NULL |
| `organisation` | VARCHAR(512) | display name |
| `domain` | VARCHAR(255) | |
| `status` | TINYINT | `1` = ≥1 recruiter posted a job in window |
| `min`, `max` | INT | experience range across posted jobs |
| `minsal`, `maxsal` | INT | salary range (0 excluded) |
| `last_job_posted_date` | DATETIME | latest job across company |
| `company_location_ids` | TEXT | comma-separated location ids |
| `recruiter_count` | INT | |

Indexes: `status`, `domain`, `last_job_posted_date`.

### 5.2 `recruiter_profile`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK | = `meta_recruiter.uid` |
| `recname`, `organisation`, `email`, `phone` | VARCHAR | |
| `status` | TINYINT | `1` = posted a job in window (activity, not account) |
| `date_created` | DATETIME | registration date |
| `designation`, `admin_type`, `company_status`, `domain` | | |
| `company_id` | INT | FK → company_profile |
| `reg_source`, `company_name` | | |
| `location_ids` | TEXT | comma-separated ids of jobs this recruiter posted |
| `last_job_posted_date` | DATETIME | latest job by this recruiter |

Indexes: `company_id`, `status`, `email`, `last_job_posted_date`.

### 5.3 `mail_log` (created by `setup:mail`)
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK | |
| `user_id` | INT default 1 | sender profile id (profile table planned) |
| `recruiter_id`, `company_id` | INT | |
| `template_id` | INT | references `templates.json` id (no FK) |
| `email`, `subject` | | recipient + subject snapshot |
| `content` | MEDIUMTEXT | HTML body (with `{{recname}}`/`{{organisation}}` placeholders) |
| `status` | ENUM | `pending, sent, opened, bounced, failed` |
| `error` | VARCHAR(512) | failure/bounce reason |
| `created_on` | DATETIME | queued time |
| `sent_on`, `opened_on` | DATETIME | set by send script / tracking |
| `message_id` | VARCHAR(191) | provider id (Brevo) for event sync |
| `attachment` | VARCHAR(255) | resume filename in `data/resumes` (NULL = none) |

Indexes: `status`, `recruiter_id`, `company_id`, `user_id`, `message_id`.

> Templates live in **`global/templates.json`** — **no `mail_template` table** (removed).

---

## 6. Project artifacts

### 6a. `recly-v2/pipeline/`
```
companyRecruitersTransform.js   step 2.3 (portable)
mergeCompanyRecruiters.js       step 2.4 (portable)
exportSqlTables.js              step 2.5 (portable)
db-exports/
  recruiterProfileJsonExport.js REFERENCE copy — run the original in recruiter-api
  metaRecruiterJsonExport.js    REFERENCE copy — run the original in recruiter-api
recruiter_profiles_hirist_<range>.json   (3)  raw recruiter dumps
meta_recruiter_hirist_<range>.json       (3)  raw job dumps (main: 2025-01-01_to_2026-07-01)
companies_recruiters_hirist_<range>.json (3)  company-grouped
companies_recruiters_hirist_merged.json       (superseded, pre-activity)
companies_recruiters_hirist_merged_active.json  CANONICAL enriched dataset
company_profile.sql, recruiter_profile.sql      source dumps (copied into backend/data/)
```

### 6b. `recly-v2/backend`
```
package.json               scripts (test, dev, start, import:data, setup:mail, etc.)
jest.config.js             Jest test configuration
src/
  server.js                boot
  app.js                   Express app (cors, json, /api router)
  config/index.js          all env-driven config (db, mail, resumes, tracking)
  constants/               locations.json, templates.json, locations.js
  db/connection.js         mysql2 pool
  controllers/             route handlers (company, recruiter, mail, resume, tracking)
  services/                business logic (mail, template, mailQueue, etc.)
  repositories/            database access (company, recruiter, mail, resume)
  routes/                  domain route definitions
  middleware/              errorHandler, asyncHandler, requestLogger
  utils/                   errors, logger, parseFrom, personalise
scripts/
  importData.js            create DB + import the two SQL dumps    (npm run import:data)
  createMailTables.js      create/alter mail_log                   (npm run setup:mail)
  sendPendingMails.js      send queued mails, 30-60s gaps          (npm run send:mails)
  syncMailEvents.js        pull opens/bounces from Brevo API       (npm run sync:events)
data/
  company_profile.sql, recruiter_profile.sql   (copied from pipeline)
  resumes/                 uploaded resumes (default Jay_Agrawal_Resume.pdf)
__tests__/                 unit and integration tests
.env                       secrets/config (NOT committed)
```

### 6c. `recly-v2/frontend` (Vite + React 19 + antd, proxies `/api` → :4000)
```
src/
  main.jsx                 Entry point + providers (LocationProvider, ErrorBoundary)
  App.jsx                  Layout (Header, Content)
  api/                     Domain-specific API clients (company, recruiter, mail, location, resume)
  components/              Shared components (StatusTag, LocationTags, ComposeMailModal, ErrorBoundary)
  hooks/                   Custom data fetching hooks (useCompanies, useRecruiters, useMailStats)
  context/                 Global state (LocationContext)
  constants/               Shared UI constants
  utils/                   Formatters, filterPresets
  styles/                  Global CSS
  pages/                   Page components (CompaniesPage, CompanyPage, MailLogsPage)
```

---

## 7. API endpoints (all under `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | health |
| GET | `/locations` | hardcoded location list |
| GET | `/companies` | filtered list; query: `search, status(1/0/all, default 1), locations=3,37, minExp, maxExp, minSal, maxSal, lastPostedFrom, lastPostedTo, sortBy, sortDir, page, limit`. Returns `active_recruiter_count, last_mailed_date, mailed_count` |
| GET | `/companies/search/:term` | autocomplete |
| GET | `/companies/:companyId` | detail (+ active count, mail badges) |
| GET | `/companies/:companyId/recruiters` | `name, status(default 1/all), lastPostedFrom, lastPostedTo`; returns per-recruiter `last_mailed_date, mailed_count` |
| GET | `/recruiters/:id` | detail |
| GET | `/templates` | templates.json |
| GET / POST | `/resumes` | list / upload (multipart field `resume`, pdf/doc/docx ≤10 MB) |
| POST | `/mail/company/:companyId/active` | queue all **active** recruiters of a company |
| POST | `/mail/companies/top-active` | **home bulk**: `{companyIds[], topN=5, subject, body, templateId?, attachment?}` — queues the top-N most-recently-active recruiters per company |
| POST | `/mail/recruiters` | queue specific `{recruiterIds[], subject, body, ...}` |
| POST | `/mail/test` | send one test **immediately** (`{to, subject, body, attachment?}`) — does NOT write mail_log |
| GET | `/mail/logs` | flat paginated logs |
| GET | `/mail/logs/grouped` | company → recruiters → mails tree |
| GET | `/mail/stats` | KPIs + `daily[]` (default 7 days) |
| GET | `/track/open/:id.gif` | 1×1 tracking pixel → marks `opened` |

### Fetch/format semantics (important)
- **`status` everywhere = activity** (posted a job in window), not the account status.
- **Companies/recruiters default to active** (`status=1`); pass `status=all` to disable.
- **Experience & salary filters use containment** (company range must fit inside
  `[minExp,maxExp]`/`[minSal,maxSal]`), not overlap.
- Array columns (`*_location_ids`, `location_ids`) are comma-separated TEXT — query with
  `FIND_IN_SET(id, col)`.
- **Mailed badges show date only** (`YYYY-MM-DD`).
- **Top-N "most recently active"** = ordered by `last_job_posted_date DESC` (static snapshot
  from the export window, not live hirist activity).
- Personalisation placeholders `{{recname}}` / `{{organisation}}` are substituted per-recruiter
  by the **send script** (rendered literally in a single test send).

---

## 8. Mailing flow

1. **UI "queue" only writes `pending` rows** to `mail_log` (dedup: skips a recruiter that
   already has a pending mail with the same subject). Nothing is sent by the API.
2. **`npm run send:mails`** sends pending rows: one mail per recruiter, **random 30-60s gap**,
   personalises placeholders, attaches the row's resume, appends an open-tracking pixel
   (SMTP path), updates each row → `sent` / `failed` / `bounced`. Re-runnable; `--dryRun`,
   `--limit`, `--minWait/--maxWait`, `--attach` flags.
3. Opens: pixel hit → `opened`. On the **Brevo** path, `npm run sync:events` pulls
   open/bounce events by `message_id` instead.
4. **Test email** (Mail Logs page) sends immediately and does **not** appear in mail_log.

### Mail providers (`.env`)
- **Gmail SMTP** (current): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`,
  `SMTP_USER`, `SMTP_PASSWORD` = **Google App Password**, `MAIL_FROM`.
- **Brevo** (optional, better tracking/localhost-friendly): set `BREVO_API_KEY` → send script
  uses Brevo API and `sync:events` works. Currently commented out.
- Pacing/caps: `MAIL_MIN_GAP_MS=30000`, `MAIL_MAX_GAP_MS=60000`, `MAIL_MAX_PER_RUN=100`.
- Resume attachment: `MAIL_RESUMES_DIR`, `MAIL_DEFAULT_RESUME` (default `Jay_Agrawal_Resume.pdf`).
- Open tracking (SMTP path) needs a public `TRACKING_BASE_URL` (tunnel) to register real opens.

---

## 9. Run commands

```bash
# --- data refresh, step 1: exports run IN the recruiter-api repo ---
cd ~/orca/workspaces/recruiter-api/Relevence-job-data
node recruiterProfileJsonExport.js --connectionLimit=1 --from=... --to=...
node metaRecruiterJsonExport.js   --connectionLimit=1 --from=2025-01-01 --to=2026-07-01
mv recruiter_profiles_hirist_*.json meta_recruiter_hirist_*.json ~/Documents/Projects/recly-v2/pipeline/

# --- data refresh, step 2: transform/merge/sql run in the pipeline folder ---
cd ~/Documents/Projects/recly-v2/pipeline
node companyRecruitersTransform.js
node mergeCompanyRecruiters.js
node exportSqlTables.js
cp company_profile.sql recruiter_profile.sql ../backend/data/

# --- backend (recly-v2/backend) ---
npm install
npm run import:data     # create recly_v2 + import company/recruiter tables
npm run setup:mail      # create mail_log
npm run dev             # API on :4000
npm run send:mails      # send pending (LIVE — use --dryRun first)
npm run sync:events     # Brevo only

# --- frontend (recly-v2/frontend) ---
npm install && npm run dev   # http://localhost:5173

# clear mail history
docker exec hrms-lite-mysql mysql -uroot -ppassword recly_v2 -e "DELETE FROM mail_log;"
```

---

## 10. Gotchas
- Import dumps into `recly_v2` **only** — they `DROP TABLE recruiter_profile`, colliding with
  the real portal table name.
- `mail_log` starts empty → the Mail Logs page shows nothing until you **queue** mail
  (the test send does not count).
- Date ranges leave gaps (Dec 18-31 2024, Dec 31 2025 not in any recruiter export).
- ~13k job-posting uids aren't in the merged set (recruiters registered pre-2024 or without a
  `company_id`); their jobs don't contribute to company stats.
- Don't commit `.env` (contains the Gmail App Password).
