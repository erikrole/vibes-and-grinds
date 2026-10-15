import { json } from './auth.mjs';
import { toScheduleGames } from './vest-schedule.mjs';

const FEED = 'https://uwbadgers.com/calendar.ashx/calendar.ics';
// Sidearm sport ids -> the option values in the Add visit sport select.
export const FEEDS = [
  { id: 1, sport: 'Football' },
  { id: 3, sport: "Men's Basketball" },
  { id: 6, sport: "Men's Hockey" },
  { id: 11, sport: 'Track & Field' },
  { id: 4, sport: 'Cross Country' },
];

const chicagoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
const STATES = {
  Ala: 'AL', Ariz: 'AZ', Ark: 'AR', Calif: 'CA', Colo: 'CO', Conn: 'CT', Del: 'DE', Fla: 'FL', Ga: 'GA', Ill: 'IL', Ind: 'IN',
  Kan: 'KS', Ky: 'KY', La: 'LA', Md: 'MD', Mass: 'MA', Mich: 'MI', Minn: 'MN', Miss: 'MS', Mo: 'MO', Mont: 'MT', Neb: 'NE',
  Nev: 'NV', Okla: 'OK', Ore: 'OR', Pa: 'PA', Tenn: 'TN', Tex: 'TX', Va: 'VA', Wash: 'WA', Wis: 'WI', Wyo: 'WY',
};

const unfold = (text) => text.replace(/\r?\n[ \t]/g, '');
const unescape = (value = '') => value.replace(/\\([,;nN\\])/g, (_, c) => (c === 'n' || c === 'N' ? ' ' : c)).replace(/&amp;/g, '&').trim();

/** Sidearm sends UTC instants, or a bare date for all-day rows. Instants map to the Chicago calendar day. */
export function eventDate(line = '') {
  const [name, value = ''] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)];
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  if (hh === undefined || /VALUE=DATE/.test(name)) return `${y}-${m}-${d}`;
  const instant = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
  return Number.isNaN(instant.getTime()) ? null : chicagoDate.format(instant);
}

/** "State College, Pa., Beaver Stadium" -> "State College, PA". Unknown shapes pass through. */
export function cityFromLocation(location = '') {
  const parts = location.split(/,\s*/).map((part) => part.replace(/\s+-\s+.*$/, '').trim().replace(/\.$/, '')).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  const state = STATES[parts[1]] || (/^[A-Z]{2}$/.test(parts[1]) ? parts[1] : '');
  return state ? `${parts[0]}, ${state}` : parts.slice(0, 2).join(', ');
}

const isMadison = (location) => /^Madison\b/i.test(location);

function parseEvent(block, sport) {
  const field = (key) => {
    const line = block.split(/\r?\n/).find((row) => row.startsWith(`${key}:`) || row.startsWith(`${key};`));
    return line ? line : '';
  };
  const date = eventDate(field('DTSTART'));
  const summary = unescape(field('SUMMARY').replace(/^SUMMARY[^:]*:/, ''));
  const rawLocation = unescape(field('LOCATION').replace(/^LOCATION[^:]*:/, ''));
  const match = summary.match(/\bAthletics\s+.*?\s+(vs|at)\s+(.+)$/i) || summary.match(/\s(vs|at)\s+(.+)$/i);
  if (!date || !match) return null;
  const verb = match[1].toLowerCase();
  const opponent = match[2]
    .replace(/\s+-\s+.*$/, '') // " - Exhibition", " - Lambeau Field"
    .replace(/\s+Presented by .*$/i, '')
    .replace(/^#\d+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!opponent) return null;
  const home = verb === 'vs' && isMadison(rawLocation);
  return {
    date,
    sport,
    opponent,
    location: home ? 'vs' : verb === 'at' ? '@' : 'N',
    city: cityFromLocation(rawLocation),
    venue: rawLocation,
    source: 'badgers',
  };
}

export function parseSchedule(ics = '', sport = '') {
  const text = unfold(String(ics));
  const blocks = text.split('BEGIN:VEVENT').slice(1).map((chunk) => chunk.split('END:VEVENT')[0]);
  return blocks.map((block) => parseEvent(block, sport)).filter(Boolean);
}

async function loadFeed({ id, sport }, fetcher) {
  const response = await fetcher(`${FEED}?sport_id=${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VibesAndGrinds/1.0)' },
    signal: AbortSignal.timeout(8000),
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Feed ${id} unavailable`);
  return parseSchedule(await response.text(), sport);
}

async function espnBasketball(date, fetcher) {
  const season = Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) >= 7 ? 1 : 0);
  const response = await fetcher(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/275/schedule?season=${season}`,
    { signal: AbortSignal.timeout(8000), cf: { cacheTtl: 900, cacheEverything: true } },
  );
  if (!response.ok) throw new Error('ESPN unavailable');
  const payload = await response.json();
  return toScheduleGames(payload.events || [])
    .filter((game) => game.date === date)
    .map((game) => ({
      date: game.date,
      sport: "Men's Basketball",
      opponent: game.opponent,
      location: game.location,
      city: '',
      venue: '',
      source: 'espn',
    }));
}

/** Wisconsin games on one Chicago calendar day. Never throws: a dead feed just means no suggestions. */
export async function gamesOnDate(date, fetcher = fetch) {
  const results = await Promise.allSettled(FEEDS.map((feed) => loadFeed(feed, fetcher)));
  const games = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])).filter((game) => game.date === date);
  const basketballFailed = results[1].status === 'rejected';
  if (basketballFailed) {
    try { games.push(...await espnBasketball(date, fetcher)); } catch { /* fallback is best effort */ }
  }
  const seen = new Set();
  return games.filter((game) => {
    const key = `${game.sport}|${game.opponent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function gamesRoute(request, fetcher = fetch) {
  const date = new URL(request.url).searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Choose a valid date.', games: [] }, 400);
  const games = await gamesOnDate(date, fetcher);
  return json({ date, games });
}
