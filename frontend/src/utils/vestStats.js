// Pure helpers for the Vest Tracker. No React, no DOM — safe to import from
// hooks, components, or tests.

export const QUADRANT_THRESHOLDS = {
  vs: [30, 75, 160, 365],
  N: [50, 100, 200, 365],
  '@': [75, 135, 240, 365],
};

export const OPPONENT_ALIASES = {
  'siu edwardsville': 'southern illinois edwardsville',
  byu: 'brigham young',
  ucla: 'california los angeles',
  usc: 'southern california',
  tcu: 'texas christian',
  'ole miss': 'mississippi',
  uconn: 'connecticut',
  smu: 'southern methodist',
  lsu: 'louisiana state',
  unc: 'north carolina',
  'nc state': 'north carolina state',
  'saint marys': 'saint marys ca',
  'ohio st': 'ohio state',
  'penn st': 'penn state',
  'michigan st': 'michigan state',
  'florida st': 'florida state',
  'oklahoma st': 'oklahoma state',
  'central michigan': 'central mich',
  'northern illinois': 'northern ill',
};

const TOKEN_CANONICAL = {
  st: 'state',
  'st.': 'state',
  univ: 'university',
  mich: 'michigan',
  ill: 'illinois',
  n: 'north',
  northern: 'north',
  s: 'south',
  southern: 'south',
  e: 'east',
  eastern: 'east',
  w: 'west',
  western: 'west',
};

export const EMPTY_FORM = {
  date: '',
  location: 'vs',
  opponent: '',
  ranking: '',
  outfit: '',
  result: 'W',
  overtime: false,
};

export const CONFIDENCE_COLORS = {
  high: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20',
  medium: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20',
  low: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
  untested: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
  unknown: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
};

export const CONFIDENCE_LABELS = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
  untested: 'UNTESTED',
  unknown: '—',
};

export const CONFIDENCE_LABEL_COLORS = {
  high: 'text-emerald-700 dark:text-emerald-400',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-red-700 dark:text-red-400',
  untested: 'text-stone-500 dark:text-stone-400',
  unknown: 'text-stone-500 dark:text-stone-400',
};

const MONTHS = [
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
  'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
];

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function toIsoDate(value) {
  if (!value) return '';
  if (value.length >= 10 && value[4] === '-') return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function formatVestDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTHS[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  return `${month} ${day}, ${parts[0]}`;
}

export function toSuperscript(num) {
  if (!num) return '';
  return String(num)
    .split('')
    .map((digit) => SUPERSCRIPTS[parseInt(digit, 10)])
    .join('');
}

export function normalizeTeamName(value = '') {
  const lower = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const expanded = OPPONENT_ALIASES[lower] || lower;
  return expanded
    .replace(/\b(university|college)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeToken(token) {
  return TOKEN_CANONICAL[token] || token;
}

export function normalizeTokens(value = '') {
  const cleaned = normalizeTeamName(value);
  return cleaned
    .split(' ')
    .map((token) => normalizeToken(token))
    .filter(Boolean);
}

export function buildNetLookup(rankings) {
  const exact = new Map();
  const byTokenSet = [];

  rankings.forEach((entry) => {
    exact.set(entry.key, entry.rank);
    byTokenSet.push({
      tokens: new Set(normalizeTokens(entry.team)),
      rank: entry.rank,
    });
  });

  return { exact, byTokenSet };
}

export function findNetRankForOpponent(lookup, opponentName) {
  const key = normalizeTeamName(opponentName);
  const exact = lookup.exact.get(key);
  if (Number.isFinite(exact)) return exact;

  const tokens = normalizeTokens(opponentName);
  if (!tokens.length) return null;

  for (const candidate of lookup.byTokenSet) {
    if (tokens.every((token) => candidate.tokens.has(token))) return candidate.rank;
  }

  return null;
}

export function getQuadrant(location, netRank) {
  if (!Number.isFinite(netRank) || netRank < 1 || netRank > 365) return null;
  const thresholds = QUADRANT_THRESHOLDS[location] || QUADRANT_THRESHOLDS.vs;
  if (netRank <= thresholds[0]) return 1;
  if (netRank <= thresholds[1]) return 2;
  if (netRank <= thresholds[2]) return 3;
  if (netRank <= thresholds[3]) return 4;
  return null;
}

export function getQuadrantQualityScore(quadrants) {
  const q1 = quadrants[1];
  const q2 = quadrants[2];
  const q3 = quadrants[3];
  const q4 = quadrants[4];

  const highValueWins = q1.wins * 16 + q2.wins * 10;
  const damagingLosses = q3.losses * 8 + q4.losses * 14;
  const expectedWins = q3.wins * 2 + q4.wins;

  return highValueWins - damagingLosses + expectedWins;
}

export function normalizeNetResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.rankings)) return payload.rankings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.teams)) return payload.teams;

  // Big Ten standings worker payload
  if (Array.isArray(payload.standings)) {
    return payload.standings
      .map((entry) => ({
        team: entry.team || entry.teamName || entry.school || entry.name || entry.program,
        netRank: Number(
          entry.netRank ??
          entry.rank ??
          entry.net_ranking ??
          entry.NET ??
          entry.position
        ),
      }))
      .filter((entry) => entry.team && Number.isFinite(entry.netRank));
  }

  if (payload.netRankings && typeof payload.netRankings === 'object') {
    return Object.entries(payload.netRankings)
      .map(([team, rank]) => ({ team, netRank: Number(rank) }))
      .filter((entry) => entry.team && Number.isFinite(entry.netRank));
  }

  return [];
}

const LOCATION_LABELS = {
  short: { '@': '@', N: 'N', vs: 'vs' },
  full: { '@': 'at', N: 'neutral vs', vs: 'vs' },
  adjective: { '@': 'away', N: 'neutral', vs: 'home' },
  Adjective: { '@': 'Away', N: 'Neutral', vs: 'Home' },
};

export function formatLocationLabel(location, mode = 'short') {
  return LOCATION_LABELS[mode]?.[location] || 'vs';
}

export function countTrailingStreak(results) {
  if (!results.length) return null;
  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) count++;
    else break;
  }
  return { result: last, count };
}

/**
 * Convert raw NET feed entries into the row shape consumed by buildNetLookup.
 */
export function netEntriesToRows(entries) {
  return entries
    .map((entry) => {
      const teamName = entry.team || entry.teamName || entry.school || entry.name || entry.program;
      const rankValue =
        entry.netRank ??
        entry.rank ??
        entry.net_ranking ??
        entry.NET ??
        entry.position;
      const rank = Number(rankValue);
      if (!teamName || !Number.isFinite(rank)) return null;
      return {
        team: teamName,
        rank,
        key: normalizeTeamName(teamName),
        record: entry.record || null,
      };
    })
    .filter(Boolean);
}
