import { useEffect, useMemo, useState } from 'react';
import { vestGames as seedGames } from '../utils/vestTrackerData';
import { fetchVestGames, syncVestGames } from '../utils/api';

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
  if (location === '@') return mode === 'full' ? 'at' : '@';
  if (location === 'N') return mode === 'full' ? 'neutral vs' : 'N';
  return 'vs';
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
  const streak = useMemo(() => {
    if (!completedGames.length) return null;
    const last = completedGames[completedGames.length - 1].result;
    let count = 0;
    for (let i = completedGames.length - 1; i >= 0; i--) {
      if (completedGames[i].result === last) count++;
      else break;
    }
    return { result: last, count };
  }, [completedGames]);

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
            quadrants: {
              1: { wins: 0, losses: 0 },
              2: { wins: 0, losses: 0 },
              3: { wins: 0, losses: 0 },
              4: { wins: 0, losses: 0 },
            },
          };
        }

        acc[game.outfit].games += 1;
        acc[game.outfit].lastSeen = game.opponent;
        acc[game.outfit].lastSeenLocation = game.location || 'vs';
        acc[game.outfit].lastIndex = index;
        acc[game.outfit].recentResults.push(game.result);
        if (game.result === 'W') acc[game.outfit].wins += 1;
        if (game.result === 'L') acc[game.outfit].losses += 1;

        const netRank = findNetRankForOpponent(netLookup, game.opponent);
        const quadrant = getQuadrant(game.location, netRank);
        if (quadrant && (game.result === 'W' || game.result === 'L')) {
          if (game.result === 'W') acc[game.outfit].quadrants[quadrant].wins += 1;
          if (game.result === 'L') acc[game.outfit].quadrants[quadrant].losses += 1;
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

  return (
    <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-400">Vest Tracker</p>
            <h2 className="text-3xl font-black tracking-tight mt-1">{summary.wins}-{summary.losses}</h2>
            {streak && streak.count >= 2 && (
              <p className={`text-sm font-semibold mt-1 ${streak.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>
                {streak.result === 'W' ? '🔥' : ''}{streak.count}{streak.result === 'W' ? 'W' : 'L'} streak
              </p>
            )}
          </div>
          {selectedOutfit !== 'All outfits' && (
            <div className="text-sm">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-400">Filtered by</p>
              <p className="font-semibold mt-1">{selectedOutfit}</p>
            </div>
          )}
        </div>

        {recommendation && (
          <div className="mt-5 rounded-xl border border-red-700/40 bg-red-950/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-red-200">Next fit recommendation</p>
            <p className="text-lg font-bold mt-1">{recommendation.top.outfit}</p>
            <p className="text-sm text-red-100/90 mt-1">
              {recommendation.top.wins}-{recommendation.top.losses} in {recommendation.top.games}{' '}
              {recommendation.top.games === 1 ? 'game' : 'games'}, last worn{' '}
              {recommendation.top.recencyDistance === 1
                ? '1 game ago'
                : `${recommendation.top.recencyDistance} games ago`}
            </p>
            <p className="text-xs text-red-200/80 mt-2">
              Quadrant quality score: {recommendation.top.quadrantScore >= 0 ? '+' : ''}
              {recommendation.top.quadrantScore} • Q1+Q2 exposure: {recommendation.top.highTierGames} games
            </p>
            {recommendation.alternatives.length > 0 && (
              <p className="text-xs text-red-200/70 mt-2">
                Also consider: {recommendation.alternatives.map((entry) => entry.outfit).join(' • ')}
              </p>
            )}
            <p className="text-[11px] text-red-200/60 mt-2">
              Smart pick blends win rate, recent form, and performance against tougher (Q1/Q2) opponents.
            </p>
          </div>
        )}
      </section>

      {/* Outfit cards */}
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.08em] text-stone-500 mb-3">Click an outfit to filter timeline</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {outfitStats.map((stat) => {
            const winWidth = (stat.wins / stat.games) * 100;
            const lossWidth = (stat.losses / stat.games) * 100;
            const isSelected = selectedOutfit === stat.outfit;

            return (
              <button
                key={stat.outfit}
                onClick={() => setSelectedOutfit(isSelected ? 'All outfits' : stat.outfit)}
                className={`bg-white dark:bg-stone-800 border rounded-2xl p-5 shadow-sm text-left transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-red-500 dark:border-red-600 ring-2 ring-red-500/20 dark:ring-red-600/30'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{stat.outfit}</h3>
                    {stat.form === 'hot' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        🔥 Hot
                      </span>
                    )}
                    {stat.form === 'cold' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        ❄️ Cold
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-stone-500 dark:text-stone-300 shrink-0 ml-2">{stat.wins}-{stat.losses}</span>
                </div>

                <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${winWidth}%` }} title={`Wins: ${stat.wins}`} />
                  <div className="h-full bg-red-500" style={{ width: `${lossWidth}%` }} title={`Losses: ${stat.losses}`} />
                </div>

                <div className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                  {stat.games} {stat.games === 1 ? 'game' : 'games'} • last worn {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-stone-600 dark:text-stone-300">
                  {[1, 2, 3, 4].map((quad) => (
                    <div key={quad} className="rounded-lg bg-stone-100 dark:bg-stone-700/60 px-2 py-1">
                      Q{quad}: {netStatus === 'loaded' ? `${stat.quadrants[quad].wins}-${stat.quadrants[quad].losses}` : '—'}
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
            {netStatus === 'loading' && 'Loading live NET rankings…'}
            {netStatus === 'error' && 'Unable to load NET rankings. Quadrant stats are temporarily unavailable.'}
          </p>
        )}
        {netStatus === 'loaded' && (
          <p className="text-xs text-stone-500 mt-3">
            NET feed loaded: {netRankings.length} teams (target ~365).
          </p>
        )}
      </section>

      {/* Season timeline — newest first */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Season Timeline</h3>
          <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Click a game to edit</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visibleGames.map((game, index) => {
            const resultClass =
              game.result === 'W'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
                : game.result === 'L'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'
                  : 'bg-stone-50 border-stone-200 text-stone-700 dark:bg-stone-700/30 dark:border-stone-600 dark:text-stone-200';

            const resultLabel = game.result === 'W' ? 'Win' : game.result === 'L' ? 'Loss' : 'Upcoming';
            const gameQuadrant = (game.result === 'W' || game.result === 'L') && netStatus === 'loaded'
              ? getQuadrant(game.location, netLookup.get(normalizeTeamName(game.opponent)))
              : null;

            return (
              <button
                key={`${game.id}-${index}`}
                onClick={() => startEdit(game)}
                className={`min-w-[176px] rounded-xl border px-3 py-2 text-left text-sm transition-colors ${resultClass}`}
              >
                <div className="text-xs opacity-75">
                  {formatDate(game.date) || `Game ${index + 1}`}
                </div>
                <div className="font-semibold">
                  {formatLocationLabel(game.location, 'full')}&nbsp;&nbsp;{game.ranking ? <>{toSuperscript(game.ranking)}&thinsp;</> : null}{game.opponent}{game.overtime && ' (OT)'}
                </div>
                <div className="text-xs mt-1 opacity-80">{game.outfit || 'Outfit TBD'}</div>
                <div className="text-xs mt-1 font-semibold">
                  {resultLabel}{gameQuadrant ? ` • Q${gameQuadrant}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Add / Edit form */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
          {editingId ? `Edit game #${editingId}` : 'Add game'}
        </h3>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-3 items-end">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Date</span>
            <input
              type="date"
              value={formState.date}
              onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">At / Vs</span>
            <select
              value={formState.location}
              onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
            >
              <option value="vs">vs</option>
              <option value="@">@</option>
              <option value="N">N</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Opponent</span>
            <input
              value={formState.opponent}
              onChange={(event) => setFormState((prev) => ({ ...prev, opponent: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
              placeholder="Indiana"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Rank #</span>
            <input
              type="number"
              min="1"
              max="25"
              value={formState.ranking}
              onChange={(event) => setFormState((prev) => ({ ...prev, ranking: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
              placeholder="e.g. 5"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Outfit</span>
            {addingOutfit ? (
              <input
                autoFocus
                value={formState.outfit}
                onChange={(event) => setFormState((prev) => ({ ...prev, outfit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
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
                className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
              >
                <option value="">Select outfit</option>
                {existingOutfits.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="__add__">+ Add Outfit</option>
              </select>
            )}
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.08em] text-stone-500">Result</span>
            <select
              value={formState.result}
              onChange={(event) => setFormState((prev) => ({ ...prev, result: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm"
            >
              <option value="W">Win</option>
              <option value="L">Loss</option>
              <option value="">Upcoming</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-600 px-3 py-2 h-[42px]">
            <input
              type="checkbox"
              checked={formState.overtime}
              onChange={(event) => setFormState((prev) => ({ ...prev, overtime: event.target.checked }))}
            />
            <span className="text-sm">Overtime</span>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm px-4 py-2">{editingId ? 'Save' : 'Add'}</button>
            {editingId && <button type="button" onClick={resetForm} className="btn-secondary text-sm px-4 py-2">Cancel</button>}
          </div>
        </form>
      </section>
    </main>
  );
}
