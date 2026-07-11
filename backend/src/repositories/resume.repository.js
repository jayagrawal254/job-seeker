/**
 * Resume repository — file-system operations for resume storage.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DIR = config.mail.resumesDir;

function ensureDir() {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

/**
 * List saved resumes with size + mtime.
 */
function listResumes() {
    ensureDir();
    return fs.readdirSync(DIR)
        .filter(f => !f.startsWith('.'))
        .map(f => {
            const st = fs.statSync(path.join(DIR, f));
            return { filename: f, sizeKb: Math.round(st.size / 1024), modified: st.mtime };
        })
        .sort((a, b) => b.modified - a.modified);
}

/**
 * Resolve a resume filename to an absolute path INSIDE the resumes dir (blocks traversal).
 * Returns null if not found or the name isn't a plain basename.
 */
function resolveResume(filename) {
    if (!filename) return null;
    const base = path.basename(filename);
    if (base !== filename) return null;
    const full = path.join(DIR, base);
    return fs.existsSync(full) ? full : null;
}

module.exports = { DIR, ensureDir, listResumes, resolveResume };
