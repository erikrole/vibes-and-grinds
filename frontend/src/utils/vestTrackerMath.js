// Pure math + normalization helpers for the Vest Tracker.
// No React, no DOM — everything here should be unit-testable in isolation.

export const QUADRANT_THRESHOLDS = {
  vs: [30, 75, 160, 365],
  N: [50, 100, 200, 365],
  '@': [75, 135, 240, 365],
};

// Baseline win probabilities by quadrant × location.
// Derived from rough college basketball priors: home teams win ~65% of games,
// and quadrant correlates strongly with strength of opponent.
// Used to compute "wins above expected" — credit outfits for beating tough
// opponents and discount easy wins.
export const EXPECTED_WIN_PROB = {
  vs: { 1: 0.50, 2: 0.70, 3: 0.85, 4: 0.92 },
  N:  { 1: 0.40, 2: 0.55, 3: 0.75, 4: 0.85 },
  '@': { 1: 0.22, 2: 0.45, 3: 0.65, 4: 0.80 },
};

// Fallback when NET data is missing — assume a typical opponent strength.
export const EXPECTED_WIN_PROB_DEFAULT = { vs: 0.68, N: 0.55, '@': 0.42 };

const OPPONENT_ALIASES = {
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

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

export const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTHS[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  return `${month} ${day}, ${parts[0]}`;
};

export const toIsoDate = (value) => {
  if (!value) return '';
  if (value.length >= 10 && value[4] === '-') return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const toSuperscript = (num) => {
  if (!num) return '';
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  return String(num).split('').map((d) => superscripts[parseInt(d, 10)]).join('');
};

export const formatLocationLabel = (location, mode = 'short') => {
  const labels = {
    short: { '@': '@', N: 'N', vs: 'vs' },
    full: { '@': 'at', N: 'neutral vs', vs: 'vs' },
    adjective: { '@': 'away', N: 'neutral', vs: 'home' },
    Adjective: { '@': 'Away', N: 'Neutral', vs: 'Home' },
  };
  return labels[mode]?.[location] || 'vs';
};

export const normalizeTeamName = (value = '') => {
  const lower = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const expanded = OPPONENT_ALIASES[lower] || lower;
  return expanded.replace(/\b(university|college)\b/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeToken = (token) => TOKEN_CANONICAL[token] || token;

export const normalizeTokens = (value = '') =>
  normalizeTeamName(value).split(' ').map(normalizeToken).filter(Boolean);

export const buildNetLookup = (rankings) => {
  const exact = new Map();
  const byTokenSet = [];
  rankings.forEach((entry) => {
    exact.set(entry.key, entry.rank);
    byTokenSet.push({ tokens: new Set(normalizeTokens(entry.team)), rank: entry.rank });
  });
  return { exact, byTokenSet };
};

export const findNetRankForOpponent = (lookup, opponentName) => {
  const key = normalizeTeamName(opponentName);
  const exact = lookup.exact.get(key);
  if (Number.isFinite(exact)) return exact;
  const tokens = normalizeTokens(opponentName);
  if (!tokens.length) return null;
  for (const candidate of lookup.byTokenSet) {
    if (tokens.every((t) => candidate.tokens.has(t))) return candidate.rank;
  }
  return null;
};

export const getQuadrant = (location, netRank) => {
  if (!Number.isFinite(netRank) || netRank < 1 || netRank > 365) return null;
  const t = QUADRANT_THRESHOLDS[location] || QUADRANT_THRESHOLDS.vs;
  if (netRank <= t[0]) return 1;
  if (netRank <= t[1]) return 2;
  if (netRank <= t[2]) return 3;
  if (netRank <= t[3]) return 4;
  return null;
};

// Expected win probability for a single game.
// Falls back to location-based baseline when quadrant is unknown.
export const expectedWinProb = (location, quadrant) => {
  const loc = location || 'vs';
  if (quadrant && EXPECTED_WIN_PROB[loc]?.[quadrant] != null) {
    return EXPECTED_WIN_PROB[loc][quadrant];
  }
  return EXPECTED_WIN_PROB_DEFAULT[loc] ?? 0.55;
};

// Wilson score lower bound — confidence-adjusted win rate.
// z=1.0 → ~68% one-sided CI (gentle prior).
// z=1.28 → ~80% one-sided (stricter).
export const wilsonLowerBound = (wins, games, z = 1.0) => {
  if (games <= 0) return 0;
  const p = wins / games;
  const n = games;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
};

// Bayesian shrinkage of an observed win rate toward a prior (typically the
// team's overall season rate). `priorStrength` is in pseudo-games.
export const bayesianRate = (wins, games, prior, priorStrength = 4) => {
  if (games <= 0) return prior;
  return (wins + prior * priorStrength) / (games + priorStrength);
};

export const countTrailingStreak = (results) => {
  if (!results.length) return null;
  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) count++;
    else break;
  }
  return { result: last, count };
};

// Exponentially weighted win rate — recent games count more.
// halfLife=3 means a game from 3 games ago has half the weight of the latest.
export const decayedWinRate = (results, halfLife = 3) => {
  if (!results.length) return null;
  const k = Math.LN2 / halfLife;
  let num = 0;
  let den = 0;
  for (let i = 0; i < results.length; i++) {
    const ageFromEnd = results.length - 1 - i;
    const w = Math.exp(-k * ageFromEnd);
    num += w * (results[i] === 'W' ? 1 : 0);
    den += w;
  }
  return den > 0 ? num / den : null;
};

// Tier the sample size into a UX-friendly bucket.
export const sampleTier = (games) => {
  if (games === 0) return 'untested';
  if (games <= 1) return 'tiny';
  if (games <= 3) return 'small';
  if (games <= 6) return 'decent';
  return 'solid';
};

// Group games by outfit and compute aggregate stats with:
//   - per-quadrant W/L
//   - expected wins (sum of P(W)) from opponent strength
//   - wins above expected (WoE)
//   - exponentially-decayed recent form
//   - Bayesian-smoothed and Wilson-bounded win rates
//   - recency index (how many games since last worn)
export const buildOutfitStats = ({
  completedGames,
  netLookup,
  teamWins,
  teamGames,
}) => {
  // Reduce over the full completedGames array (skipping outfit-less games) so
  // `lastIndex` stays in the same index space that computeRecommendation uses
  // (completedGames.length - lastIndex). Filtering first would shift indices.
  const grouped = completedGames
    .reduce((acc, game, index) => {
      if (!game.outfit) return acc;
      const key = game.outfit;
      if (!acc[key]) {
        acc[key] = {
          outfit: key,
          wins: 0,
          losses: 0,
          games: 0,
          lastSeen: game.opponent,
          lastSeenLocation: game.location || 'vs',
          lastIndex: index,
          results: [],
          roadWins: 0,
          roadLosses: 0,
          otWins: 0,
          otLosses: 0,
          netRankSum: 0,
          netRankCount: 0,
          expectedWins: 0,
          quadrants: {
            1: { wins: 0, losses: 0 },
            2: { wins: 0, losses: 0 },
            3: { wins: 0, losses: 0 },
            4: { wins: 0, losses: 0 },
          },
        };
      }
      const o = acc[key];
      o.games += 1;
      o.lastSeen = game.opponent;
      o.lastSeenLocation = game.location || 'vs';
      o.lastIndex = index;
      o.results.push(game.result);
      if (game.result === 'W') o.wins += 1;
      else o.losses += 1;

      if (game.location === '@') {
        if (game.result === 'W') o.roadWins += 1;
        else o.roadLosses += 1;
      }
      if (game.overtime) {
        if (game.result === 'W') o.otWins += 1;
        else o.otLosses += 1;
      }

      const netRank = findNetRankForOpponent(netLookup, game.opponent);
      if (Number.isFinite(netRank)) {
        o.netRankSum += netRank;
        o.netRankCount += 1;
      }
      const quadrant = getQuadrant(game.location, netRank);
      if (quadrant) {
        if (game.result === 'W') o.quadrants[quadrant].wins += 1;
        else o.quadrants[quadrant].losses += 1;
      }

      o.expectedWins += expectedWinProb(game.location, quadrant);
      return acc;
    }, {});

  return Object.values(grouped)
    .map((entry) => {
      const winRate = entry.wins / entry.games;
      // Leave-one-out prior: shrink toward the rest-of-team rate, not toward
      // a rate that already includes this outfit's own games.
      const otherWins = teamWins - entry.wins;
      const otherGames = teamGames - entry.games;
      const prior = otherGames > 0 ? otherWins / otherGames : 0.5;
      const smoothedRate = bayesianRate(entry.wins, entry.games, prior, 4);
      const wilson = wilsonLowerBound(entry.wins, entry.games, 1.0);
      const winsAboveExpected = entry.wins - entry.expectedWins;
      const form = decayedWinRate(entry.results, 3);

      // Recent form classification (last 3, with prior season rate as tiebreak).
      const last3 = entry.results.slice(-3);
      let formLabel = null;
      if (last3.length >= 2 && last3.every((r) => r === 'W')) formLabel = 'hot';
      else if (last3.length >= 2 && last3.every((r) => r === 'L')) formLabel = 'cold';

      return {
        ...entry,
        winRate,
        winRatePct: Math.round(winRate * 100),
        smoothedRate,
        smoothedRatePct: Math.round(smoothedRate * 100),
        wilson,
        wilsonPct: Math.round(wilson * 100),
        winsAboveExpected,
        woePerGame: winsAboveExpected / entry.games,
        avgNet: entry.netRankCount ? Math.round(entry.netRankSum / entry.netRankCount) : null,
        decayedForm: form,
        decayedFormPct: form == null ? null : Math.round(form * 100),
        form: formLabel,
        tier: sampleTier(entry.games),
      };
    })
    // Default sort: Wilson lower bound (rewards both rate and sample size),
    // tiebreak by wins above expected, then raw wins.
    .sort((a, b) => b.wilson - a.wilson || b.winsAboveExpected - a.winsAboveExpected || b.wins - a.wins);
};

// Normalize WoE-per-game (typically in [-0.5, +0.5]) to a 0..100 score.
const normalizeWoEPerGame = (woePerGame) => {
  // tanh-like mapping: 0 → 50, +0.3 → ~80, -0.3 → ~20.
  const k = 4;
  const t = Math.tanh(k * woePerGame);
  return 50 + 50 * t;
};

// Composite "wear me next" score on a 0..100 scale.
//   - smoothedRate × 100   (45%) — central estimate
//   - WoE normalized       (25%) — beats expectation
//   - decayedForm × 100    (20%) — recent trend
//   - recency bonus        (10%) — encourage rotation off the last-worn fit
export const recommendationScore = (stat, ctx = {}) => {
  const { recencyDistance = 0, lastWorn = false } = ctx;
  // Evidence factor scales how much we trust noisy per-outfit signals.
  // Sample of 4+ → full trust; below that, blend toward the neutral baseline.
  // This keeps a 1-0 outfit from outranking an 8-1 outfit just because its
  // raw form and WoE numbers look great.
  const evidenceFactor = Math.min(1, Math.sqrt(stat.games / 4));
  const formRaw = stat.decayedForm == null ? stat.smoothedRate : stat.decayedForm;

  // smoothedRate is already Bayesian-shrunk, so it stays at full weight.
  const smoothed = stat.smoothedRate * 100;
  // WoE-per-game gets pulled toward 50 (no signal) for small samples.
  const woe = 50 + (normalizeWoEPerGame(stat.woePerGame) - 50) * evidenceFactor;
  // Form blends toward the smoothed rate when sample is small.
  const form = formRaw * 100 * evidenceFactor + smoothed * (1 - evidenceFactor);
  // Recency bonus also scaled — "you're due" only matters with real history.
  const recency = lastWorn ? 0 : Math.min(100, recencyDistance * 12) * evidenceFactor;

  const components = { smoothed, woe, form, recency };
  const score = 0.45 * smoothed + 0.25 * woe + 0.20 * form + 0.10 * recency;

  return { score, components };
};

export const computeRecommendation = (outfitStats, completedGames) => {
  if (!completedGames.length || outfitStats.length < 2) return null;
  const lastOutfit = completedGames[completedGames.length - 1]?.outfit;

  const scored = outfitStats
    .filter((s) => s.games > 0)
    .map((stat) => {
      const recencyDistance = completedGames.length - stat.lastIndex;
      const { score, components } = recommendationScore(stat, {
        recencyDistance,
        lastWorn: stat.outfit === lastOutfit,
      });
      return {
        ...stat,
        score: Math.round(score * 10) / 10,
        scoreComponents: components,
        recencyDistance,
        isLastWorn: stat.outfit === lastOutfit,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  // Score average for benchmark display (avg vs +X).
  const scoreAvg =
    scored.reduce((sum, s) => sum + s.score, 0) / scored.length;
  const annotated = scored.map((s) => ({
    ...s,
    scoreAvg,
    scoreField: scored.length,
  }));

  return {
    top: annotated[0],
    alternatives: annotated.slice(1, 3),
    all: annotated,
    blockedOutfit: lastOutfit,
    scoreAvg,
  };
};

// Generate a short, plain-English narrative explaining why an outfit is the
// top pick. Pulls signal from the score components and a few stat fields —
// no LLM call, deterministic and free.
export const buildWhySentence = (rec, scoutingReport) => {
  if (!rec?.top) return null;
  const top = rec.top;
  const c = top.scoreComponents;
  if (!c) return null;

  const parts = [];

  // Headline finding — strongest non-recency component.
  const findings = [
    { key: 'smoothed', value: c.smoothed, phrase: top.smoothedRatePct >= 70 ? `${top.smoothedRatePct}% win rate (smoothed)` : null },
    { key: 'woe', value: c.woe, phrase: top.winsAboveExpected >= 1 ? `${top.winsAboveExpected.toFixed(1)} wins above what the schedule should have produced` : null },
    { key: 'form', value: c.form, phrase: c.form >= 75 && top.form === 'hot' ? 'on a current heater' : null },
  ].filter((f) => f.phrase);

  const lead = findings.sort((a, b) => b.value - a.value)[0];
  if (lead) parts.push(`${capitalize(lead.phrase)}.`);
  else parts.push(`${top.wins}-${top.losses} on the year.`);

  // Weakness or caveat.
  if (top.games <= 2) {
    parts.push(`Small sample — only ${top.games} game${top.games === 1 ? '' : 's'} on record.`);
  } else if (c.form < 40) {
    parts.push('Recent form has cooled.');
  } else if (top.isLastWorn) {
    parts.push('Worn in the last game though — consider rotating.');
  } else if (c.recency > 60) {
    parts.push(`Last seen ${top.recencyDistance} games ago — due for a re-up.`);
  }

  // Opponent angle.
  if (scoutingReport?.quadrant) {
    const q = scoutingReport.quadrant;
    const qW = top.quadrants[q].wins;
    const qL = top.quadrants[q].losses;
    if (qW + qL > 0) {
      parts.push(`Q${q} record in this fit: ${qW}-${qL}.`);
    } else {
      parts.push(`Untested in Q${q} games.`);
    }
  }

  return parts.join(' ');
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Per-game quality score normalized by sample size. Positive = above
// expectation (good wins / avoided bad losses), negative = below.
export const normalizedQualityScore = (stat) => {
  if (!stat.games) return 0;
  return Math.round((stat.winsAboveExpected / stat.games) * 100) / 100;
};

// Pull NET payload through several worker shapes.
export const normalizeNetResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rankings)) return payload.rankings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.teams)) return payload.teams;
  if (Array.isArray(payload.standings)) {
    return payload.standings
      .map((entry) => ({
        team: entry.team || entry.teamName || entry.school || entry.name || entry.program,
        netRank: Number(entry.netRank ?? entry.rank ?? entry.net_ranking ?? entry.NET ?? entry.position),
      }))
      .filter((entry) => entry.team && Number.isFinite(entry.netRank));
  }
  if (payload.netRankings && typeof payload.netRankings === 'object') {
    return Object.entries(payload.netRankings)
      .map(([team, rank]) => ({ team, netRank: Number(rank) }))
      .filter((entry) => entry.team && Number.isFinite(entry.netRank));
  }
  return [];
};
