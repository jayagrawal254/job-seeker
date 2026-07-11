import dayjs from 'dayjs';

const COOKIE = 'reclyFilterPresets';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie() {
  const m = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='));
  if (!m) return {};
  try { return JSON.parse(decodeURIComponent(m.split('=').slice(1).join('='))); }
  catch { return {}; }
}

function writeCookie(obj) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(obj))}; path=/; max-age=${MAX_AGE}`;
}

// dayjs range -> plain strings for storage, and back.
function serialize(filters) {
  return {
    ...filters,
    lastPosted: filters.lastPosted?.[0] && filters.lastPosted?.[1]
      ? [filters.lastPosted[0].format('YYYY-MM-DD'), filters.lastPosted[1].format('YYYY-MM-DD')]
      : null
  };
}

function deserialize(saved) {
  return {
    search: '', status: '1', locations: [], lastPosted: null,
    minExp: undefined, maxExp: undefined, minSal: undefined, maxSal: undefined,
    ...saved,
    lastPosted: saved.lastPosted ? [dayjs(saved.lastPosted[0]), dayjs(saved.lastPosted[1])] : null
  };
}

export const getPresets = () => readCookie();

export function savePreset(name, filters) {
  const all = readCookie();
  all[name] = serialize(filters);
  writeCookie(all);
  return all;
}

export function deletePreset(name) {
  const all = readCookie();
  delete all[name];
  writeCookie(all);
  return all;
}

export const loadPreset = (name) => {
  const all = readCookie();
  return all[name] ? deserialize(all[name]) : null;
};
