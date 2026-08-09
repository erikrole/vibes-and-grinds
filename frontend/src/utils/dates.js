/**
 * Get today's date as a YYYY-MM-DD string in local time.
 */
export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string as local midnight.
 *
 * `new Date('2026-08-08')` is spec'd to parse as *UTC* midnight, which lands
 * on the previous day in any negative-offset timezone — so day-of-week, month
 * buckets and season boundaries all come out one day early in the US. Use this
 * anywhere the calendar fields of a stored date matter.
 *
 * Comparators (`new Date(a.date) - new Date(b.date)`) don't need it: both
 * sides shift equally, so the ordering is unchanged.
 */
export function parseLocalDate(dateStr) {
  const [year, month, day] = String(dateStr ?? '').split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day);
}

/**
 * Format a YYYY-MM-DD date string for display.
 */
export function formatDate(dateStr, options) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', options || {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get a relative label for a YYYY-MM-DD date string.
 * Returns "Today", "Yesterday", or null for older dates.
 */
export function getRelativeLabel(dateStr) {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';

  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(y, m - 1, d);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'Yesterday';

  return null;
}
