// Fields the vest games API stores. Compared so a reload of the same
// list does not DELETE and reinsert every row.

function normalizeRanking(ranking) {
  if (ranking === null || ranking === '' || ranking === undefined) return null;
  const parsed = Number.parseInt(ranking, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVestGame(game) {
  const id = Number.parseInt(game?.id, 10);
  return {
    id: Number.isFinite(id) ? id : null,
    date: game?.date || null,
    location: game?.location || 'vs',
    opponent: `${game?.opponent || ''}`.trim(),
    ranking: normalizeRanking(game?.ranking),
    outfit: `${game?.outfit || ''}`.trim(),
    result: game?.result || '',
    overtime: Boolean(game?.overtime),
  };
}

function vestGamesSignature(games) {
  const list = Array.isArray(games) ? games : [];
  return JSON.stringify(list.map(normalizeVestGame));
}

/**
 * Upload only after a successful read, and only when the local list
 * differs from what the server just returned. A failed read must not
 * push local or seed games over the stored table.
 */
/**
 * localStorage must be a game array. A parsed object or null used to throw
 * on the first render and the app error boundary replaced the whole page.
 */
export function readStoredVestGames(raw, seedGames) {
  if (raw == null || raw === '') return { games: seedGames, corrupted: false };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { games: seedGames, corrupted: true };
    return { games: parsed, corrupted: false };
  } catch {
    return { games: seedGames, corrupted: true };
  }
}

export function shouldSyncVestGames({ loadState, serverGames, games }) {
  if (loadState !== 'ready') return false;
  return vestGamesSignature(serverGames) !== vestGamesSignature(games);
}
