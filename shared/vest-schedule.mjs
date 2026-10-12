import { json } from './auth.mjs';

const TEAM_ID = '275';
const SCHEDULE = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/schedule`;
const chicagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const easternClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const part = (parts, type) => parts.find((item) => item.type === type)?.value;

/** ESPN leaves unreleased tip times at midnight Eastern, which is still the previous evening in Chicago. */
export function scheduleDate(iso, completed = false) {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return null;
  const eastern = easternClock.formatToParts(instant);
  const hour = Number(part(eastern, 'hour'));
  const minute = Number(part(eastern, 'minute'));
  const easternDay = `${part(eastern, 'year')}-${part(eastern, 'month')}-${part(eastern, 'day')}`;
  if (!completed && (hour === 0 || hour === 24) && minute === 0) return easternDay;
  return chicagoDate.format(instant);
}

export function toScheduleGame(event) {
  const competition = event?.competitions?.[0];
  const wisconsin = competition?.competitors?.find((team) => String(team.team?.id) === TEAM_ID);
  const opponent = competition?.competitors?.find((team) => String(team.team?.id) !== TEAM_ID);
  if (!event?.id || !wisconsin || !opponent || !event.date) return null;
  const completed = Boolean(competition.status?.type?.completed);
  const date = scheduleDate(event.date, completed);
  const name = opponent.team?.location || opponent.team?.shortDisplayName || opponent.team?.displayName;
  if (!date || !name) return null;
  const wisconsinScore = Number(wisconsin.score?.value ?? wisconsin.score);
  const opponentScore = Number(opponent.score?.value ?? opponent.score);
  let result = '';
  if (completed && Number.isFinite(wisconsinScore) && Number.isFinite(opponentScore)) {
    result = wisconsinScore > opponentScore ? 'W' : 'L';
  }
  const rank = Number(opponent.curatedRank?.current);
  return {
    id: `espn-${event.id}`,
    espnEventId: String(event.id),
    date,
    opponent: name,
    location: competition.neutralSite ? 'N' : wisconsin.homeAway === 'home' ? 'vs' : '@',
    result,
    ranking: Number.isInteger(rank) && rank >= 1 && rank <= 25 ? rank : null,
    source: 'espn',
  };
}

export function toScheduleGames(events = []) {
  const seen = new Set();
  const games = [];
  for (const event of events) {
    const game = toScheduleGame(event);
    if (!game || seen.has(game.espnEventId)) continue;
    seen.add(game.espnEventId);
    games.push(game);
  }
  return games.sort((a, b) => a.date.localeCompare(b.date) || a.espnEventId.localeCompare(b.espnEventId));
}

export function seasonTitle(endYear) {
  const end = Number(endYear);
  if (!Number.isFinite(end)) return '';
  return `${end - 1}–${String(end).slice(-2)}`;
}

async function loadEvents(season, fetcher) {
  const batches = await Promise.all([2, 3].map(async (type) => {
    try {
      const response = await fetcher(`${SCHEDULE}?season=${season}&seasontype=${type}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        if (type === 2) throw new Error('ESPN unavailable');
        return [];
      }
      const payload = await response.json();
      return payload.events || [];
    } catch (error) {
      if (type === 2) throw error;
      return [];
    }
  }));
  return batches.flat();
}

export async function vestScheduleRoute(request, fetcher = fetch) {
  const requested = new URL(request.url).searchParams.get('season');
  const today = chicagoDate.format(new Date());
  const [year, month] = today.split('-').map(Number);
  const current = month >= 7 ? year + 1 : year;
  const season = requested || String(current);
  if (!/^\d{4}$/.test(season) || Number(season) < 1900 || Number(season) > 2100) {
    return json({ error: 'Choose a valid season.' }, 400);
  }
  try {
    const events = toScheduleGames(await loadEvents(season, fetcher));
    return json({
      season: Number(season),
      label: seasonTitle(season),
      events,
      source: 'espn',
    }, 200, { 'Cache-Control': 'public, max-age=900' });
  } catch (error) {
    return json({ error: 'Schedule is unavailable.', details: error.message, events: [] }, 502);
  }
}
