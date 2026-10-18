// Decide which D1 writes a scores or box-score GET actually needs.
// Opening the page used to upsert every completed game and restamp fetched_at.

import { matchVestGameId } from './_centralDate.js';

export const SCORE_CACHE_TTL_MS = 2 * 60 * 1000;

const STAT_FIELDS = [
  ['wisconsin_score', 'wisconsinScore'],
  ['opponent_score', 'opponentScore'],
  ['wisconsin_h1', 'wisconsinH1'],
  ['wisconsin_h2', 'wisconsinH2'],
  ['opponent_h1', 'opponentH1'],
  ['opponent_h2', 'opponentH2'],
  ['ot_periods', 'otPeriods'],
  ['venue', 'venue'],
  ['venue_city', 'venueCity'],
  ['broadcast', 'broadcast'],
  ['attendance', 'attendance'],
  ['opp_ranking', 'oppRanking'],
  ['wi_ranking', 'wiRanking'],
  ['wi_record', 'wiRecord'],
];

export const BOX_SCORE_FIELDS = [
  'wi_fg', 'wi_3pt', 'wi_ft', 'wi_rebounds', 'wi_turnovers',
  'wi_fg_pct', 'wi_3pt_pct', 'wi_ft_pct',
  'opp_fg', 'opp_3pt', 'opp_ft', 'opp_rebounds', 'opp_turnovers',
  'opp_fg_pct', 'opp_3pt_pct', 'opp_ft_pct',
  'wi_leader_pts_name', 'wi_leader_pts_value',
  'wi_leader_reb_name', 'wi_leader_reb_value',
  'wi_leader_ast_name', 'wi_leader_ast_value',
  'wisconsin_h1', 'wisconsin_h2', 'opponent_h1', 'opponent_h2', 'ot_periods',
];

function sameValue(left, right) {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  if (typeof left === 'number' || typeof right === 'number') {
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) return leftNum === rightNum;
  }
  return String(left) === String(right);
}

export function sqliteUtcMs(value) {
  const text = String(value ?? '').trim();
  if (!text) return NaN;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    return Date.parse(`${text.replace(' ', 'T')}Z`);
  }
  return Date.parse(text);
}

export function newestFetchedAtMs(rows) {
  let newest = NaN;
  for (const row of rows || []) {
    const ms = sqliteUtcMs(row?.fetched_at);
    if (Number.isFinite(ms) && (!Number.isFinite(newest) || ms > newest)) newest = ms;
  }
  return newest;
}

/**
 * Serve the stored scores when this isolate just checked ESPN, or when the
 * newest cached row is still inside the TTL. An empty table is never fresh.
 */
export function shouldServeCachedScores({
  rowCount,
  newestFetchedAtMs: fetchedAt,
  memoryCheckedAtMs = null,
  now,
  ttlMs = SCORE_CACHE_TTL_MS,
}) {
  if (!rowCount || !Number.isFinite(now) || !Number.isFinite(ttlMs) || ttlMs <= 0) return false;
  if (Number.isFinite(memoryCheckedAtMs) && now >= memoryCheckedAtMs && now - memoryCheckedAtMs < ttlMs) {
    return true;
  }
  return Number.isFinite(fetchedAt) && now >= fetchedAt && now - fetchedAt < ttlMs;
}

/**
 * A schedule payload that omits a number (score object we could not read,
 * linescores absent on the schedule) must not null out a value already stored.
 */
function gameForUpsert(existing, game, matchedGameId) {
  const next = { ...game };
  let gameId = matchedGameId;
  if (!existing) return { game: next, gameId };

  if (gameId == null && existing.game_id != null && existing.game_id !== '') {
    const storedId = Number(existing.game_id);
    if (Number.isFinite(storedId)) gameId = storedId;
  }

  for (const [column, key] of STAT_FIELDS) {
    if (next[key] == null || next[key] === '') {
      if (existing[column] != null && existing[column] !== '') next[key] = existing[column];
    }
  }
  return { game: next, gameId };
}

function statRowMatches(existing, game, gameId) {
  const existingGameId = existing?.game_id == null || existing.game_id === ''
    ? null
    : Number(existing.game_id);
  const nextGameId = gameId == null ? null : Number(gameId);
  if (existingGameId !== nextGameId) return false;
  return STAT_FIELDS.every(([column, key]) => sameValue(existing[column], game[key]));
}

/**
 * Writes required to store a fresh ESPN schedule. Unchanged rows and an
 * espn_event_id that already points at the Central-day vest row are omitted.
 */
export function planScoreSync({ vestRows = [], existingStats = [], games = [] }) {
  const statsByEvent = new Map(
    (existingStats || []).filter((row) => row?.espn_event_id != null).map((row) => [String(row.espn_event_id), row])
  );
  const clears = [];
  const links = [];
  const upserts = [];

  for (const game of games || []) {
    if (!game?.completed || game.espnEventId == null || game.espnEventId === '') continue;
    const eventId = String(game.espnEventId);
    const matchedGameId = matchVestGameId(vestRows, game.date);

    if (matchedGameId != null) {
      const heldElsewhere = (vestRows || []).some((row) => (
        String(row?.espn_event_id ?? '') === eventId && Number(row.game_id) !== matchedGameId
      ));
      if (heldElsewhere) clears.push({ espnEventId: eventId, gameId: matchedGameId });

      const matched = (vestRows || []).find((row) => Number(row?.game_id) === matchedGameId);
      if (!matched || String(matched.espn_event_id ?? '') !== eventId) {
        links.push({ espnEventId: eventId, gameId: matchedGameId });
      }
    }

    const existing = statsByEvent.get(eventId);
    const upsert = gameForUpsert(existing, game, matchedGameId);
    if (!existing || !statRowMatches(existing, upsert.game, upsert.gameId)) {
      upserts.push(upsert);
    }
  }

  return { clears, links, upserts };
}

/**
 * A box-score GET should write only when ESPN returned stats that differ
 * from the cached row. An empty summary must not null out the row.
 */
export function boxScoreNeedsWrite(cached, updates) {
  if (!cached || !updates) return false;
  const hasNew = BOX_SCORE_FIELDS.some((key) => updates[key] != null && updates[key] !== '');
  if (!hasNew) return false;
  return BOX_SCORE_FIELDS.some((key) => !sameValue(cached[key], updates[key]));
}

/**
 * A cached box score is complete when shooting stats and either the 3-point
 * percentage or a scoring leader are present. Rows saved while ESPN labeled
 * the percentage "3P%" and put leaders on summary.leaders have FG filled in
 * and those two fields empty, so they need one more read.
 */
export function boxScoreCacheHit(row) {
  if (row?.wi_fg == null || row.wi_fg === '') return false;
  const missingPct = row.wi_3pt_pct == null || row.wi_3pt_pct === '';
  const missingLeader = row.wi_leader_pts_name == null || row.wi_leader_pts_name === '';
  return !(missingPct && missingLeader);
}
