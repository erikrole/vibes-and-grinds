/**
 * Get today's date as a YYYY-MM-DD string in local time.
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/**
 * Format a YYYY-MM-DD date string for display.
 * Parses manually to avoid timezone issues with Date.parse.
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', options || DEFAULT_FORMAT);
}

/**
 * Get a relative label for a YYYY-MM-DD date string.
 * Returns "Today", "Yesterday", or null for older dates.
 */
export function getRelativeLabel(dateStr: string): 'Today' | 'Yesterday' | null {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';

  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(y, m - 1, d);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'Yesterday';

  return null;
}
