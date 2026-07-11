/**
 * Shared date/text formatting utilities.
 * Eliminates duplicated formatting logic across page components.
 */

/** Format a date to YYYY-MM-DD (date only) */
export const dateOnly = d => (d ? String(d).replace('T', ' ').slice(0, 10) : null);

/** Format a date to YYYY-MM-DD HH:MM:SS (date + time) */
export const dateTime = d => (d ? String(d).replace('T', ' ').slice(0, 19) : '—');

/** Dash placeholder for missing values */
export const dash = v => v ?? '—';
