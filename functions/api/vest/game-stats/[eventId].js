// /api/vest/game-stats/:eventId — Fetch ESPN game summary (box score + leaders)

import {
  FETCH_TIMEOUT_MS,
  WISCONSIN_TEAM_ID as TEAM_ID,
  espnSummaryUrl,
} from '../../../../shared/constants.js';

function extractStat(stats, label) {
  if (!Array.isArray(stats)) return null;
  const entry = stats.find((s) => s.label === label || s.abbreviation === label);
  return entry?.displayValue || null;
}

function extractStatNum(stats, label) {
  const val = extractStat(stats, label);
  if (!val) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

async function ensureTable(db) {
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
}

export async function onRequestGet({ env, params }) {
  const eventId = params.eventId;

  try {
    await ensureTable(env.DB);

    const cached = await env.DB.prepare(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?'
    ).bind(eventId).first();

    if (cached?.wi_fg) {
      return json({ stats: cached, source: 'cache' });
    }

    const res = await fetch(espnSummaryUrl(eventId), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (cached) return json({ stats: cached, source: 'cache-partial' });
      return json({ error: 'ESPN summary unavailable' }, 502);
    }

    const summary = await res.json();
    const boxTeams = summary.boxscore?.teams || [];
    const wiBox = boxTeams.find((t) => String(t.team?.id) === TEAM_ID);
    const oppBox = boxTeams.find((t) => String(t.team?.id) !== TEAM_ID);
    const wiStats = wiBox?.statistics || [];
    const oppStats = oppBox?.statistics || [];

    const competition = summary.header?.competitions?.[0] || {};
    const competitors = competition.competitors || [];
    const wiComp = competitors.find((c) => String(c.id) === TEAM_ID);
    const wiLeaders = wiComp?.leaders || [];

    const pts = wiLeaders.find((l) => l.name === 'points' || l.abbreviation === 'PTS');
    const reb = wiLeaders.find((l) => l.name === 'rebounds' || l.abbreviation === 'REB');
    const ast = wiLeaders.find((l) => l.name === 'assists' || l.abbreviation === 'AST');

    const updates = {
      wi_fg: extractStat(wiStats, 'FG'),
      wi_3pt: extractStat(wiStats, '3PT'),
      wi_ft: extractStat(wiStats, 'FT'),
      wi_rebounds: extractStatNum(wiStats, 'REB'),
      wi_turnovers: extractStatNum(wiStats, 'TO'),
      wi_fg_pct: extractStatNum(wiStats, 'FG%'),
      wi_3pt_pct: extractStatNum(wiStats, '3PT%'),
      wi_ft_pct: extractStatNum(wiStats, 'FT%'),
      opp_fg: extractStat(oppStats, 'FG'),
      opp_3pt: extractStat(oppStats, '3PT'),
      opp_ft: extractStat(oppStats, 'FT'),
      opp_rebounds: extractStatNum(oppStats, 'REB'),
      opp_turnovers: extractStatNum(oppStats, 'TO'),
      opp_fg_pct: extractStatNum(oppStats, 'FG%'),
      opp_3pt_pct: extractStatNum(oppStats, '3PT%'),
      opp_ft_pct: extractStatNum(oppStats, 'FT%'),
      wi_leader_pts_name: pts?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_pts_value: pts?.leaders?.[0]?.displayValue || null,
      wi_leader_reb_name: reb?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_reb_value: reb?.leaders?.[0]?.displayValue || null,
      wi_leader_ast_name: ast?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_ast_value: ast?.leaders?.[0]?.displayValue || null,
    };

    if (cached) {
      await env.DB.prepare(`
        UPDATE vest_game_stats SET
          wi_fg = ?, wi_3pt = ?, wi_ft = ?, wi_rebounds = ?, wi_turnovers = ?,
          wi_fg_pct = ?, wi_3pt_pct = ?, wi_ft_pct = ?,
          opp_fg = ?, opp_3pt = ?, opp_ft = ?, opp_rebounds = ?, opp_turnovers = ?,
          opp_fg_pct = ?, opp_3pt_pct = ?, opp_ft_pct = ?,
          wi_leader_pts_name = ?, wi_leader_pts_value = ?,
          wi_leader_reb_name = ?, wi_leader_reb_value = ?,
          wi_leader_ast_name = ?, wi_leader_ast_value = ?,
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
        eventId,
      ).run();
    }

    const final = cached
      ? await env.DB.prepare('SELECT * FROM vest_game_stats WHERE espn_event_id = ?').bind(eventId).first()
      : { ...cached, ...updates };

    return json({ stats: final, source: 'espn' });
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
