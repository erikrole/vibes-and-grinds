// Full replace of vest_games without deleting espn_event_id or rewriting identical rows.
// The previous PUT deleted every row and inserted again, which dropped score links
// and was a new write even when the payload had not changed.

import { isIsoDate } from '../_shared.js';

const MAX_VEST_GAMES = 400;

function normalizeGameLocation(game) {
  const neutral = game?.neutralSite === true || game?.neutralSite === 'true' || `${game?.homeAway || ''}`.toLowerCase() === 'neutral';
  if (neutral) return 'N';
  const raw = `${game?.location ?? ''}`.trim();
  if (raw === 'N' || /^neutral$/i.test(raw)) return 'N';
  if (raw === '@' || /^away$/i.test(raw)) return '@';
  if (raw === '' || raw === 'vs' || /^home$/i.test(raw)) return 'vs';
  return raw;
}

function normalizeRanking(ranking) {
  if (ranking == null || ranking === '') return null;
  const parsed = Number.parseInt(ranking, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sameGame(existing, next) {
  const overtime = existing?.overtime ? 1 : 0;
  const ranking = existing?.ranking == null || existing.ranking === '' ? null : Number(existing.ranking);
  return `${existing?.date || ''}` === `${next.date || ''}`
    && `${existing?.location || ''}` === next.location
    && `${existing?.opponent || ''}` === next.opponent
    && ranking === next.ranking
    && `${existing?.outfit || ''}` === next.outfit
    && `${existing?.result || ''}` === next.result
    && overtime === next.overtime;
}

/**
 * Diff a vest game payload against the stored rows.
 * Duplicate ids keep the last copy. A non-empty date that is not a real
 * calendar day rejects the whole sync so a typo cannot delete that game.
 * Returns { error } or { inserts, updates, deletes, saved, skipped }.
 */
export function planVestGameSync(existingRows = [], incoming) {
  if (!Array.isArray(incoming)) {
    return { error: 'Invalid payload. Expected { games: [] }' };
  }
  if (incoming.length > MAX_VEST_GAMES) {
    return { error: `A season sync can include at most ${MAX_VEST_GAMES} games` };
  }

  const nextById = new Map();
  let skipped = 0;

  for (const game of incoming) {
    if (!game || typeof game !== 'object') {
      skipped += 1;
      continue;
    }
    const gameId = Number.parseInt(game.id, 10);
    const opponent = `${game.opponent || ''}`.trim();
    if (!Number.isFinite(gameId) || !opponent) {
      skipped += 1;
      continue;
    }

    const dateText = game.date == null || String(game.date).trim() === ''
      ? null
      : String(game.date).trim();
    if (dateText && !isIsoDate(dateText)) {
      return { error: `Game ${gameId} date must be a real YYYY-MM-DD day` };
    }

    if (nextById.has(gameId)) skipped += 1;
    nextById.set(gameId, {
      gameId,
      date: dateText,
      location: normalizeGameLocation(game),
      opponent,
      ranking: normalizeRanking(game.ranking),
      outfit: `${game.outfit || ''}`.trim(),
      result: `${game.result || ''}`.trim(),
      overtime: game.overtime ? 1 : 0,
    });
  }

  const existingById = new Map();
  for (const row of existingRows || []) {
    const id = Number(row?.game_id);
    if (Number.isFinite(id)) existingById.set(id, row);
  }

  const inserts = [];
  const updates = [];
  const deletes = [];

  for (const id of existingById.keys()) {
    if (!nextById.has(id)) deletes.push(id);
  }
  for (const [id, game] of nextById) {
    const existing = existingById.get(id);
    if (!existing) inserts.push(game);
    else if (!sameGame(existing, game)) updates.push(game);
  }

  return {
    inserts,
    updates,
    deletes,
    saved: nextById.size,
    skipped,
  };
}
