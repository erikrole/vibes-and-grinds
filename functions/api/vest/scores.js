// /api/vest/scores — Fetch ESPN schedule+scores, cache in D1, return merged with vest data

import { readSeason } from '../_http.js';
import { parseEspnEvent, WISCONSIN_TEAM_ID } from './_espn.js';
import {
  newestFetchedAtMs,
  planScoreSync,
  SCORE_CACHE_TTL_MS,
  shouldServeCachedScores,
} from './_scoreWrites.js';

const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${WISCONSIN_TEAM_ID}/schedule`;

let schemaReady = false;
let memoryCheckedAt = 0;

async function ensureTable(db) {
  if (schemaReady) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS vest_game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      espn_event_id TEXT NOT NULL UNIQUE,
      game_id INTEGER,
      wisconsin_score INTEGER, opponent_score INTEGER,
      wisconsin_h1 INTEGER, wisconsin_h2 INTEGER,
      opponent_h1 INTEGER, opponent_h2 INTEGER,
      ot_periods INTEGER DEFAULT 0,
      venue TEXT, venue_city TEXT, broadcast TEXT, attendance INTEGER,
      opp_ranking INTEGER, wi_ranking INTEGER, wi_record TEXT,
      wi_fg TEXT, wi_3pt TEXT, wi_ft TEXT,
      wi_rebounds INTEGER, wi_turnovers INTEGER,
      wi_fg_pct REAL, wi_3pt_pct REAL, wi_ft_pct REAL,
      opp_fg TEXT, opp_3pt TEXT, opp_ft TEXT,
      opp_rebounds INTEGER, opp_turnovers INTEGER,
      opp_fg_pct REAL, opp_3pt_pct REAL, opp_ft_pct REAL,
      wi_leader_pts_name TEXT, wi_leader_pts_value TEXT,
      wi_leader_reb_name TEXT, wi_leader_reb_value TEXT,
      wi_leader_ast_name TEXT, wi_leader_ast_value TEXT,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Add espn_event_id column to vest_games if missing
  try {
    await db.prepare(
      'ALTER TABLE vest_games ADD COLUMN espn_event_id TEXT'
    ).run();
  } catch { /* column already exists */ }
  schemaReady = true;
}

export function resetScoreRouteState() {
  schemaReady = false;
  memoryCheckedAt = 0;
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const season = readSeason(url.searchParams.get('season'));
  if (!season) return json({ error: 'Season must be a 4-digit year' }, 400);

  try {
    await ensureTable(env.DB);
    const cachedBefore = await getCached(env.DB);
    const now = Date.now();
    if (shouldServeCachedScores({
      rowCount: cachedBefore.length,
      newestFetchedAtMs: newestFetchedAtMs(cachedBefore),
      memoryCheckedAtMs: memoryCheckedAt,
      now,
      ttlMs: SCORE_CACHE_TTL_MS,
    })) {
      return json({ games: cachedBefore, source: 'cache' });
    }

    const espnRes = await fetch(`${ESPN_URL}?season=${season}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!espnRes.ok) {
      const cached = await getCached(env.DB);
      if (cached.length) return json({ games: cached, source: 'cache' });
      return json({ error: 'ESPN unavailable' }, 502);
    }

    const data = await espnRes.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    const parsed = events.map((event) => parseEspnEvent(event)).filter(Boolean);

    const vestQuery = await env.DB.prepare(
      'SELECT game_id, date, espn_event_id FROM vest_games ORDER BY game_id ASC'
    ).all();
    const vestRows = Array.isArray(vestQuery?.results) ? vestQuery.results : [];
    const existingStats = await env.DB.prepare('SELECT * FROM vest_game_stats').all();
    const plan = planScoreSync({
      vestRows,
      existingStats: Array.isArray(existingStats?.results) ? existingStats.results : [],
      games: parsed,
    });

    for (const clear of plan.clears) {
      await env.DB.prepare(
        'UPDATE vest_games SET espn_event_id = NULL WHERE espn_event_id = ? AND game_id != ?'
      ).bind(clear.espnEventId, clear.gameId).run();
    }
    for (const link of plan.links) {
      await env.DB.prepare(
        'UPDATE vest_games SET espn_event_id = ? WHERE game_id = ?'
      ).bind(link.espnEventId, link.gameId).run();
    }
    for (const { game, gameId } of plan.upserts) {
      await env.DB.prepare(`
        INSERT INTO vest_game_stats (
          espn_event_id, game_id, wisconsin_score, opponent_score,
          wisconsin_h1, wisconsin_h2, opponent_h1, opponent_h2,
          ot_periods, venue, venue_city, broadcast, attendance,
          opp_ranking, wi_ranking, wi_record, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(espn_event_id) DO UPDATE SET
          game_id = excluded.game_id,
          wisconsin_score = excluded.wisconsin_score,
          opponent_score = excluded.opponent_score,
          wisconsin_h1 = excluded.wisconsin_h1,
          wisconsin_h2 = excluded.wisconsin_h2,
          opponent_h1 = excluded.opponent_h1,
          opponent_h2 = excluded.opponent_h2,
          ot_periods = excluded.ot_periods,
          venue = excluded.venue,
          venue_city = excluded.venue_city,
          broadcast = excluded.broadcast,
          attendance = excluded.attendance,
          opp_ranking = excluded.opp_ranking,
          wi_ranking = excluded.wi_ranking,
          wi_record = excluded.wi_record,
          fetched_at = datetime('now')
      `).bind(
        game.espnEventId, gameId,
        game.wisconsinScore, game.opponentScore,
        game.wisconsinH1, game.wisconsinH2, game.opponentH1, game.opponentH2,
        game.otPeriods, game.venue, game.venueCity, game.broadcast, game.attendance,
        game.oppRanking, game.wiRanking, game.wiRecord,
      ).run();
    }

    memoryCheckedAt = Date.now();

    const merged = await getCached(env.DB);
    return json({ games: merged, source: 'espn' });
  } catch (error) {
    console.error('Error fetching vest scores:', error);
    try {
      const cached = await getCached(env.DB);
      if (cached.length) return json({ games: cached, source: 'cache' });
    } catch { /* ignore */ }
    return json({ error: 'Failed to fetch scores' }, 502);
  }
}

async function getCached(db) {
  const { results } = await db.prepare(`
    SELECT s.*, v.outfit, v.game_id, v.opponent, v.date, v.location, v.result, v.overtime
    FROM vest_game_stats s
    LEFT JOIN vest_games v ON v.espn_event_id = s.espn_event_id
    ORDER BY v.date ASC, s.id ASC
  `).all();
  return results;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
