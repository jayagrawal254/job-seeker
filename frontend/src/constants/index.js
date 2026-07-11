/**
 * Shared constants for the frontend.
 */

/** Default empty filter state for the companies page */
export const EMPTY_FILTERS = {
  search: '', status: '1', locations: [], lastPosted: null,
  minExp: undefined, maxExp: undefined, minSal: undefined, maxSal: undefined
};

/** Mail status -> antd Tag color mapping */
export const STATUS_COLORS = {
  pending: 'gold',
  sent: 'blue',
  opened: 'green',
  bounced: 'red',
  failed: 'volcano'
};
