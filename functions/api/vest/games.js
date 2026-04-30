// /api/vest/games - synced vest tracker storage in D1

import { json, jsonError } from '../../../shared/http.js';

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
    return jsonError('Failed to fetch vest games');
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const payload = await request.json();
    const incoming = Array.isArray(payload?.games) ? payload.games : null;

    if (!incoming) {
      return jsonError('Invalid payload. Expected { games: [] }', 400);
    }

    const stmt = env.DB.prepare(`
      INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const ops = [env.DB.prepare('DELETE FROM vest_games')];
    for (const game of incoming) {
      const gameId = Number.parseInt(game.id, 10);
      const ranking = game.ranking === null || game.ranking === '' || game.ranking === undefined
        ? null
        : Number.parseInt(game.ranking, 10);

      if (!Number.isFinite(gameId) || !`${game.opponent || ''}`.trim()) continue;

      ops.push(
        stmt.bind(
          gameId,
          game.date || null,
          game.location || 'vs',
          `${game.opponent}`.trim(),
          Number.isFinite(ranking) ? ranking : null,
          `${game.outfit || ''}`.trim(),
          game.result || '',
          game.overtime ? 1 : 0
        )
      );
    }

    await env.DB.batch(ops);

    return json({ success: true, saved: incoming.length });
  } catch (error) {
    console.error('Error syncing vest games:', error);
    return jsonError('Failed to sync vest games');
  }
}
