// ESPN event.date is a UTC instant. A 7pm tip in Chicago is already the next
// UTC calendar day, so slicing the timestamp joins the box score to the
// following day's vest row — or to none. Vest dates are the Central game day.

const CENTRAL_TIME_ZONE = 'America/Chicago';
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_ZONE = /(?:z|[+-]\d{2}:?\d{2})$/i;

const centralFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CENTRAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Calendar day a game is played, in Central time.
 * A stored YYYY-MM-DD is already that day and is returned unchanged.
 * A zoned instant is converted. A date-time with no zone is read as UTC,
 * which is how ESPN writes tip-off times.
 */
export function centralGameDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (DATE_ONLY.test(text)) return text;

  let instantText = text;
  if (!HAS_ZONE.test(text) && /^\d{4}-\d{2}-\d{2}T/.test(text)) {
    instantText = `${text}Z`;
  }

  const instant = new Date(instantText);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = centralFormatter.formatToParts(instant);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Today's calendar day in Central time. Vest game days and the post-game
 * switch follow America/Chicago, not the browser zone or UTC.
 */
export function centralToday(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) return null;
  return centralGameDate(instant.toISOString());
}

/**
 * First vest row whose calendar day is the Central day of an ESPN instant.
 * Rows should already be in the priority order the caller wants; this does
 * not reorder them. Returns the vest game_id, or null.
 */
export function matchVestGameId(vestGames, espnDate) {
  const gameDay = centralGameDate(espnDate);
  if (!gameDay || !Array.isArray(vestGames)) return null;

  for (const game of vestGames) {
    if (centralGameDate(game?.date) !== gameDay) continue;
    const id = Number(game.game_id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}
