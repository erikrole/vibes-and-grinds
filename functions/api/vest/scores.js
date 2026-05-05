// /api/vest/scores — Fetch ESPN schedule+scores, cache in D1, return merged with vest data

const TEAM_ID = '275';
const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${TEAM_ID}/schedule`;

function parseEspnEvent(event) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const badgers = competitors.find((c) => String(c.team?.id) === TEAM_ID);
  const opponent = competitors.find((c) => String(c.team?.id) !== TEAM_ID);
  if (!badgers || !opponent) return null;

  const isCompleted = competition.status?.type?.completed;
  const statusDesc = competition.status?.type?.description || '';

  const wiScore = Number(badgers.score);
  const oppScore = Number(opponent.score);
  const wiLine = Array.isArray(badgers.linescores) ? badgers.linescores : [];
  const oppLine = Array.isArray(opponent.linescores) ? opponent.linescores : [];
  const venue = competition.venue;
  const broadcasts = competition.broadcasts || [];

  return {
    espnEventId: String(event.id),
    date: event.date,
    completed: Boolean(isCompleted),
    result: isCompleted && Number.isFinite(wiScore) && Number.isFinite(oppScore)
      ? (wiScore > oppScore ? 'W' : 'L') : '',
    wisconsinScore: Number.isFinite(wiScore) ? wiScore : null,
    opponentScore: Number.isFinite(oppScore) ? oppScore : null,
    wisconsinH1: wiLine[0]?.value ?? null,
    wisconsinH2: wiLine[1]?.value ?? null,
    opponentH1: oppLine[0]?.value ?? null,
    opponentH2: oppLine[1]?.value ?? null,
    otPeriods: Math.max(0, wiLine.length - 2),
    venue: venue?.fullName || null,
    venueCity: venue?.address?.city || null,
    broadcast: broadcasts[0]?.names?.[0] || broadcasts[0]?.name || null,
    attendance: competition.attendance || null,
    oppRanking: opponent.curatedRank?.current ?? null,
    wiRanking: badgers.curatedRank?.current ?? null,
    wiRecord: badgers.records?.[0]?.summary || null,
  };
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const season = url.searchParams.get('season') || '2025';

  try {
    const espnRes = await fetch(`${ESPN_URL}?season=${season}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!espnRes.ok) {
      const cached = await getCached(env.DB);
      if (cached.length) return json({ games: cached, source: 'cache' });
      return json({ error: 'ESPN unavailable' }, 502);
    }

    const data = await espnRes.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const parsed = events.map(parseEspnEvent).filter(Boolean);

    // Upsert completed games
    for (const game of parsed) {
      if (!game.completed) continue;

      const vestGame = await env.DB.prepare(
        'SELECT game_id FROM vest_games WHERE date = ? LIMIT 1'
      ).bind(game.date?.slice(0, 10)).first();

      if (vestGame) {
        await env.DB.prepare(
          'UPDATE vest_games SET espn_event_id = ? WHERE game_id = ?'
        ).bind(game.espnEventId, vestGame.game_id).run();
      }

      await env.DB.prepare(`
        INSERT INTO vest_game_stats (
          espn_event_id, game_id, wisconsin_score, opponent_score,
          wisconsin_h1, wisconsin_h2, opponent_h1, opponent_h2,
          ot_periods, venue, venue_city, broadcast, attendance,
          opp_ranking, wi_ranking, wi_record, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(espn_event_id) DO UPDATE SET
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
        game.espnEventId, vestGame?.game_id || null,
        game.wisconsinScore, game.opponentScore,
        game.wisconsinH1, game.wisconsinH2, game.opponentH1, game.opponentH2,
        game.otPeriods, game.venue, game.venueCity, game.broadcast, game.attendance,
        game.oppRanking, game.wiRanking, game.wiRecord,
      ).run();
    }

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
