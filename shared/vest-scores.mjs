import { json } from './auth.mjs';

const TEAM_ID = '275';
const SCHEDULE = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/schedule`;
const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const number = (value) => {
  const raw = value?.value ?? value;
  return raw == null || raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw);
};

export function seasonForDate(date) {
  const [year, month] = String(date || '').split('-').map(Number);
  return year && month ? year + (month >= 7 ? 1 : 0) : null;
}

export function parseScheduleEvent(event) {
  const competition = event.competitions?.[0];
  const wi = competition?.competitors?.find((c) => String(c.team?.id) === TEAM_ID);
  const opponent = competition?.competitors?.find((c) => String(c.team?.id) !== TEAM_ID);
  if (!wi || !opponent || !event.id || !Number.isFinite(Date.parse(event.date))) return null;
  const wiLine = wi.linescores || [], oppLine = opponent.linescores || [];
  return {
    espnEventId: String(event.id), date: calendar.format(new Date(event.date)),
    opponentNames: [opponent.team.location, opponent.team.shortDisplayName, opponent.team.displayName].filter(Boolean),
    completed: Boolean(competition.status?.type?.completed),
    wisconsinScore: number(wi.score), opponentScore: number(opponent.score),
    wisconsinH1: number(wiLine[0]), wisconsinH2: number(wiLine[1]),
    opponentH1: number(oppLine[0]), opponentH2: number(oppLine[1]),
    otPeriods: Math.max(0, wiLine.length - 2, (number(competition.status?.period) ?? 2) - 2),
    venue: competition.venue?.fullName || null, venueCity: competition.venue?.address?.city || null,
    broadcast: competition.broadcasts?.[0]?.names?.[0] || competition.broadcasts?.[0]?.media?.shortName || null,
    attendance: competition.attendance || null,
    oppRanking: opponent.curatedRank?.current ?? null, wiRanking: wi.curatedRank?.current ?? null,
    wiRecord: wi.records?.[0]?.summary || null,
  };
}

const lineValue = (entry) => {
  const raw = entry?.value ?? entry?.displayValue ?? entry;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

// ESPN's season schedule often omits linescores. The summary payload has them.
export function linesFromSummary(summary) {
  const competitors = summary?.header?.competitions?.[0]?.competitors || [];
  const teamId = (competitor) => String(competitor?.team?.id ?? competitor?.id ?? '');
  const wi = competitors.find((competitor) => teamId(competitor) === TEAM_ID);
  const opponent = competitors.find((competitor) => teamId(competitor) && teamId(competitor) !== TEAM_ID);
  if (!wi || !opponent) return null;
  const wisconsinH1 = lineValue(wi.linescores?.[0]);
  const opponentH1 = lineValue(opponent.linescores?.[0]);
  if (wisconsinH1 == null || opponentH1 == null) return null;
  return {
    wisconsinH1,
    wisconsinH2: lineValue(wi.linescores?.[1]),
    opponentH1,
    opponentH2: lineValue(opponent.linescores?.[1]),
  };
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index]);
    }
  }));
  return out;
}

export function matchesSavedGame(event, game) {
  return event.espnEventId === String(game.espn_event_id || '') && event.date === game.date
    && event.opponentNames.some((name) => normalize(name) === normalize(game.opponent));
}

export async function vestScoresRoute(request, DB, fetcher = fetch) {
  const { results: saved } = await DB.prepare('SELECT * FROM vest_games ORDER BY date DESC').all();
  const requested = new URL(request.url).searchParams.get('season');
  const season = requested || String(seasonForDate(saved[0]?.date) || seasonForDate(calendar.format(new Date())));
  if (!/^\d{4}$/.test(season) || Number(season) < 1900 || Number(season) > 2100) return json({ error: 'Choose a valid season.' }, 400);
  const start = `${Number(season) - 1}-07-01`, end = `${season}-07-01`;
  const cached = async () => (await DB.prepare(`SELECT s.*, v.outfit, v.game_id, v.opponent, v.date, v.location, v.result, v.overtime
    FROM vest_game_stats s JOIN vest_games v ON v.espn_event_id = s.espn_event_id
    WHERE v.date >= ? AND v.date < ? ORDER BY v.date, v.game_id`).bind(start, end).all()).results;
  try {
    // ESPN separates NCAA tournament games from the regular/conference schedule.
    const schedules = await Promise.all([2, 3].map(async (type) => {
      const response = await fetcher(`${SCHEDULE}?season=${season}&seasontype=${type}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('ESPN unavailable');
      return response.json();
    }));
    const events = new Map(schedules.flatMap((data) => data.events || []).map((event) => [String(event.id), event]));
    const known = await DB.prepare('SELECT espn_event_id FROM vest_game_stats WHERE wisconsin_h1 IS NOT NULL').all();
    const knownH1 = new Set((known.results || []).map((row) => String(row.espn_event_id)));
    const pending = [];
    for (const raw of events.values()) {
      const event = parseScheduleEvent(raw);
      if (!event?.completed || event.wisconsinScore == null || event.opponentScore == null) continue;
      const game = saved.find((game) => matchesSavedGame(event, game));
      if (!game || game.date < start || game.date >= end) continue;
      pending.push({ event, game });
    }
    const missingHalf = pending.filter((row) => row.event.wisconsinH1 == null && !knownH1.has(row.event.espnEventId)).slice(0, 8);
    await mapPool(missingHalf, 4, async (row) => {
      try {
        const response = await fetcher(`${SUMMARY}?event=${encodeURIComponent(row.event.espnEventId)}`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return;
        const lines = linesFromSummary(await response.json());
        if (lines) Object.assign(row.event, lines);
      } catch { /* Final score still saves when the summary is missing. */ }
    });
    for (const { event, game } of pending) {
      // Reading supplementary scores never edits owner game records.
      await DB.prepare(`INSERT INTO vest_game_stats (
        espn_event_id, game_id, wisconsin_score, opponent_score, wisconsin_h1, wisconsin_h2,
        opponent_h1, opponent_h2, ot_periods, venue, venue_city, broadcast, attendance,
        opp_ranking, wi_ranking, wi_record, fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(espn_event_id) DO UPDATE SET game_id=excluded.game_id,
        wisconsin_score=excluded.wisconsin_score, opponent_score=excluded.opponent_score,
        wisconsin_h1=COALESCE(excluded.wisconsin_h1, vest_game_stats.wisconsin_h1),
        wisconsin_h2=COALESCE(excluded.wisconsin_h2, vest_game_stats.wisconsin_h2),
        opponent_h1=COALESCE(excluded.opponent_h1, vest_game_stats.opponent_h1),
        opponent_h2=COALESCE(excluded.opponent_h2, vest_game_stats.opponent_h2),
        ot_periods=excluded.ot_periods, venue=excluded.venue, venue_city=excluded.venue_city,
        broadcast=excluded.broadcast, attendance=excluded.attendance,
        opp_ranking=excluded.opp_ranking, wi_ranking=excluded.wi_ranking,
        wi_record=excluded.wi_record, fetched_at=CURRENT_TIMESTAMP`).bind(
        event.espnEventId, game.game_id, event.wisconsinScore, event.opponentScore,
        event.wisconsinH1, event.wisconsinH2, event.opponentH1, event.opponentH2,
        event.otPeriods, event.venue, event.venueCity, event.broadcast, event.attendance,
        event.oppRanking, event.wiRanking, event.wiRecord,
      ).run();
    }
    return json({ games: await cached(), source: 'espn', season });
  } catch {
    const games = await cached();
    return games.length ? json({ games, source: 'cache', season }) : json({ error: 'ESPN scores are unavailable. Try again later.' }, 502);
  }
}
