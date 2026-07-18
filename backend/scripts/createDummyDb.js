/**
 * Creates backend/data/dummy.db — a self-contained SQLite database
 * with dummy data matching the production schema.
 *
 * Run once:  node scripts/createDummyDb.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'dummy.db');
const db = new Database(DB_PATH);

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
DROP TABLE IF EXISTS mail_log;
DROP TABLE IF EXISTS recruiter_profile;
DROP TABLE IF EXISTS company_profile;
DROP TABLE IF EXISTS location;

CREATE TABLE location (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE company_profile (
  company_id            INTEGER PRIMARY KEY,
  company_name          TEXT,
  organisation          TEXT,
  domain                TEXT,
  status                INTEGER NOT NULL DEFAULT 0,
  min                   INTEGER,
  max                   INTEGER,
  minsal                INTEGER,
  maxsal                INTEGER,
  last_job_posted_date  TEXT,
  company_location_ids  TEXT,
  recruiter_count       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recruiter_profile (
  id                   INTEGER PRIMARY KEY,
  recname              TEXT,
  organisation         TEXT,
  email                TEXT,
  phone                TEXT,
  status               INTEGER NOT NULL DEFAULT 0,
  date_created         TEXT,
  designation          TEXT,
  admin_type           INTEGER,
  company_status       INTEGER,
  domain               TEXT,
  company_id           INTEGER NOT NULL,
  reg_source           TEXT,
  company_name         TEXT,
  location_ids         TEXT,
  last_job_posted_date TEXT
);

CREATE TABLE mail_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER,
  recruiter_id INTEGER,
  subject     TEXT,
  body        TEXT,
  status      TEXT DEFAULT 'pending',
  created_on  TEXT DEFAULT (datetime('now')),
  sent_on     TEXT,
  user_id     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_company_status ON company_profile(status);
CREATE INDEX IF NOT EXISTS idx_recruiter_company ON recruiter_profile(company_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_status ON recruiter_profile(status);
`);

// ── Seed locations ─────────────────────────────────────────────────────────────
const locationNames = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Noida', 'Gurugram',
  'Chandigarh', 'Jaipur', 'Kochi', 'Coimbatore', 'Indore'
];
const insertLoc = db.prepare('INSERT INTO location (id, name) VALUES (?, ?)');
locationNames.forEach((name, i) => insertLoc.run(i + 1, name));

// ── Seed companies ─────────────────────────────────────────────────────────────
const companies = [
  { id: 1,  org: 'Infosys',              domain: 'infosys.com',       locs: '1,2,3',  min: 0, max: 20, minsal: 3,  maxsal: 40  },
  { id: 2,  org: 'Wipro',               domain: 'wipro.com',          locs: '1,4,5',  min: 1, max: 15, minsal: 4,  maxsal: 35  },
  { id: 3,  org: 'TCS',                 domain: 'tcs.com',            locs: '2,3,6',  min: 0, max: 18, minsal: 3,  maxsal: 38  },
  { id: 4,  org: 'HCL Technologies',    domain: 'hcltech.com',        locs: '1,9,10', min: 2, max: 12, minsal: 5,  maxsal: 30  },
  { id: 5,  org: 'Tech Mahindra',       domain: 'techmahindra.com',   locs: '1,2,4',  min: 1, max: 10, minsal: 4,  maxsal: 28  },
  { id: 6,  org: 'Accenture',           domain: 'accenture.com',      locs: '1,2,3',  min: 0, max: 20, minsal: 5,  maxsal: 45  },
  { id: 7,  org: 'Cognizant',           domain: 'cognizant.com',      locs: '1,5,2',  min: 1, max: 15, minsal: 4,  maxsal: 36  },
  { id: 8,  org: 'IBM India',           domain: 'ibm.com',            locs: '1,2,9',  min: 2, max: 20, minsal: 6,  maxsal: 50  },
  { id: 9,  org: 'Capgemini India',     domain: 'capgemini.com',      locs: '1,6,2',  min: 1, max: 14, minsal: 5,  maxsal: 40  },
  { id: 10, org: 'Mphasis',             domain: 'mphasis.com',        locs: '1,2',    min: 2, max: 10, minsal: 5,  maxsal: 30  },
  { id: 11, org: 'Flipkart',            domain: 'flipkart.com',       locs: '1',      min: 2, max: 10, minsal: 10, maxsal: 60  },
  { id: 12, org: 'Amazon India',        domain: 'amazon.in',          locs: '1,2,3',  min: 1, max: 12, minsal: 12, maxsal: 80  },
  { id: 13, org: 'Swiggy',             domain: 'swiggy.com',         locs: '1,2,4',  min: 1, max: 8,  minsal: 8,  maxsal: 45  },
  { id: 14, org: 'Zomato',             domain: 'zomato.com',         locs: '3,9',    min: 1, max: 8,  minsal: 8,  maxsal: 40  },
  { id: 15, org: 'Ola Cabs',           domain: 'olacabs.com',        locs: '1,2',    min: 2, max: 10, minsal: 8,  maxsal: 50  },
  { id: 16, org: 'Paytm',              domain: 'paytm.com',          locs: '9,3',    min: 1, max: 8,  minsal: 7,  maxsal: 40  },
  { id: 17, org: 'PhonePe',            domain: 'phonepe.com',        locs: '1',      min: 2, max: 8,  minsal: 10, maxsal: 55  },
  { id: 18, org: 'CRED',               domain: 'cred.club',          locs: '1',      min: 2, max: 8,  minsal: 12, maxsal: 60  },
  { id: 19, org: 'Razorpay',           domain: 'razorpay.com',       locs: '1',      min: 1, max: 6,  minsal: 10, maxsal: 50  },
  { id: 20, org: 'Meesho',             domain: 'meesho.com',         locs: '1',      min: 1, max: 6,  minsal: 8,  maxsal: 45  },
  { id: 21, org: 'Zerodha',            domain: 'zerodha.com',        locs: '1',      min: 2, max: 8,  minsal: 10, maxsal: 50  },
  { id: 22, org: 'Dream11',            domain: 'dream11.com',        locs: '2',      min: 2, max: 8,  minsal: 10, maxsal: 55  },
  { id: 23, org: 'Byju\'s',            domain: 'byjus.com',          locs: '1,2',    min: 1, max: 8,  minsal: 5,  maxsal: 30  },
  { id: 24, org: 'Unacademy',          domain: 'unacademy.com',      locs: '1',      min: 1, max: 6,  minsal: 5,  maxsal: 28  },
  { id: 25, org: 'Vedantu',            domain: 'vedantu.com',        locs: '1',      min: 1, max: 5,  minsal: 4,  maxsal: 22  },
  { id: 26, org: 'Freshworks',         domain: 'freshworks.com',     locs: '5,1',    min: 2, max: 12, minsal: 10, maxsal: 60  },
  { id: 27, org: 'Zoho Corporation',   domain: 'zoho.com',           locs: '5,13',   min: 0, max: 8,  minsal: 4,  maxsal: 30  },
  { id: 28, org: 'Nykaa',              domain: 'nykaa.com',          locs: '2,1',    min: 1, max: 6,  minsal: 6,  maxsal: 30  },
  { id: 29, org: 'PolicyBazaar',       domain: 'policybazaar.com',   locs: '10,3',   min: 1, max: 8,  minsal: 6,  maxsal: 35  },
  { id: 30, org: 'Lenskart',           domain: 'lenskart.com',       locs: '3,9',    min: 1, max: 6,  minsal: 5,  maxsal: 28  },
  { id: 31, org: 'ShareChat',          domain: 'sharechat.com',      locs: '1',      min: 2, max: 8,  minsal: 10, maxsal: 50  },
  { id: 32, org: 'InMobi',             domain: 'inmobi.com',         locs: '1',      min: 3, max: 10, minsal: 12, maxsal: 60  },
  { id: 33, org: 'Mu Sigma',           domain: 'mu-sigma.com',       locs: '1',      min: 0, max: 5,  minsal: 4,  maxsal: 20  },
  { id: 34, org: 'Mindtree',           domain: 'mindtree.com',       locs: '1,6',    min: 1, max: 12, minsal: 5,  maxsal: 35  },
  { id: 35, org: 'L&T Infotech',       domain: 'lntinfotech.com',    locs: '2,1',    min: 2, max: 15, minsal: 5,  maxsal: 38  },
  { id: 36, org: 'Hexaware',           domain: 'hexaware.com',       locs: '2,5',    min: 1, max: 12, minsal: 4,  maxsal: 30  },
  { id: 37, org: 'Persistent Systems', domain: 'persistent.com',     locs: '6,1',    min: 1, max: 10, minsal: 5,  maxsal: 32  },
  { id: 38, org: 'Zensar Technologies',domain: 'zensar.com',         locs: '6',      min: 1, max: 10, minsal: 4,  maxsal: 28  },
  { id: 39, org: 'Meredith Corp India',domain: 'meredith.com',       locs: '2',      min: 3, max: 12, minsal: 8,  maxsal: 40  },
  { id: 40, org: 'GlobalLogic',        domain: 'globallogic.com',    locs: '4,1,9',  min: 2, max: 15, minsal: 8,  maxsal: 50  },
  { id: 41, org: 'Expedia Group India',domain: 'expedia.com',        locs: '1',      min: 3, max: 12, minsal: 15, maxsal: 70  },
  { id: 42, org: 'Adobe India',        domain: 'adobe.com',          locs: '1,3',    min: 3, max: 15, minsal: 20, maxsal: 90  },
  { id: 43, org: 'SAP Labs India',     domain: 'sap.com',            locs: '1',      min: 2, max: 15, minsal: 15, maxsal: 70  },
  { id: 44, org: 'Oracle India',       domain: 'oracle.com',         locs: '1,6',    min: 2, max: 18, minsal: 12, maxsal: 65  },
  { id: 45, org: 'Microsoft India',    domain: 'microsoft.com',      locs: '1,4',    min: 3, max: 20, minsal: 20, maxsal: 100 },
  { id: 46, org: 'Google India',       domain: 'google.co.in',       locs: '1',      min: 2, max: 15, minsal: 25, maxsal: 120 },
  { id: 47, org: 'Meta India',         domain: 'meta.com',           locs: '1',      min: 3, max: 15, minsal: 25, maxsal: 120 },
  { id: 48, org: 'Walmart Global Tech',domain: 'walmart.com',        locs: '1',      min: 3, max: 15, minsal: 20, maxsal: 90  },
  { id: 49, org: 'Atlassian India',    domain: 'atlassian.com',      locs: '1',      min: 3, max: 12, minsal: 20, maxsal: 90  },
  { id: 50, org: 'Thoughtworks India', domain: 'thoughtworks.com',   locs: '1,5,4',  min: 0, max: 12, minsal: 8,  maxsal: 50  },
];

const insertCompany = db.prepare(`
  INSERT INTO company_profile
    (company_id, company_name, organisation, domain, status, min, max, minsal, maxsal,
     last_job_posted_date, company_location_ids, recruiter_count)
  VALUES (?, NULL, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
`);

const dates = [
  '2026-07-01', '2026-06-28', '2026-07-10', '2026-07-15',
  '2026-06-20', '2026-07-05', '2026-06-15', '2026-07-12',
  '2026-06-25', '2026-07-08'
];

companies.forEach((c, i) => {
  insertCompany.run(
    c.id, c.org, c.domain, c.min, c.max, c.minsal, c.maxsal,
    dates[i % dates.length] + ' 09:00:00',
    c.locs,
    Math.floor(Math.random() * 20) + 2
  );
});

// ── Seed recruiters (3 per company) ───────────────────────────────────────────
const firstNames = ['Priya', 'Rahul', 'Sneha', 'Amit', 'Divya', 'Karan', 'Anjali', 'Vikram', 'Pooja', 'Arjun'];
const lastNames  = ['Sharma', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Patel', 'Verma', 'Mehta', 'Nair', 'Reddy'];
const desigs     = ['HR Manager', 'Talent Acquisition', 'Senior Recruiter', 'HR Business Partner', 'TA Lead'];

const insertRec = db.prepare(`
  INSERT INTO recruiter_profile
    (id, recname, organisation, email, phone, status, date_created, designation,
     admin_type, company_status, domain, company_id, reg_source, company_name,
     location_ids, last_job_posted_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let recId = 1;
companies.forEach(c => {
  for (let j = 0; j < 3; j++) {
    const fn = firstNames[(recId + j) % firstNames.length];
    const ln = lastNames[(recId * j + 3) % lastNames.length];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${recId}@${c.domain}`;
    insertRec.run(
      recId, name, c.org, email, `+91-${9000000000 + recId}`,
      j === 0 ? 1 : 0,                 // first recruiter is active
      '2025-01-01 00:00:00',
      desigs[recId % desigs.length],
      1, 1, c.domain, c.id, 'web', c.org,
      c.locs,
      '2026-07-10 09:00:00'
    );
    recId++;
  }
});

db.close();
console.log(`✅  dummy.db created at ${DB_PATH}`);
console.log(`   Companies : ${companies.length}`);
console.log(`   Recruiters: ${recId - 1}`);
