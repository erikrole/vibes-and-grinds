import { json } from './auth.mjs';
export const mapGame = (row) => ({ id: row.game_id, date: row.date, location: row.location || 'vs', opponent: row.opponent,
  ranking: row.ranking, outfit: row.outfit || '', result: row.result || '', overtime: Boolean(row.overtime), espn_event_id: row.espn_event_id });

export async function vestRoute(request, DB) {
  const revision = (await DB.prepare('SELECT revision FROM vest_state WHERE id = 1').first()).revision;
  if (request.method === 'GET') return json({ revision, games: (await DB.prepare('SELECT * FROM vest_games ORDER BY date ASC, game_id ASC').all()).results.map(mapGame) });
  if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);
  const payload = await request.json();
  const games = payload.games;
  if (!Array.isArray(games) || games.length > 500 || !Number.isInteger(payload.revision)) return json({ error: 'Reload the saved game list before editing.' }, 400);
  const seen = new Set();
  for (const game of games) {
    if (!Number.isSafeInteger(game.id) || game.id < 1 || seen.has(game.id) || typeof game.opponent !== 'string' || !game.opponent.trim()
      || !['', 'W', 'L'].includes(game.result || '') || !['vs', '@', 'N'].includes(game.location || 'vs')
      || (game.ranking != null && game.ranking !== '' && (!Number.isInteger(Number(game.ranking)) || Number(game.ranking) < 1))) return json({ error: 'Every game needs a unique ID and valid game details.' }, 400);
    seen.add(game.id);
  }
  if (payload.revision !== revision) return json({ error: 'The game list changed in another session. Reload before saving.' }, 409);
  const previous = (await DB.prepare('SELECT * FROM vest_games ORDER BY game_id').all()).results;
  const token = crypto.randomUUID();
  const locked = '(SELECT commit_token FROM vest_state WHERE id = 1) = ?';
  const ops = [DB.prepare('UPDATE vest_state SET commit_token = ? WHERE id = 1 AND revision = ?').bind(token, payload.revision),
    DB.prepare(`INSERT INTO vest_snapshots (games_json) SELECT ? WHERE ${locked}`).bind(JSON.stringify(previous), token)];
  if (games.length) ops.push(DB.prepare(`DELETE FROM vest_games WHERE game_id NOT IN (${games.map(() => '?').join(',')}) AND ${locked}`).bind(...games.map((game) => game.id), token));
  else ops.push(DB.prepare(`DELETE FROM vest_games WHERE ${locked}`).bind(token));
  for (const game of games) ops.push(DB.prepare(`INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, espn_event_id, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP WHERE ${locked}
    ON CONFLICT(game_id) DO UPDATE SET date=excluded.date, location=excluded.location, opponent=excluded.opponent,
      ranking=excluded.ranking, outfit=excluded.outfit, result=excluded.result, overtime=excluded.overtime,
      espn_event_id=COALESCE(excluded.espn_event_id, vest_games.espn_event_id), updated_at=CURRENT_TIMESTAMP`)
    .bind(game.id, game.date || null, game.location || 'vs', game.opponent.trim(), game.ranking ? Number(game.ranking) : null,
      game.outfit || '', game.result || '', game.overtime ? 1 : 0, game.espn_event_id || null, token));
  ops.push(DB.prepare(`UPDATE vest_state SET revision = revision + 1, commit_token = NULL WHERE id = 1 AND ${locked}`).bind(token));
  const results = await DB.batch(ops);
  if (!results[results.length - 1].meta.changes) return json({ error: 'The game list changed in another session. Reload before saving.' }, 409);
  return json({ success: true, saved: games.length, revision: revision + 1 });
}
