/**
 * Replace {{recname}} and {{organisation}} placeholders in a text string.
 * Used by the send script for personalisation and could be used by a
 * future preview endpoint.
 */
function personalise(text, recruiter) {
    return String(text)
        .replace(/\{\{\s*recname\s*\}\}/gi, (recruiter && recruiter.recname) || 'there')
        .replace(/\{\{\s*organisation\s*\}\}/gi, (recruiter && recruiter.organisation) || 'your company');
}

module.exports = personalise;
