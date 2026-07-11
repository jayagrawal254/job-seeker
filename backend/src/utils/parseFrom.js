/**
 * Parse a "Name <email@x.com>" sender string into { name?, email }.
 * Shared by the mail service and the send script — previously duplicated.
 */
function parseFrom(from) {
    const m = String(from).match(/^(.*?)\s*<(.+@.+)>$/);
    return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: String(from).trim() };
}

module.exports = parseFrom;
