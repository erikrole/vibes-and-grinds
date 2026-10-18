// /api/vest/games - synced vest tracker storage in D1

import { readJsonBody } from '../_http.js';
import { planVestGameSync } from './_gameSync.js';

function mapRowToGame(row) {
  return {
    id: row.game_id,
    date: row.date,
    location: row.location || 'vs',
    opponent: row.opponent,
    ranking: row.ranking,
    outfit: row.outfit || '',
    result: row.result || '',
    overtime: Boolean(row.overtime),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT game_id, date, location, opponent, ranking, outfit, result, overtime
      FROM vest_games
      ORDER BY date ASC, game_id ASC
    `).all();

    return json({ games: results.map(mapRowToGame) });
  } catch (error) {
    console.error('Error fetching vest games:', error);
    return json({ error: 'Failed to fetch vest games' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const body = await readJsonBody(request);
  if (!body.ok) return json({ error: body.error }, body.status);

  try {
    const incoming = Array.isArray(body.value?.games) ? body.value.games : null;
    if (!incoming) return json({ error: 'Invalid payload. Expected { games: [] }' }, 400);

    const existing = await env.DB.prepare(`
      SELECT game_id, date, location, opponent, ranking, outfit, result, overtime
      FROM vest_games
    `).all();
    const plan = planVestGameSync(existing.results || [], incoming);
    if (plan.error) return json({ error: plan.error }, 400);

    const statements = [];
    for (const gameId of plan.deletes) {
      statements.push(env.DB.prepare('DELETE FROM vest_games WHERE game_id = ?').bind(gameId));
    }
    for (const game of plan.updates) {
      statements.push(env.DB.prepare(`
        UPDATE vest_games SET
          date = ?, location = ?, opponent = ?, ranking = ?, outfit = ?, result = ?, overtime = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE game_id = ?
      `).bind(
        game.date,
        game.location,
        game.opponent,
        game.ranking,
        game.outfit,
        game.result,
        game.overtime,
        game.gameId,
      ));
    }
    for (const game of plan.inserts) {
      statements.push(env.DB.prepare(`
        INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        game.gameId,
        game.date,
        game.location,
        game.opponent,
        game.ranking,
        game.outfit,
        game.result,
        game.overtime,
      ));
    }

    if (statements.length) await env.DB.batch(statements);

    return json({ success: true, saved: plan.saved, skipped: plan.skipped });
  } catch (error) {
    console.error('Error syncing vest games:', error);
    return json({ error: 'Failed to sync vest games' }, 500);
  }
}
