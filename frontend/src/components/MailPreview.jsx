const DUMMY = { recname: 'Priya Sharma', organisation: 'Acme Corp' };

const fill = text => String(text || '')
  .replace(/\{\{\s*recname\s*\}\}/gi, DUMMY.recname)
  .replace(/\{\{\s*organisation\s*\}\}/gi, DUMMY.organisation);

/**
 * Live preview of a mail with placeholders filled by dummy values, so you see
 * roughly what a recruiter receives. Body is rendered as HTML.
 */
export default function MailPreview({ subject, body }) {
  if (!subject && !body) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
        Preview (dummy values: {DUMMY.recname} / {DUMMY.organisation})
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#f3f4f6', padding: 16, maxHeight: 460, overflow: 'auto' }}>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
          <b>Subject:</b> {fill(subject) || <span style={{ color: '#bbb' }}>(empty)</span>}
        </div>
        <div dangerouslySetInnerHTML={{ __html: fill(body) }} />
      </div>
    </div>
  );
}
