import { useEffect, useMemo, useState } from 'react';
import { vestGames as seedGames } from '../utils/vestTrackerData';
import { fetchVestGames, syncVestGames, fetchVisits, fetchVestBlurb } from '../utils/api';
import NetRankingsPage from './NetRankingsPage';

const VEST_GAMES_KEY = 'vibes-and-grinds:vest-games';
const NET_RANKINGS_URL = import.meta.env.VITE_NET_RANKINGS_URL || '';
const NET_FETCH_PATHS = ['/api/vest/net-rankings', '/api/vest/net'];

const QUADRANT_THRESHOLDS = {
  vs: [30, 75, 160, 365],
  N: [50, 100, 200, 365],
  '@': [75, 135, 240, 365],
};

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

const EMPTY_FORM = {
  date: '',
  location: 'vs',
  opponent: '',
  ranking: '',
  outfit: '',
  result: 'W',
  overtime: false,
};

const CONFIDENCE_COLORS = {
  high: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20',
  medium: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20',
  low: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
  untested: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
  unknown: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
};
const CONFIDENCE_LABELS = { high: 'HIGH', medium: 'MED', low: 'LOW', untested: 'UNTESTED', unknown: '—' };
const CONFIDENCE_LABEL_COLORS = {
  high: 'text-emerald-700 dark:text-emerald-400',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-red-700 dark:text-red-400',
  untested: 'text-stone-500 dark:text-stone-400',
  unknown: 'text-stone-500 dark:text-stone-400',
};

const toIsoDate = (value) => {
  if (!value) return '';
  if (value.length >= 10 && value[4] === '-') return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTHS[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  return `${month} ${day}, ${parts[0]}`;
};

const toSuperscript = (num) => {
  if (!num) return '';
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  return String(num)
    .split('')
    .map((digit) => superscripts[parseInt(digit, 10)])
    .join('');
};

const normalizeTeamName = (value = '') => {
  const lower = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const expanded = OPPONENT_ALIASES[lower] || lower;
  return expanded
    .replace(/\b(university|college)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

const normalizeToken = (token) => TOKEN_CANONICAL[token] || token;

const normalizeTokens = (value = '') => {
  const cleaned = normalizeTeamName(value);
  return cleaned
    .split(' ')
    .map((token) => normalizeToken(token))
    .filter(Boolean);
};

const buildNetLookup = (rankings) => {
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
};

const findNetRankForOpponent = (lookup, opponentName) => {
  const key = normalizeTeamName(opponentName);
  const exact = lookup.exact.get(key);
  if (Number.isFinite(exact)) return exact;

  const tokens = normalizeTokens(opponentName);
  if (!tokens.length) return null;

  for (const candidate of lookup.byTokenSet) {
    if (tokens.every((token) => candidate.tokens.has(token))) return candidate.rank;
  }

  return null;
};

const getQuadrant = (location, netRank) => {
  if (!Number.isFinite(netRank) || netRank < 1 || netRank > 365) return null;
  const thresholds = QUADRANT_THRESHOLDS[location] || QUADRANT_THRESHOLDS.vs;
  if (netRank <= thresholds[0]) return 1;
  if (netRank <= thresholds[1]) return 2;
  if (netRank <= thresholds[2]) return 3;
  if (netRank <= thresholds[3]) return 4;
  return null;
};


const getQuadrantQualityScore = (quadrants) => {
  const q1 = quadrants[1];
  const q2 = quadrants[2];
  const q3 = quadrants[3];
  const q4 = quadrants[4];

  const highValueWins = q1.wins * 16 + q2.wins * 10;
  const damagingLosses = q3.losses * 8 + q4.losses * 14;
  const expectedWins = q3.wins * 2 + q4.wins;

  return highValueWins - damagingLosses + expectedWins;
};

const normalizeNetResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  // Native NET payload shapes
  if (Array.isArray(payload.rankings)) return payload.rankings;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.teams)) return payload.teams;

  // Reuse Big Ten standings worker payload: { standings: [{ team, netRank, ... }] }
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

  // Worker shape: { netRankings: { "DUKE": 1, ... } }
  if (payload.netRankings && typeof payload.netRankings === 'object') {
    return Object.entries(payload.netRankings)
      .map(([team, rank]) => ({ team, netRank: Number(rank) }))
      .filter((entry) => entry.team && Number.isFinite(entry.netRank));
  }

  return [];
};

const formatLocationLabel = (location, mode = 'short') => {
  const labels = {
    short: { '@': '@', N: 'N', vs: 'vs' },
    full: { '@': 'at', N: 'neutral vs', vs: 'vs' },
    adjective: { '@': 'away', N: 'neutral', vs: 'home' },
    Adjective: { '@': 'Away', N: 'Neutral', vs: 'Home' },
  };
  return labels[mode]?.[location] || 'vs';
};

const countTrailingStreak = (results) => {
  if (!results.length) return null;
  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) count++;
    else break;
  }
  return { result: last, count };
};

const loadGames = () => {
  try {
    const raw = localStorage.getItem(VEST_GAMES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return seedGames;
};

export default function VestTrackerDashboard() {
  const [games, setGames] = useState(loadGames);
  const [netRankings, setNetRankings] = useState([]);
  const [netStatus, setNetStatus] = useState('idle');
  const [selectedOutfit, setSelectedOutfit] = useState('All outfits');
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [addingOutfit, setAddingOutfit] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [vestTab, setVestTab] = useState('dashboard');

  // Persist any game changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VEST_GAMES_KEY, JSON.stringify(games));
    } catch {
      // ignore
    }
  }, [games]);

  useEffect(() => {
    const sources = [
      ...NET_FETCH_PATHS,
      ...(NET_RANKINGS_URL ? [NET_RANKINGS_URL] : []),
    ];

    let cancelled = false;

    const toRows = (payload) => normalizeNetResponse(payload)
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

    const loadNetRankings = async () => {
      setNetStatus('loading');

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;

          const payload = await response.json();
          const rows = toRows(payload);
          if (!rows.length) continue;

          if (!cancelled) {
            setNetRankings(rows);
            setNetStatus('loaded');
          }
          return;
        } catch {
          // try next source
        }
      }

      if (!cancelled) {
        setNetRankings([]);
        setNetStatus('error');
      }
    };

    loadNetRankings();
    return () => {
      cancelled = true;
    };
  }, []);

  const netLookup = useMemo(() => buildNetLookup(netRankings), [netRankings]);


  useEffect(() => {
    let cancelled = false;

    const loadSyncedGames = async () => {
      try {
        const payload = await fetchVestGames();
        const serverGames = Array.isArray(payload?.games) ? payload.games : [];
        if (!cancelled && serverGames.length > 0) {
          setGames(serverGames);
        }
      } catch {
        // ignore - fallback to local storage seed data
      } finally {
        if (!cancelled) setSyncReady(true);
      }
    };

    loadSyncedGames();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!syncReady) return;

    let cancelled = false;

    const pushSyncedGames = async () => {
      try {
        await syncVestGames(games);
      } catch {
        // ignore sync errors in offline/dev contexts
      }
    };

    if (!cancelled) pushSyncedGames();

    return () => {
      cancelled = true;
    };
  }, [games, syncReady]);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [games]
  );

  const completedGames = useMemo(
    () => sortedGames.filter((game) => game.result === 'W' || game.result === 'L'),
    [sortedGames]
  );

  const outfits = useMemo(
    () => ['All outfits', ...new Set(completedGames.filter((game) => game.outfit).map((game) => game.outfit))],
    [completedGames]
  );

  const existingOutfits = useMemo(
    () => [...new Set(games.filter((g) => g.outfit).map((g) => g.outfit))].sort(),
    [games]
  );

  // Reset filter if the selected outfit is no longer present (e.g. after editing a game)
  useEffect(() => {
    if (selectedOutfit !== 'All outfits' && !outfits.includes(selectedOutfit)) {
      setSelectedOutfit('All outfits');
    }
  }, [outfits, selectedOutfit]);

  // Timeline: newest first
  const visibleGames = useMemo(() => {
    const base =
      selectedOutfit === 'All outfits'
        ? sortedGames
        : sortedGames.filter((game) => game.outfit === selectedOutfit);
    return [...base].reverse();
  }, [sortedGames, selectedOutfit]);

  const summary = useMemo(() => {
    const sourceGames =
      selectedOutfit === 'All outfits'
        ? completedGames
        : completedGames.filter((game) => game.outfit === selectedOutfit);
    const wins = sourceGames.filter((game) => game.result === 'W').length;
    const losses = sourceGames.length - wins;
    return { wins, losses };
  }, [completedGames, selectedOutfit]);

  // Current streak — always based on overall completed games, not filtered
  const streak = useMemo(
    () => countTrailingStreak(completedGames.map(g => g.result)),
    [completedGames]
  );

  const outfitStats = useMemo(() => {
    const grouped = completedGames
      .filter((game) => game.outfit)
      .reduce((acc, game, index) => {
        if (!acc[game.outfit]) {
          acc[game.outfit] = {
            outfit: game.outfit,
            wins: 0,
            losses: 0,
            games: 0,
            lastSeen: game.opponent,
            lastSeenLocation: game.location || 'vs',
            lastIndex: index,
            recentResults: [],
            roadWins: 0,
            roadLosses: 0,
            otWins: 0,
            otLosses: 0,
            netRankSum: 0,
            netRankCount: 0,
            quadrants: {
              1: { wins: 0, losses: 0 },
              2: { wins: 0, losses: 0 },
              3: { wins: 0, losses: 0 },
              4: { wins: 0, losses: 0 },
            },
          };
        }

        const o = acc[game.outfit];
        o.games += 1;
        o.lastSeen = game.opponent;
        o.lastSeenLocation = game.location || 'vs';
        o.lastIndex = index;
        o.recentResults.push(game.result);
        if (game.result === 'W') o.wins += 1;
        if (game.result === 'L') o.losses += 1;

        if (game.location === '@') {
          if (game.result === 'W') o.roadWins += 1;
          if (game.result === 'L') o.roadLosses += 1;
        }
        if (game.overtime) {
          if (game.result === 'W') o.otWins += 1;
          if (game.result === 'L') o.otLosses += 1;
        }

        const netRank = findNetRankForOpponent(netLookup, game.opponent);
        if (Number.isFinite(netRank)) { o.netRankSum += netRank; o.netRankCount += 1; }
        const quadrant = getQuadrant(game.location, netRank);
        if (quadrant && (game.result === 'W' || game.result === 'L')) {
          if (game.result === 'W') o.quadrants[quadrant].wins += 1;
          if (game.result === 'L') o.quadrants[quadrant].losses += 1;
        }

        return acc;
      }, {});

    return Object.values(grouped)
      .map((entry) => {
        const last3 = entry.recentResults.slice(-3);
        let form = null;
        if (last3.length >= 2 && last3.every((r) => r === 'W')) form = 'hot';
        else if (last3.length >= 2 && last3.every((r) => r === 'L')) form = 'cold';

        return {
          ...entry,
          winRate: Math.round((entry.wins / entry.games) * 100),
          avgNet: entry.netRankCount ? Math.round(entry.netRankSum / entry.netRankCount) : null,
          form,
        };
      })
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  }, [completedGames, netLookup]);

  const recommendation = useMemo(() => {
    if (!completedGames.length || outfitStats.length < 2) return null;

    const lastOutfit = completedGames[completedGames.length - 1]?.outfit;
    const candidates = outfitStats.filter((entry) => entry.outfit !== lastOutfit);
    if (!candidates.length) return null;

    const scored = candidates
      .map((entry) => {
        const recencyDistance = completedGames.length - entry.lastIndex;
        const recencyBonus = Math.min(10, recencyDistance * 1.2);
        const samplePenalty = entry.games < 2 ? 8 : entry.games < 4 ? 4 : 0;
        const clutchBoost = entry.form === 'hot' ? 6 : entry.form === 'cold' ? -4 : 0;
        const quadrantScore = getQuadrantQualityScore(entry.quadrants);
        const highTierGames =
          entry.quadrants[1].wins +
          entry.quadrants[1].losses +
          entry.quadrants[2].wins +
          entry.quadrants[2].losses;
        const highTierConfidence = Math.min(8, highTierGames * 1.5);

        const score =
          entry.winRate +
          entry.wins * 3 +
          recencyBonus +
          clutchBoost +
          quadrantScore +
          highTierConfidence -
          samplePenalty;

        return {
          ...entry,
          score: Math.round(score),
          quadrantScore,
          highTierGames,
          recencyDistance,
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      top: scored[0],
      alternatives: scored.slice(1, 3),
      blockedOutfit: lastOutfit,
    };
  }, [completedGames, outfitStats]);

  // ── Streak Badges per outfit ──
  const outfitBadges = useMemo(() => {
    const badges = {};
    for (const stat of outfitStats) {
      const b = [];
      const s = countTrailingStreak(stat.recentResults);
      if (s && s.count >= 3 && s.result === 'W') b.push(`${s.count}-Game Heater`);
      else if (s && s.count >= 3 && s.result === 'L') b.push(`${s.count}-Game Skid`);
      if (stat.roadWins >= 3) b.push(`Road Warrior (${stat.roadWins}-${stat.roadLosses} away)`);
      if (stat.quadrants[1].wins >= 2) b.push(`Q1 Slayer (${stat.quadrants[1].wins}-${stat.quadrants[1].losses})`);
      if (stat.games >= 3 && stat.losses === 0) b.push('Undefeated');
      if (stat.otWins >= 2) b.push(`OT Specialist (${stat.otWins}-${stat.otLosses})`);
      if (b.length) badges[stat.outfit] = b;
    }
    return badges;
  }, [outfitStats]);

  // ── Jinx Alert for recommendation ──
  const jinxAlert = useMemo(() => {
    if (!recommendation) return null;
    const upcoming = sortedGames.find(g => !g.result || (g.result !== 'W' && g.result !== 'L'));
    if (!upcoming) return null;

    const topOutfit = recommendation.top.outfit;
    const netRank = findNetRankForOpponent(netLookup, upcoming.opponent);
    const quadrant = getQuadrant(upcoming.location || 'vs', netRank);
    if (!quadrant) return null;

    const topStats = outfitStats.find(s => s.outfit === topOutfit);
    if (!topStats) return null;

    const qGames = topStats.quadrants[quadrant].wins + topStats.quadrants[quadrant].losses;
    if (qGames === 0) {
      return { opponent: upcoming.opponent, quadrant, outfit: topOutfit };
    }
    return null;
  }, [recommendation, sortedGames, netLookup, outfitStats]);

  // ── Head-to-Head Outfit Comparison ──
  const [compareOutfits, setCompareOutfits] = useState([null, null]);

  const comparisonData = useMemo(() => {
    const [a, b] = compareOutfits;
    if (!a || !b) return null;
    const statA = outfitStats.find(s => s.outfit === a);
    const statB = outfitStats.find(s => s.outfit === b);
    if (!statA || !statB) return null;

    return {
      a: { ...statA, badges: outfitBadges[a] || [] },
      b: { ...statB, badges: outfitBadges[b] || [] },
    };
  }, [compareOutfits, outfitStats, outfitBadges]);

  // ── Season Storylines / Milestones (single pass) ──
  const milestones = useMemo(() => {
    if (!completedGames.length) return [];

    let maxStreak = 0, curStreak = 0;
    const outfitStreaks = {};
    let firstQ1Road = null;
    let worstLoss = null, worstRank = 0;
    let bestWin = null, bestRank = 999;
    let otWins = 0, otTotal = 0;

    for (const g of completedGames) {
      // Overall win streak
      if (g.result === 'W') { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; }
      else { curStreak = 0; }

      // Per-outfit win streak
      if (g.outfit) {
        if (!outfitStreaks[g.outfit]) outfitStreaks[g.outfit] = { max: 0, cur: 0 };
        if (g.result === 'W') {
          outfitStreaks[g.outfit].cur++;
          outfitStreaks[g.outfit].max = Math.max(outfitStreaks[g.outfit].max, outfitStreaks[g.outfit].cur);
        } else {
          outfitStreaks[g.outfit].cur = 0;
        }
      }

      const rank = findNetRankForOpponent(netLookup, g.opponent);

      // First Q1 road win
      if (!firstQ1Road && g.result === 'W' && g.location === '@' && getQuadrant('@', rank) === 1) {
        firstQ1Road = g;
      }

      // Best win / worst loss
      if (rank) {
        if (g.result === 'W' && rank < bestRank) { bestRank = rank; bestWin = g; }
        if (g.result === 'L' && rank > worstRank) { worstRank = rank; worstLoss = g; }
      }

      // Overtime
      if (g.overtime) { otTotal++; if (g.result === 'W') otWins++; }
    }

    const ms = [];
    if (maxStreak >= 3) ms.push({ icon: '🔥', text: `Longest win streak: ${maxStreak} games` });

    let bestOutfitStreak = { outfit: null, count: 0 };
    for (const [outfit, data] of Object.entries(outfitStreaks)) {
      if (data.max > bestOutfitStreak.count) bestOutfitStreak = { outfit, count: data.max };
    }
    if (bestOutfitStreak.count >= 3) ms.push({ icon: '👔', text: `Best outfit streak: ${bestOutfitStreak.count}W in ${bestOutfitStreak.outfit}` });
    if (firstQ1Road) ms.push({ icon: '🏆', text: `First Q1 road win: ${formatLocationLabel('@', 'full')} ${firstQ1Road.opponent}` });
    if (worstLoss && worstRank > 150) ms.push({ icon: '😬', text: `Worst loss: ${formatLocationLabel(worstLoss.location, 'full')} ${worstLoss.opponent} (NET #${worstRank})` });
    if (bestWin && bestRank <= 25) ms.push({ icon: '⭐', text: `Best win: ${formatLocationLabel(bestWin.location, 'full')} ${bestWin.opponent} (NET #${bestRank})` });
    if (otTotal >= 2) ms.push({ icon: '⏱️', text: `Overtime record: ${otWins}-${otTotal - otWins}` });

    return ms;
  }, [completedGames, netLookup]);

  // ── Coffee + Vest Crossover ──
  const [coffeeVisits, setCoffeeVisits] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchVisits()
      .then(data => {
        if (!cancelled) setCoffeeVisits(Array.isArray(data) ? data : data?.visits || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const coffeeCrossover = useMemo(() => {
    if (!coffeeVisits.length || !completedGames.length) return [];
    // For each completed game, check if there was a coffee visit on the same day
    const gameDateMap = {};
    for (const g of completedGames) {
      if (g.date) gameDateMap[g.date] = g;
    }

    // Group by drink
    const drinkStats = {};
    for (const visit of coffeeVisits) {
      const visitDate = toIsoDate(visit.date || visit.visitDate);
      const game = gameDateMap[visitDate];
      if (!game) continue;

      const drink = visit.coffee_order || visit.drink || visit.order || '';
      if (!drink) continue;
      if (!drinkStats[drink]) drinkStats[drink] = { wins: 0, losses: 0 };
      if (game.result === 'W') drinkStats[drink].wins++;
      if (game.result === 'L') drinkStats[drink].losses++;
    }

    return Object.entries(drinkStats)
      .filter(([, s]) => s.wins + s.losses >= 2)
      .map(([drink, s]) => ({
        drink,
        wins: s.wins,
        losses: s.losses,
        total: s.wins + s.losses,
        winRate: Math.round((s.wins / (s.wins + s.losses)) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
  }, [coffeeVisits, completedGames]);

  // ── Opponent Scouting Report for upcoming games ──
  const scoutingReport = useMemo(() => {
    const upcoming = sortedGames.filter(g => !g.result || (g.result !== 'W' && g.result !== 'L'));
    if (!upcoming.length || netStatus !== 'loaded') return null;
    const game = upcoming[0];
    const rank = findNetRankForOpponent(netLookup, game.opponent);
    const quadrant = getQuadrant(game.location || 'vs', rank);

    // Historical record vs this opponent
    const vsOpponent = completedGames.filter(g =>
      g.opponent.toLowerCase() === game.opponent.toLowerCase()
    );
    const vsWins = vsOpponent.filter(g => g.result === 'W').length;
    const vsLosses = vsOpponent.length - vsWins;

    return {
      opponent: game.opponent,
      location: game.location || 'vs',
      date: game.date,
      netRank: rank,
      quadrant,
      allTimeRecord: vsOpponent.length ? { wins: vsWins, losses: vsLosses } : null,
    };
  }, [sortedGames, netLookup, netStatus, completedGames]);

  // ── Vest Advisor: confidence per outfit for next game ──
  const vestAdvisor = useMemo(() => {
    if (!scoutingReport?.quadrant) return [];
    const q = scoutingReport.quadrant;
    const loc = scoutingReport.location;

    return outfitStats.map(stat => {
      const qW = stat.quadrants[q].wins;
      const qL = stat.quadrants[q].losses;
      const qGames = qW + qL;

      // Location-specific record
      const locGames = completedGames.filter(g => g.outfit === stat.outfit && g.location === loc);
      const locW = locGames.filter(g => g.result === 'W').length;
      const locL = locGames.length - locW;

      let confidence = 'unknown';
      if (qGames === 0) confidence = 'untested';
      else if (qGames >= 2 && qW / qGames >= 0.7) confidence = 'high';
      else if (qGames >= 2 && qW / qGames >= 0.4) confidence = 'medium';
      else if (qGames >= 1) confidence = 'low';

      return {
        outfit: stat.outfit,
        confidence,
        qRecord: `${qW}-${qL}`,
        locRecord: locGames.length ? `${locW}-${locL}` : null,
        qGames,
        form: stat.form,
      };
    }).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2, untested: 3, unknown: 4 };
      return (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4);
    });
  }, [scoutingReport, outfitStats, completedGames]);

  // ── AI Blurb ──
  const [aiBlurb, setAiBlurb] = useState('');
  const [aiBlurbLoading, setAiBlurbLoading] = useState(false);

  const generateBlurb = async () => {
    if (!recommendation || aiBlurbLoading) return;
    setAiBlurbLoading(true);
    setAiBlurb('');
    try {
      const top = recommendation.top;
      const parts = [`Recommended outfit: ${top.outfit} (${top.wins}-${top.losses}, ${top.winRate}% win rate)`];
      parts.push(`Last worn ${top.recencyDistance} games ago, form: ${top.form || 'neutral'}`);
      parts.push(`Q1 record: ${top.quadrants[1].wins}-${top.quadrants[1].losses}, Q2: ${top.quadrants[2].wins}-${top.quadrants[2].losses}`);
      if (top.avgNet) parts.push(`Avg opponent NET: #${top.avgNet}`);
      if (scoutingReport) {
        parts.push(`Next game: ${formatLocationLabel(scoutingReport.location, 'full')} ${scoutingReport.opponent}${scoutingReport.netRank ? ` (NET #${scoutingReport.netRank})` : ''}${scoutingReport.quadrant ? `, Q${scoutingReport.quadrant} game` : ''}`);
      }
      if (outfitBadges[top.outfit]?.length) parts.push(`Badges: ${outfitBadges[top.outfit].join(', ')}`);
      const streak2 = countTrailingStreak(top.recentResults);
      if (streak2 && streak2.count >= 2) parts.push(`Current streak: ${streak2.count}${streak2.result}`);

      const { blurb } = await fetchVestBlurb(parts.join('. '));
      setAiBlurb(blurb);
    } catch {
      setAiBlurb('');
    } finally {
      setAiBlurbLoading(false);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingId(null);
    setAddingOutfit(false);
  };

  const startEdit = (game) => {
    setEditingId(game.id);
    setAddingOutfit(false);
    setFormState({
      date: game.date || '',
      location: game.location || 'vs',
      opponent: game.opponent,
      ranking: game.ranking || '',
      outfit: game.outfit || '',
      result: game.result || 'W',
      overtime: Boolean(game.overtime),
    });
  };

  const handleSave = (event) => {
    event.preventDefault();
    const opponent = formState.opponent.trim();
    const outfit = formState.outfit.trim();
    const ranking = formState.ranking.trim();

    if (!opponent) return;

    const payload = {
      date: toIsoDate(formState.date),
      location: formState.location,
      opponent,
      ranking: ranking ? parseInt(ranking, 10) : null,
      outfit,
      result: formState.result,
      overtime: Boolean(formState.overtime),
    };

    if (editingId) {
      setGames((prev) => prev.map((game) => (game.id === editingId ? { ...game, ...payload } : game)));
      resetForm();
      return;
    }

    const nextId = Math.max(0, ...games.map((game) => game.id)) + 1;
    setGames((prev) => [...prev, { id: nextId, ...payload }]);
    setFormState({ ...EMPTY_FORM, result: 'W', location: 'vs' });
    setAddingOutfit(false);
  };

  if (vestTab === 'rankings') {
    return (
      <NetRankingsPage
        netRankings={netRankings}
        netStatus={netStatus}
        onBack={() => setVestTab('dashboard')}
      />
    );
  }

  return (
    <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Tab navigation */}
      <div className="mb-5 sm:mb-6 flex rounded-xl border border-stone-300 dark:border-stone-600 overflow-hidden">
        {[
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'rankings', label: 'NET Rankings' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setVestTab(tab.value)}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 ${
              vestTab === tab.value
                ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm mb-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">Season Record</p>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-4xl font-black tracking-tight">{summary.wins}-{summary.losses}</h2>
              {streak && streak.count >= 2 && (
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${streak.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {streak.result === 'W' ? '🔥 ' : ''}{streak.count}{streak.result === 'W' ? 'W' : 'L'}
                </span>
              )}
            </div>
          </div>
          {selectedOutfit !== 'All outfits' && (
            <button
              onClick={() => setSelectedOutfit('All outfits')}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <span className="text-neutral-400">Filtered:</span>
              <span className="font-semibold">{selectedOutfit}</span>
              <svg className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {recommendation && (
          <div className="mt-5 rounded-xl border border-red-800/50 bg-red-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-red-300/70 font-semibold">Next Fit</p>
                <p className="text-xl font-black mt-1">{recommendation.top.outfit}</p>
              </div>
              <div className="text-right text-sm shrink-0">
                <p className="font-bold text-red-100">{recommendation.top.wins}-{recommendation.top.losses}</p>
                <p className="text-xs text-red-200/60">{recommendation.top.games} games</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
                Q-score: {recommendation.top.quadrantScore >= 0 ? '+' : ''}{recommendation.top.quadrantScore}
              </span>
              <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
                Q1+Q2: {recommendation.top.highTierGames} games
              </span>
              <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
                Last: {recommendation.top.recencyDistance === 1 ? '1 game ago' : `${recommendation.top.recencyDistance} ago`}
              </span>
            </div>
            {recommendation.alternatives.length > 0 && (
              <p className="text-xs text-red-200/60 mt-3">
                Also consider: {recommendation.alternatives.map((entry) => entry.outfit).join(' · ')}
              </p>
            )}
            {jinxAlert && (
              <div className="mt-3 rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                ⚠️ <span className="font-semibold">Jinx Alert:</span> {jinxAlert.outfit} has never been worn in a Q{jinxAlert.quadrant} game.
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={generateBlurb}
                disabled={aiBlurbLoading}
                className="text-[11px] uppercase tracking-[0.08em] font-semibold text-red-200/70 hover:text-red-100 transition-colors disabled:opacity-50"
              >
                {aiBlurbLoading ? 'Generating...' : '✨ AI take'}
              </button>
              {aiBlurb && (
                <p className="text-sm text-red-100/90 italic">{aiBlurb}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Scouting Report + Vest Advisor for upcoming game */}
      {scoutingReport && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Scouting Report</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            Next up: {formatLocationLabel(scoutingReport.location, 'full')} {scoutingReport.opponent}
            {scoutingReport.date ? ` on ${formatDate(scoutingReport.date)}` : ''}
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {scoutingReport.netRank && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <span className="text-xs text-stone-500 dark:text-stone-400 block">NET Rank</span>
                <span className="font-bold text-stone-800 dark:text-stone-100">#{scoutingReport.netRank}</span>
              </div>
            )}
            {scoutingReport.quadrant && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <span className="text-xs text-stone-500 dark:text-stone-400 block">Quadrant</span>
                <span className={`font-bold ${scoutingReport.quadrant <= 2 ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'}`}>
                  Q{scoutingReport.quadrant}
                </span>
              </div>
            )}
            {scoutingReport.allTimeRecord && (
              <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <span className="text-xs text-stone-500 dark:text-stone-400 block">All-time vs {scoutingReport.opponent}</span>
                <span className="font-bold text-stone-800 dark:text-stone-100">
                  {scoutingReport.allTimeRecord.wins}-{scoutingReport.allTimeRecord.losses}
                </span>
              </div>
            )}
          </div>

          {/* Vest Advisor */}
          {vestAdvisor.length > 0 && scoutingReport.quadrant && (
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-stone-500 mb-2">
                Vest Advisor — Q{scoutingReport.quadrant} {formatLocationLabel(scoutingReport.location, 'adjective')} confidence
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {vestAdvisor.map(a => (
                    <div key={a.outfit} className={`rounded-xl border px-3 py-2 text-sm ${CONFIDENCE_COLORS[a.confidence]}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-800 dark:text-stone-100">{a.outfit}</span>
                        <span className={`text-xs font-bold ${CONFIDENCE_LABEL_COLORS[a.confidence]}`}>{CONFIDENCE_LABELS[a.confidence]}</span>
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Q{scoutingReport.quadrant}: {a.qRecord}
                        {a.locRecord && ` • ${formatLocationLabel(scoutingReport.location, 'Adjective')}: ${a.locRecord}`}
                        {a.form === 'hot' ? ' • 🔥' : a.form === 'cold' ? ' • ❄️' : ''}
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Season timeline */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Season Timeline</h3>
          <span className="text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 font-medium">Tap to edit</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {visibleGames.map((game, index) => {
            const isWin = game.result === 'W';
            const isLoss = game.result === 'L';
            const resultLabel = isWin ? 'W' : isLoss ? 'L' : 'TBD';
            const gameQuadrant = (isWin || isLoss) && netStatus === 'loaded'
              ? getQuadrant(game.location, findNetRankForOpponent(netLookup, game.opponent))
              : null;

            return (
              <button
                key={`${game.id}-${index}`}
                onClick={() => startEdit(game)}
                className={`min-w-[160px] rounded-xl border px-3 py-2.5 text-left text-sm transition-all hover:shadow-md active:scale-[0.98] ${
                  isWin
                    ? 'bg-emerald-50 border-emerald-200/80 dark:bg-emerald-900/20 dark:border-emerald-800/60'
                    : isLoss
                    ? 'bg-red-50 border-red-200/80 dark:bg-red-900/20 dark:border-red-800/60'
                    : 'bg-stone-50 border-stone-200 dark:bg-stone-700/30 dark:border-stone-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">{formatDate(game.date) || `Game ${index + 1}`}</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isWin ? 'bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300'
                    : isLoss ? 'bg-red-200/60 text-red-700 dark:bg-red-800/50 dark:text-red-300'
                    : 'bg-stone-200/60 text-stone-600 dark:bg-stone-600/50 dark:text-stone-300'
                  }`}>
                    {resultLabel}{gameQuadrant ? ` Q${gameQuadrant}` : ''}
                  </span>
                </div>
                <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {formatLocationLabel(game.location, 'full')}&nbsp;{game.ranking ? <>{toSuperscript(game.ranking)}&thinsp;</> : null}{game.opponent}{game.overtime && ' (OT)'}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{game.outfit || 'Outfit TBD'}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Outfit cards */}
      <section className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 mb-3 font-semibold">Tap an outfit to filter timeline</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {outfitStats.map((stat) => {
            const winPct = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;
            const isSelected = selectedOutfit === stat.outfit;

            return (
              <button
                key={stat.outfit}
                onClick={() => setSelectedOutfit(isSelected ? 'All outfits' : stat.outfit)}
                className={`bg-white dark:bg-stone-800 border rounded-2xl p-5 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99] ${
                  isSelected
                    ? 'border-red-500 dark:border-red-600 ring-2 ring-red-500/20 dark:ring-red-600/30'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{stat.outfit}</h3>
                    {stat.form === 'hot' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        🔥 Hot
                      </span>
                    )}
                    {stat.form === 'cold' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        ❄️ Cold
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-lg font-black text-stone-900 dark:text-stone-100">{stat.wins}-{stat.losses}</span>
                    <span className="block text-[10px] font-semibold text-stone-400 dark:text-stone-500">{winPct}% win</span>
                  </div>
                </div>

                {outfitBadges[stat.outfit]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {outfitBadges[stat.outfit].map((badge) => (
                      <span key={badge} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}

                <div className="h-2.5 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${winPct}%` }} title={`Wins: ${stat.wins}`} />
                  <div className="h-full bg-red-400 dark:bg-red-500 rounded-r-full transition-all" style={{ width: `${100 - winPct}%` }} title={`Losses: ${stat.losses}`} />
                </div>

                <p className="mt-2.5 text-xs text-stone-500 dark:text-stone-400">
                  {stat.games} {stat.games === 1 ? 'game' : 'games'} · last {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
                  {stat.avgNet && netStatus === 'loaded' && ` · SoS #${stat.avgNet}`}
                </p>

                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
                  {[1, 2, 3, 4].map((quad) => (
                    <div key={quad} className="rounded-lg bg-stone-50 dark:bg-stone-700/50 px-2 py-1.5 text-center">
                      <span className="text-stone-400 dark:text-stone-500">Q{quad}</span>{' '}
                      {netStatus === 'loaded' ? `${stat.quadrants[quad].wins}-${stat.quadrants[quad].losses}` : '—'}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {netStatus !== 'loaded' && (
          <p className="text-xs text-stone-500 mt-3">
            {netStatus === 'missing-url' && 'Set NET_RANKINGS_URL on the API (or VITE_NET_RANKINGS_URL in frontend) to load live NET-based quadrant records. Big Ten standings worker payloads are supported.'}
            {netStatus === 'loading' && 'Loading live NET rankings\u2026'}
            {netStatus === 'error' && 'Unable to load NET rankings. Quadrant stats are temporarily unavailable.'}
          </p>
        )}
        {netStatus === 'loaded' && (
          <p className="text-xs text-stone-500 mt-3">
            NET feed loaded: {netRankings.length} teams (target ~365).
          </p>
        )}
      </section>

      {/* Season Storylines / Milestones */}
      {milestones.length > 0 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Season Storylines</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm text-stone-700 dark:text-stone-200">
                <span className="text-base shrink-0">{m.icon}</span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Head-to-Head Outfit Comparison */}
      {outfitStats.length >= 2 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Head-to-Head Comparison</h3>
            {(compareOutfits[0] || compareOutfits[1]) && (
              <button
                onClick={() => setCompareOutfits([null, null])}
                className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={compareOutfits[slot] || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setCompareOutfits((prev) => {
                    const next = [...prev];
                    next[slot] = val;
                    return next;
                  });
                }}
                className="rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 text-sm w-full sm:w-auto"
              >
                <option value="">Select outfit {slot + 1}</option>
                {outfitStats.map((s) => (
                  <option key={s.outfit} value={s.outfit}>{s.outfit}</option>
                ))}
              </select>
            ))}
          </div>
          {comparisonData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[comparisonData.a, comparisonData.b].map((s) => (
                <div key={s.outfit} className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-2">{s.outfit}</h4>
                  <div className="space-y-1 text-sm text-stone-600 dark:text-stone-300">
                    <p>Record: <span className="font-semibold">{s.wins}-{s.losses}</span> ({s.winRate}%)</p>
                    <p>Q1: {s.quadrants[1].wins}-{s.quadrants[1].losses} • Q2: {s.quadrants[2].wins}-{s.quadrants[2].losses}</p>
                    <p>Q3: {s.quadrants[3].wins}-{s.quadrants[3].losses} • Q4: {s.quadrants[4].wins}-{s.quadrants[4].losses}</p>
                    {s.avgNet && <p>Avg opponent NET: #{s.avgNet}</p>}
                    <p>Form: {s.form === 'hot' ? '🔥 Hot' : s.form === 'cold' ? '❄️ Cold' : 'Neutral'}</p>
                    {s.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.badges.map((b) => (
                          <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Coffee + Vest Crossover */}
      {coffeeCrossover.length > 0 && (
        <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">Game-Day Coffee</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">Does your coffee order affect the outcome?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {coffeeCrossover.map((c) => (
              <div key={c.drink} className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{c.drink}</span>
                  <span className={`font-bold ${c.winRate >= 60 ? 'text-emerald-600 dark:text-emerald-400' : c.winRate <= 40 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'}`}>
                    {c.wins}W-{c.losses}L
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${c.winRate}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${100 - c.winRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add / Edit form */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {editingId ? 'Edit Game' : 'Add Game'}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Cancel</button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Date</span>
              <input
                type="date"
                value={formState.date}
                onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Location</span>
              <select
                value={formState.location}
                onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
              >
                <option value="vs">Home (vs)</option>
                <option value="@">Away (@)</option>
                <option value="N">Neutral (N)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Opponent</span>
              <input
                value={formState.opponent}
                onChange={(event) => setFormState((prev) => ({ ...prev, opponent: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors"
                placeholder="e.g. Indiana"
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Rank</span>
              <input
                type="number"
                min="1"
                max="25"
                value={formState.ranking}
                onChange={(event) => setFormState((prev) => ({ ...prev, ranking: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors"
                placeholder="#"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Outfit</span>
              {addingOutfit ? (
                <input
                  autoFocus
                  value={formState.outfit}
                  onChange={(event) => setFormState((prev) => ({ ...prev, outfit: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors"
                  placeholder="e.g. Red Vest"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setAddingOutfit(false);
                      setFormState((prev) => ({ ...prev, outfit: '' }));
                    }
                  }}
                />
              ) : (
                <select
                  value={formState.outfit}
                  onChange={(event) => {
                    if (event.target.value === '__add__') {
                      setAddingOutfit(true);
                      setFormState((prev) => ({ ...prev, outfit: '' }));
                    } else {
                      setFormState((prev) => ({ ...prev, outfit: event.target.value }));
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                >
                  <option value="">Select outfit</option>
                  {existingOutfits.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value="__add__">+ New Outfit</option>
                </select>
              )}
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">Result</span>
              <select
                value={formState.result}
                onChange={(event) => setFormState((prev) => ({ ...prev, result: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
              >
                <option value="W">Win</option>
                <option value="L">Loss</option>
                <option value="">Upcoming</option>
              </select>
            </label>

            <label className="flex items-end">
              <div className="flex items-center gap-2.5 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.overtime}
                  onChange={(event) => setFormState((prev) => ({ ...prev, overtime: event.target.checked }))}
                  className="rounded border-stone-300 dark:border-stone-600"
                />
                <span className="text-sm text-stone-700 dark:text-stone-200">OT</span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto btn-primary text-sm px-6 py-2.5 mt-1"
          >
            {editingId ? 'Save Changes' : 'Add Game'}
          </button>
        </form>
      </section>
    </main>
  );
}
