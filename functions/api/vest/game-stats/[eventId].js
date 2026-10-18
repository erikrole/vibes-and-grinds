// /api/vest/game-stats/:eventId — Fetch ESPN game summary (box score + leaders)

import { readEventId } from '../../_http.js';
import { parseBoxScore } from '../_espn.js';
import { boxScoreCacheHit, boxScoreNeedsWrite } from '../_scoreWrites.js';

const ESPN_SUMMARY = 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

let schemaReady = false;

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
  schemaReady = true;
}

export function resetGameStatsState() {
  schemaReady = false;
}

export async function onRequestGet({ env, params }) {
  const eventId = readEventId(params.eventId);
  if (!eventId) return json({ error: 'Event id must be numeric' }, 400);

  try {
    await ensureTable(env.DB);

    const cached = await env.DB.prepare(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?'
    ).bind(eventId).first();

    if (boxScoreCacheHit(cached)) {
      return json({ stats: cached, source: 'cache' });
    }

    const res = await fetch(`${ESPN_SUMMARY}?event=${encodeURIComponent(eventId)}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (cached) return json({ stats: cached, source: 'cache-partial' });
      return json({ error: 'ESPN summary unavailable' }, 502);
    }

    const summary = await res.json();
    const updates = parseBoxScore(summary);
    if (!updates) {
      if (cached) return json({ stats: cached, source: 'cache-partial' });
      return json({ error: 'ESPN summary unavailable' }, 502);
    }

    if (!boxScoreNeedsWrite(cached, updates)) {
      return json({ stats: cached || updates, source: cached ? 'cache-partial' : 'espn' });
    }

    await env.DB.prepare(`
      UPDATE vest_game_stats SET
        wi_fg = ?, wi_3pt = ?, wi_ft = ?, wi_rebounds = ?, wi_turnovers = ?,
        wi_fg_pct = ?, wi_3pt_pct = ?, wi_ft_pct = ?,
        opp_fg = ?, opp_3pt = ?, opp_ft = ?, opp_rebounds = ?, opp_turnovers = ?,
        opp_fg_pct = ?, opp_3pt_pct = ?, opp_ft_pct = ?,
        wi_leader_pts_name = ?, wi_leader_pts_value = ?,
        wi_leader_reb_name = ?, wi_leader_reb_value = ?,
        wi_leader_ast_name = ?, wi_leader_ast_value = ?,
        wisconsin_h1 = ?, wisconsin_h2 = ?, opponent_h1 = ?, opponent_h2 = ?,
        ot_periods = ?,
        fetched_at = datetime('now')
      WHERE espn_event_id = ?
    `).bind(
      updates.wi_fg, updates.wi_3pt, updates.wi_ft, updates.wi_rebounds, updates.wi_turnovers,
      updates.wi_fg_pct, updates.wi_3pt_pct, updates.wi_ft_pct,
      updates.opp_fg, updates.opp_3pt, updates.opp_ft, updates.opp_rebounds, updates.opp_turnovers,
      updates.opp_fg_pct, updates.opp_3pt_pct, updates.opp_ft_pct,
      updates.wi_leader_pts_name, updates.wi_leader_pts_value,
      updates.wi_leader_reb_name, updates.wi_leader_reb_value,
      updates.wi_leader_ast_name, updates.wi_leader_ast_value,
      updates.wisconsin_h1, updates.wisconsin_h2, updates.opponent_h1, updates.opponent_h2,
      updates.ot_periods,
      eventId,
    ).run();

    const final = await env.DB.prepare(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?'
    ).bind(eventId).first();

    return json({ stats: final || { ...cached, ...updates }, source: 'espn' });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return json({ error: 'Failed to fetch game stats' }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
