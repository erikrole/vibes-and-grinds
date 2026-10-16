// Season boundaries for the journal. A season rolls over on July 1 and only
// counts road trips. Kept separate from the season report so the entry bundle
// can show the review link without loading that report.

import { parseLocalDate } from './dates';
import { isHomeVisit } from './visitTypes';

export function getSeasonVisits(visits = []) {
  return visits.filter((visit) => !isHomeVisit(visit));
}

/**
 * Map a date to its season label. Seasons roll over July 1.
 * e.g. Sep 2025 → "2025-26", Feb 2026 → "2025-26"
 * Accepts a YYYY-MM-DD string or a Date (local calendar fields).
 */
export function getSeasonForDate(date) {
  const d = date instanceof Date ? date : parseLocalDate(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function getCurrentSeason() {
  return getSeasonForDate(new Date());
}

export function getAvailableSeasons(visits) {
  const seasons = new Set(getSeasonVisits(visits).map((visit) => getSeasonForDate(visit.date)));
  return [...seasons].sort((a, b) => b.localeCompare(a));
}
