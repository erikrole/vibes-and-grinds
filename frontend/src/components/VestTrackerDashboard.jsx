import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { vestGames as seedGames } from '../utils/vestTrackerData';
import { fetchVestGames, syncVestGames, fetchVisits, fetchVestBlurb } from '../utils/api';
import {
  buildNetLookup,
  buildOutfitStats,
  buildWhySentence,
  computeRecommendation,
  countTrailingStreak,
  findNetRankForOpponent,
  formatDate,
  formatLocationLabel,
  getQuadrant,
  normalizeNetResponse,
  normalizeTeamName,
  toIsoDate,
} from '../utils/vestTrackerMath';
import { getTodayDateString } from '../utils/dates';
import NetRankingsPage from './NetRankingsPage';
import VestScoreboard from './VestScoreboard';
import VestNextGame from './VestNextGame';
import VestTimeline from './VestTimeline';
import VestLeaderboard from './VestLeaderboard';
import VestExtras from './VestExtras';
import VestGameForm from './VestGameForm';
import VestLockInPick from './VestLockInPick';
import VestPostGame from './VestPostGame';

const GameStatsPanel = lazy(() => import('./GameStatsPanel'));

const VEST_GAMES_KEY = 'vibes-and-grinds:vest-games';
const NET_RANKINGS_URL = import.meta.env.VITE_NET_RANKINGS_URL || '';
const NET_FETCH_PATHS = ['/api/vest/net-rankings', '/api/vest/net'];

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'game-stats', label: 'Game Stats' },
  { value: 'rankings', label: 'NET Rankings' },
];

const loadGames = () => {
  try {
    const raw = localStorage.getItem(VEST_GAMES_KEY);
    if (raw) return { games: JSON.parse(raw), corrupted: false };
  } catch {
    return { games: seedGames, corrupted: true };
  }
  return { games: seedGames, corrupted: false };
};

export default function VestTrackerDashboard({ showToast }) {
  const corruptedRef = useRef(false);
  const [games, setGames] = useState(() => {
    const { games: loaded, corrupted } = loadGames();
    if (corrupted) corruptedRef.current = true;
    return loaded;
  });
  const [netRankings, setNetRankings] = useState([]);
  const [netStatus, setNetStatus] = useState('idle');
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [vestTab, setVestTab] = useState('dashboard');
  const [syncReady, setSyncReady] = useState(false);

  // Warn once if localStorage was corrupted on load.
  useEffect(() => {
    if (corruptedRef.current && showToast) {
      showToast('Local data was corrupted. Loaded default data.', 'error');
    }
  }, [showToast]);

  // Persist game changes.
  useEffect(() => {
    try { localStorage.setItem(VEST_GAMES_KEY, JSON.stringify(games)); } catch { /* ignore */ }
  }, [games]);

  // Initial sync from server (overrides local seed if data exists).
  useEffect(() => {
    let cancelled = false;
    fetchVestGames()
      .then((payload) => {
        const serverGames = Array.isArray(payload?.games) ? payload.games : [];
        if (!cancelled && serverGames.length > 0) setGames(serverGames);
      })
      .catch(() => { /* fall back to local */ })
      .finally(() => { if (!cancelled) setSyncReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Push changes upstream once initial sync resolves.
  useEffect(() => {
    if (!syncReady) return;
    syncVestGames(games).catch(() => { /* offline/dev — ignore */ });
  }, [games, syncReady]);

  // Fetch NET rankings from any of the supported worker shapes.
  useEffect(() => {
    let cancelled = false;
    const sources = [...NET_FETCH_PATHS, ...(NET_RANKINGS_URL ? [NET_RANKINGS_URL] : [])];

    const toRows = (payload) =>
      normalizeNetResponse(payload)
        .map((entry) => {
          const teamName = entry.team || entry.teamName || entry.school || entry.name || entry.program;
          const rank = Number(entry.netRank ?? entry.rank ?? entry.net_ranking ?? entry.NET ?? entry.position);
          if (!teamName || !Number.isFinite(rank)) return null;
          return { team: teamName, rank, key: normalizeTeamName(teamName), record: entry.record || null };
        })
        .filter(Boolean);

    const load = async () => {
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
        } catch { /* try next source */ }
      }
      if (!cancelled) {
        setNetRankings([]);
        setNetStatus('error');
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const netLookup = useMemo(() => buildNetLookup(netRankings), [netRankings]);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [games]
  );

  const completedGames = useMemo(
    () => sortedGames.filter((g) => g.result === 'W' || g.result === 'L'),
    [sortedGames]
  );

  const teamWins = useMemo(() => completedGames.filter((g) => g.result === 'W').length, [completedGames]);
  const teamLosses = completedGames.length - teamWins;

  const outfits = useMemo(
    () => [...new Set(completedGames.filter((g) => g.outfit).map((g) => g.outfit))],
    [completedGames]
  );

  const existingOutfits = useMemo(
    () => [...new Set(games.filter((g) => g.outfit).map((g) => g.outfit))].sort(),
    [games]
  );

  // Reset filter if the selected outfit is no longer present.
  useEffect(() => {
    if (selectedOutfit && !outfits.includes(selectedOutfit)) setSelectedOutfit(null);
  }, [outfits, selectedOutfit]);

  // Annotate timeline games with quadrant (needs NET) and sort newest-first.
  const visibleTimelineGames = useMemo(() => {
    const filtered = selectedOutfit
      ? sortedGames.filter((g) => g.outfit === selectedOutfit)
      : sortedGames;
    return filtered.map((game) => ({
      ...game,
      quadrant:
        netStatus === 'loaded' && (game.result === 'W' || game.result === 'L')
          ? getQuadrant(game.location, findNetRankForOpponent(netLookup, game.opponent))
          : null,
    }));
  }, [sortedGames, selectedOutfit, netLookup, netStatus]);

  // Filtered scoreboard summary.
  const summary = useMemo(() => {
    const source = selectedOutfit
      ? completedGames.filter((g) => g.outfit === selectedOutfit)
      : completedGames;
    const wins = source.filter((g) => g.result === 'W').length;
    return { wins, losses: source.length - wins };
  }, [completedGames, selectedOutfit]);

  const streak = useMemo(
    () => countTrailingStreak(
      (selectedOutfit
        ? completedGames.filter((g) => g.outfit === selectedOutfit)
        : completedGames
      ).map((g) => g.result)
    ),
    [completedGames, selectedOutfit]
  );

  // Secondary scoreboard pills — only when not filtered.
  const scoreboardSecondary = useMemo(() => {
    if (selectedOutfit) return [];
    const road = completedGames.filter((g) => g.location === '@');
    const roadW = road.filter((g) => g.result === 'W').length;
    const neutral = completedGames.filter((g) => g.location === 'N');
    const neutralW = neutral.filter((g) => g.result === 'W').length;
    const ot = completedGames.filter((g) => g.overtime);
    const otW = ot.filter((g) => g.result === 'W').length;

    const pills = [];
    if (road.length) pills.push({ label: 'Road', value: `${roadW}–${road.length - roadW}` });
    if (neutral.length) pills.push({ label: 'Neutral', value: `${neutralW}–${neutral.length - neutralW}` });
    if (ot.length) pills.push({ label: 'OT', value: `${otW}–${ot.length - otW}` });

    if (netStatus === 'loaded') {
      const q1q2 = completedGames.filter((g) => {
        const q = getQuadrant(g.location, findNetRankForOpponent(netLookup, g.opponent));
        return q === 1 || q === 2;
      });
      const q1q2W = q1q2.filter((g) => g.result === 'W').length;
      if (q1q2.length) pills.push({ label: 'Q1+Q2', value: `${q1q2W}–${q1q2.length - q1q2W}` });
    }
    return pills;
  }, [completedGames, selectedOutfit, netLookup, netStatus]);

  // Per-outfit stats with smoothing + WoE.
  const outfitStats = useMemo(
    () => buildOutfitStats({
      completedGames,
      netLookup,
      teamWins,
      teamGames: completedGames.length,
    }),
    [completedGames, netLookup, teamWins]
  );

  const recommendation = useMemo(
    () => computeRecommendation(outfitStats, completedGames),
    [outfitStats, completedGames]
  );

  // Badges per outfit, narrative-style.
  const outfitBadges = useMemo(() => {
    const badges = {};
    for (const stat of outfitStats) {
      const list = [];
      const s = countTrailingStreak(stat.results);
      if (s && s.count >= 3 && s.result === 'W') list.push(`${s.count}-Game Heater`);
      else if (s && s.count >= 3 && s.result === 'L') list.push(`${s.count}-Game Skid`);
      if (stat.roadWins >= 3) list.push(`Road Warrior (${stat.roadWins}-${stat.roadLosses})`);
      if (stat.quadrants[1].wins >= 2) list.push(`Q1 Slayer (${stat.quadrants[1].wins}-${stat.quadrants[1].losses})`);
      if (stat.games >= 3 && stat.losses === 0) list.push('Undefeated');
      if (stat.otWins >= 2) list.push(`OT Specialist (${stat.otWins}-${stat.otLosses})`);
      if (list.length) badges[stat.outfit] = list;
    }
    return badges;
  }, [outfitStats]);

  // Next game scouting report.
  const upcomingGame = useMemo(
    () => sortedGames.find((g) => !g.result || (g.result !== 'W' && g.result !== 'L')) || null,
    [sortedGames]
  );

  // Once the game day arrives (date <= today) and an outfit is locked,
  // switch from the lock-in card to the post-game result card.
  // Recompute each render (cheap) rather than memoizing forever, so the
  // post-game switch reflects the correct day if the tab is left open past midnight.
  const todayStr = getTodayDateString();
  const showPostGame = Boolean(
    upcomingGame?.outfit && upcomingGame?.date && upcomingGame.date <= todayStr
  );

  const scoutingReport = useMemo(() => {
    const upcoming = upcomingGame;
    if (!upcoming) return null;
    const rank = findNetRankForOpponent(netLookup, upcoming.opponent);
    const quadrant = getQuadrant(upcoming.location || 'vs', rank);
    const vsOpponent = completedGames.filter(
      (g) => g.opponent.toLowerCase() === upcoming.opponent.toLowerCase()
    );
    const vsWins = vsOpponent.filter((g) => g.result === 'W').length;
    return {
      opponent: upcoming.opponent,
      location: upcoming.location || 'vs',
      date: upcoming.date,
      netRank: Number.isFinite(rank) ? rank : null,
      quadrant,
      allTimeRecord: vsOpponent.length ? { wins: vsWins, losses: vsOpponent.length - vsWins } : null,
    };
  }, [upcomingGame, netLookup, completedGames]);

  // Per-outfit advisor for the upcoming game's quadrant + location.
  const advisor = useMemo(() => {
    if (!scoutingReport?.quadrant) return [];
    const q = scoutingReport.quadrant;
    const loc = scoutingReport.location;
    return outfitStats
      .map((stat) => {
        const qW = stat.quadrants[q].wins;
        const qL = stat.quadrants[q].losses;
        const qGames = qW + qL;
        const locGames = completedGames.filter((g) => g.outfit === stat.outfit && g.location === loc);
        const locW = locGames.filter((g) => g.result === 'W').length;
        let confidence = 'unknown';
        if (qGames === 0) confidence = 'untested';
        else if (qGames >= 2 && qW / qGames >= 0.7) confidence = 'high';
        else if (qGames >= 2 && qW / qGames >= 0.4) confidence = 'medium';
        else if (qGames >= 1) confidence = 'low';
        return {
          outfit: stat.outfit,
          confidence,
          qRecord: `${qW}–${qL}`,
          locRecord: locGames.length ? `${locW}–${locGames.length - locW}` : null,
          qGames,
          form: stat.form,
        };
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2, untested: 3, unknown: 4 };
        return (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4);
      });
  }, [scoutingReport, outfitStats, completedGames]);

  // Jinx alert — top recommendation has never been worn in this quadrant.
  const jinxAlert = useMemo(() => {
    if (!recommendation || !scoutingReport?.quadrant) return null;
    const topStat = outfitStats.find((s) => s.outfit === recommendation.top.outfit);
    if (!topStat) return null;
    const q = scoutingReport.quadrant;
    if (topStat.quadrants[q].wins + topStat.quadrants[q].losses === 0) {
      return { outfit: topStat.outfit, quadrant: q };
    }
    return null;
  }, [recommendation, scoutingReport, outfitStats]);

  // Season storylines (single pass over completed games).
  const milestones = useMemo(() => {
    if (!completedGames.length) return [];
    let maxStreak = 0;
    let curStreak = 0;
    const outfitStreaks = {};
    let firstQ1Road = null;
    let worstLoss = null;
    let worstRank = 0;
    let bestWin = null;
    let bestRank = 999;
    let otWins = 0;
    let otTotal = 0;

    for (const g of completedGames) {
      if (g.result === 'W') {
        curStreak += 1;
        if (curStreak > maxStreak) maxStreak = curStreak;
      } else {
        curStreak = 0;
      }

      if (g.outfit) {
        if (!outfitStreaks[g.outfit]) outfitStreaks[g.outfit] = { max: 0, cur: 0 };
        if (g.result === 'W') {
          outfitStreaks[g.outfit].cur += 1;
          outfitStreaks[g.outfit].max = Math.max(outfitStreaks[g.outfit].max, outfitStreaks[g.outfit].cur);
        } else {
          outfitStreaks[g.outfit].cur = 0;
        }
      }

      const rank = findNetRankForOpponent(netLookup, g.opponent);
      if (!firstQ1Road && g.result === 'W' && g.location === '@' && getQuadrant('@', rank) === 1) {
        firstQ1Road = g;
      }
      if (rank) {
        if (g.result === 'W' && rank < bestRank) { bestRank = rank; bestWin = g; }
        if (g.result === 'L' && rank > worstRank) { worstRank = rank; worstLoss = g; }
      }
      if (g.overtime) {
        otTotal += 1;
        if (g.result === 'W') otWins += 1;
      }
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
    if (otTotal >= 2) ms.push({ icon: '⏱️', text: `Overtime record: ${otWins}–${otTotal - otWins}` });

    return ms;
  }, [completedGames, netLookup]);

  // Coffee crossover — same-day visits grouped by drink.
  const [coffeeVisits, setCoffeeVisits] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetchVisits()
      .then((data) => {
        if (!cancelled) setCoffeeVisits(Array.isArray(data) ? data : data?.visits || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const coffeeCrossover = useMemo(() => {
    if (!coffeeVisits.length || !completedGames.length) return [];
    const gameDateMap = {};
    for (const g of completedGames) if (g.date) gameDateMap[g.date] = g;
    const drinkStats = {};
    for (const visit of coffeeVisits) {
      const visitDate = toIsoDate(visit.date || visit.visitDate);
      const game = gameDateMap[visitDate];
      if (!game) continue;
      const drink = visit.coffee_order || visit.drink || visit.order || '';
      if (!drink) continue;
      if (!drinkStats[drink]) drinkStats[drink] = { wins: 0, losses: 0 };
      if (game.result === 'W') drinkStats[drink].wins += 1;
      else drinkStats[drink].losses += 1;
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

  // AI blurb — composes a context string and calls the worker.
  const [aiBlurb, setAiBlurb] = useState('');
  const [aiBlurbLoading, setAiBlurbLoading] = useState(false);

  const generateBlurb = async () => {
    if (!recommendation || aiBlurbLoading) return;
    setAiBlurbLoading(true);
    setAiBlurb('');
    try {
      const top = recommendation.top;
      const parts = [
        `Recommended outfit: ${top.outfit} (${top.wins}-${top.losses}, ${top.smoothedRatePct}% smoothed win rate)`,
        `Score: ${Math.round(top.score)}/100, last worn ${top.recencyDistance} games ago, form: ${top.form || 'neutral'}`,
        `Wins above expected: ${top.winsAboveExpected.toFixed(1)}`,
        `Q1: ${top.quadrants[1].wins}-${top.quadrants[1].losses}, Q2: ${top.quadrants[2].wins}-${top.quadrants[2].losses}`,
      ];
      if (top.avgNet) parts.push(`Avg opponent NET: #${top.avgNet}`);
      if (scoutingReport) {
        parts.push(
          `Next game: ${formatLocationLabel(scoutingReport.location, 'full')} ${scoutingReport.opponent}` +
            `${scoutingReport.netRank ? ` (NET #${scoutingReport.netRank})` : ''}` +
            `${scoutingReport.quadrant ? `, Q${scoutingReport.quadrant} game` : ''}`
        );
      }
      if (outfitBadges[top.outfit]?.length) parts.push(`Badges: ${outfitBadges[top.outfit].join(', ')}`);
      const trail = countTrailingStreak(top.results);
      if (trail && trail.count >= 2) parts.push(`Current streak: ${trail.count}${trail.result}`);

      const { blurb } = await fetchVestBlurb(parts.join('. '));
      setAiBlurb(blurb);
    } catch {
      setAiBlurb('');
    } finally {
      setAiBlurbLoading(false);
    }
  };

  // ── Form save/delete handlers ──
  const handleSave = (payload) => {
    if (editingGame) {
      setGames((prev) => prev.map((g) => (g.id === editingGame.id ? { ...g, ...payload } : g)));
      setEditingGame(null);
      return;
    }
    const nextId = Math.max(0, ...games.map((g) => g.id)) + 1;
    setGames((prev) => [...prev, { id: nextId, ...payload }]);
  };

  const handleDelete = (id) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
    setEditingGame(null);
  };

  // Quick-log result from PostGame card or Timeline inline buttons.
  const handleLogResult = (id, result, overtime) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, result, overtime: Boolean(overtime) } : g))
    );
  };

  // ── Tab routing for the sub-pages ──
  if (vestTab === 'rankings') {
    return (
      <NetRankingsPage
        netRankings={netRankings}
        netStatus={netStatus}
        onBack={() => setVestTab('dashboard')}
      />
    );
  }

  if (vestTab === 'game-stats') {
    return (
      <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <TabBar value={vestTab} onChange={setVestTab} />
        <Suspense fallback={<LoadingPanel />}>
          <GameStatsPanel games={games} />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <TabBar value={vestTab} onChange={setVestTab} />

      <VestScoreboard
        wins={summary.wins}
        losses={summary.losses}
        streak={streak}
        secondary={scoreboardSecondary}
        filterLabel={selectedOutfit}
        onClearFilter={() => setSelectedOutfit(null)}
        identity={{ team: "Wisconsin Badgers", season: '25–26', who: "AJ's pick" }}
        status={
          scoutingReport
            ? {
                kind: 'next',
                label: `${formatLocationLabel(scoutingReport.location, 'full')} ${scoutingReport.opponent}`,
                date: scoutingReport.date ? formatDate(scoutingReport.date) : null,
              }
            : { kind: 'final' }
        }
      />

      <StorylineStrip milestones={milestones} />

      <NetDegradedBanner netStatus={netStatus} />

      {(scoutingReport || recommendation) && (
        <VestNextGame
          scoutingReport={scoutingReport}
          recommendation={recommendation}
          advisor={advisor}
          jinxAlert={jinxAlert}
          aiBlurb={aiBlurb}
          aiBlurbLoading={aiBlurbLoading}
          onGenerateBlurb={generateBlurb}
          netStatus={netStatus}
          whyText={buildWhySentence(recommendation, scoutingReport)}
        />
      )}

      {upcomingGame && (
        showPostGame ? (
          <VestPostGame
            game={upcomingGame}
            onLogResult={handleLogResult}
          />
        ) : (
          <VestLockInPick
            upcomingGame={upcomingGame}
            existingOutfits={existingOutfits}
            recommendedOutfit={recommendation?.top?.outfit}
            onUpdate={(id, patch) =>
              setGames((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
            }
          />
        )
      )}

      <VestTimeline
        games={visibleTimelineGames}
        onEditGame={setEditingGame}
        onLogResult={handleLogResult}
      />

      <VestLeaderboard
        stats={outfitStats}
        badges={outfitBadges}
        selectedOutfit={selectedOutfit}
        onSelectOutfit={setSelectedOutfit}
        netStatus={netStatus}
      />

      {netStatus === 'loaded' && (
        <NetStatusFooter netStatus={netStatus} count={netRankings.length} />
      )}

      <VestExtras
        milestones={milestones}
        outfitStats={outfitStats}
        outfitBadges={outfitBadges}
        coffeeCrossover={coffeeCrossover}
      />

      <VestGameForm
        editingGame={editingGame}
        existingOutfits={existingOutfits}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => setEditingGame(null)}
      />
    </main>
  );
}

function StorylineStrip({ milestones }) {
  // Surface the top 3 storylines as one prominent strip so the page's narrative
  // is visible above the fold instead of buried in a drawer.
  if (!milestones?.length) return null;
  const top = milestones.slice(0, 3);
  return (
    <div className="vt-card mb-6 px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
      {top.map((m, i) => (
        <div
          key={i}
          className="flex items-baseline gap-2 sm:gap-3"
          style={
            i > 0
              ? { borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: 'var(--vt-rule)', paddingLeft: '1rem' }
              : undefined
          }
        >
          <span className="text-sm shrink-0" aria-hidden>{m.icon}</span>
          <span className="vt-mono text-xs text-[color:var(--vt-ink-dim)] leading-snug">
            {m.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function NetDegradedBanner({ netStatus }) {
  if (netStatus === 'loaded') return null;

  const message =
    netStatus === 'loading'
      ? { label: 'Loading NET feed', detail: 'Quadrant breakdowns will appear once available.' }
      : { label: 'NET feed offline', detail: 'Quadrant records, advisor confidence, and strength-of-schedule are unavailable. The "Quality" component falls back to a location baseline.' };

  return (
    <div
      className="mb-6 px-4 py-3 rounded border-l-2 flex items-start gap-3"
      style={{
        background: 'rgba(197, 5, 12, 0.06)',
        borderLeftColor: 'var(--vt-red)',
        borderRight: '1px solid var(--vt-rule)',
        borderTop: '1px solid var(--vt-rule)',
        borderBottom: '1px solid var(--vt-rule)',
      }}
    >
      <span className="vt-label vt-label-red shrink-0">⚠ {message.label}</span>
      <span className="vt-mono text-[11px] text-[color:var(--vt-ink-mute)] leading-snug">
        {message.detail}
      </span>
    </div>
  );
}

function TabBar({ value, onChange }) {
  return (
    <div className="mb-5 sm:mb-6 flex border-b border-[color:var(--vt-rule)]">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`vt-tab ${value === tab.value ? 'is-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="text-center py-12">
      <span className="inline-block w-5 h-5 border-2 border-[color:var(--vt-red)] border-t-transparent rounded-full animate-spin mr-2 align-middle" />
      <span className="vt-label">Loading</span>
    </div>
  );
}

function NetStatusFooter({ netStatus, count }) {
  if (netStatus === 'loaded') {
    return (
      <p className="vt-label mb-6 -mt-1 px-1 vt-label-red">
        NET feed locked · {count} teams (target ~365)
      </p>
    );
  }
  if (netStatus === 'loading') {
    return (
      <p className="vt-label mb-6 -mt-1 px-1">
        <span className="inline-block w-3 h-3 border-2 border-[color:var(--vt-ink-mute)] border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />
        Loading NET feed
      </p>
    );
  }
  if (netStatus === 'error') {
    return (
      <p className="vt-label mb-6 -mt-1 px-1">
        NET feed offline · Quadrant stats unavailable
      </p>
    );
  }
  return null;
}
