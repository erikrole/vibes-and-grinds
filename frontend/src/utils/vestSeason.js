const CHICAGO = 'America/Chicago';

function chicagoParts(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHICAGO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month') };
}

/** NCAA season end year. July opens the next season (2026-11-02 → 2027). */
export function seasonEndYear(dateStr) {
  const [year, month] = String(dateStr ?? '').split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return month >= 7 ? year + 1 : year;
}

export function seasonLabel(endYear) {
  const end = Number(endYear);
  if (!Number.isFinite(end)) return '';
  const short = (year) => String(year).slice(-2);
  return `${short(end - 1)}–${short(end)}`;
}

export function seasonTitle(endYear) {
  const end = Number(endYear);
  if (!Number.isFinite(end)) return '';
  return `${end - 1}–${String(end).slice(-2)}`;
}

export function currentSeasonEndYear(now = new Date()) {
  const { year, month } = chicagoParts(now);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return month >= 7 ? year + 1 : year;
}

export function dominantSeasonLabel(games) {
  const years = [...new Set((games || []).map((game) => seasonEndYear(game?.date)).filter(Boolean))];
  if (years.length === 1) return seasonLabel(years[0]);
  if (years.length > 1) return 'All seasons';
  return '';
}

export function seasonHasCompletedGames(games, endYear) {
  return (games || []).some(
    (game) => (game.result === 'W' || game.result === 'L') && seasonEndYear(game.date) === endYear,
  );
}

export function vestSeasonFromSearch(search, now = new Date()) {
  const raw = new URLSearchParams(String(search || '').replace(/^\?/, '')).get('vestSeason');
  const year = Number(raw);
  if (Number.isInteger(year) && year >= 1900 && year <= 2100) return year;
  return currentSeasonEndYear(now);
}

export function seasonChoices(games, selected, now = new Date()) {
  const years = (games || []).map((game) => seasonEndYear(game?.date)).filter(Boolean);
  return [...new Set([currentSeasonEndYear(now), selected, ...years].filter(Boolean))].sort((a, b) => b - a);
}
