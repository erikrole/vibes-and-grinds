import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import NetRankingsPage from './NetRankingsPage';
import VestTabBar from './vest/VestTabBar';
import SeasonHeader from './vest/SeasonHeader';
import ScoutingReport from './vest/ScoutingReport';
import SeasonTimeline from './vest/SeasonTimeline';
import OutfitCards from './vest/OutfitCards';
import MilestonesPanel from './vest/MilestonesPanel';
import HeadToHeadCompare from './vest/HeadToHeadCompare';
import CoffeeCrossover from './vest/CoffeeCrossover';
import GameForm from './vest/GameForm';
import useVestGames from '../hooks/useVestGames';
import useNetRankings from '../hooks/useNetRankings';
import useCoffeeVisits from '../hooks/useCoffeeVisits';
import { fetchVestBlurb } from '../utils/api';
import {
  buildNetLookup,
  countTrailingStreak,
  formatLocationLabel,
} from '../utils/vestStats';
import {
  computeCoffeeCrossover,
  computeJinxAlert,
  computeMilestones,
  computeOutfitBadges,
  computeOutfitStats,
  computeRecommendation,
  computeScoutingReport,
  computeVestAdvisor,
  getCompletedGames,
  getExistingOutfits,
  getOutfits,
  getSummary,
  getVisibleGames,
  sortGames,
} from '../utils/vestComputations';

const GameStatsPanel = lazy(() => import('./GameStatsPanel'));

const GAME_STATS_FALLBACK = (
  <div className="text-center py-12">
    <span className="inline-block w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
    <span className="text-sm text-stone-500">Loading...</span>
  </div>
);

export default function VestTrackerDashboard({ showToast }) {
  const [games, setGames, { corruptedOnLoad }] = useVestGames();
  const { rankings: netRankings, status: netStatus } = useNetRankings();
  const coffeeVisits = useCoffeeVisits();

  const [selectedOutfit, setSelectedOutfit] = useState('All outfits');
  const [editingId, setEditingId] = useState(null);
  const [vestTab, setVestTab] = useState('dashboard');
  const [aiBlurb, setAiBlurb] = useState('');
  const [aiBlurbLoading, setAiBlurbLoading] = useState(false);

  // Warn the user if localStorage was unparseable on load.
  useEffect(() => {
    if (corruptedOnLoad && showToast) {
      showToast('Local data was corrupted. Loaded default data.', 'error');
    }
  }, [corruptedOnLoad, showToast]);

  // ── Derivations ──────────────────────────────────────────────────────────

  const sortedGames = useMemo(() => sortGames(games), [games]);
  const completedGames = useMemo(() => getCompletedGames(sortedGames), [sortedGames]);
  const outfits = useMemo(() => getOutfits(completedGames), [completedGames]);
  const existingOutfits = useMemo(() => getExistingOutfits(games), [games]);
  const visibleGames = useMemo(
    () => getVisibleGames(sortedGames, selectedOutfit),
    [sortedGames, selectedOutfit]
  );
  const summary = useMemo(
    () => getSummary(completedGames, selectedOutfit),
    [completedGames, selectedOutfit]
  );
  const streak = useMemo(
    () => countTrailingStreak(completedGames.map((g) => g.result)),
    [completedGames]
  );
  const netLookup = useMemo(() => buildNetLookup(netRankings), [netRankings]);
  const outfitStats = useMemo(
    () => computeOutfitStats(completedGames, netLookup),
    [completedGames, netLookup]
  );
  const recommendation = useMemo(
    () => computeRecommendation(completedGames, outfitStats),
    [completedGames, outfitStats]
  );
  const outfitBadges = useMemo(() => computeOutfitBadges(outfitStats), [outfitStats]);
  const jinxAlert = useMemo(
    () => computeJinxAlert(recommendation, sortedGames, netLookup, outfitStats),
    [recommendation, sortedGames, netLookup, outfitStats]
  );
  const milestones = useMemo(
    () => computeMilestones(completedGames, netLookup),
    [completedGames, netLookup]
  );
  const coffeeCrossover = useMemo(
    () => computeCoffeeCrossover(coffeeVisits, completedGames),
    [coffeeVisits, completedGames]
  );
  const scoutingReport = useMemo(
    () => computeScoutingReport(sortedGames, completedGames, netLookup, netStatus),
    [sortedGames, completedGames, netLookup, netStatus]
  );
  const vestAdvisor = useMemo(
    () => computeVestAdvisor(scoutingReport, outfitStats, completedGames),
    [scoutingReport, outfitStats, completedGames]
  );

  // Reset filter if the selected outfit disappears (after editing/deleting).
  useEffect(() => {
    if (selectedOutfit !== 'All outfits' && !outfits.includes(selectedOutfit)) {
      setSelectedOutfit('All outfits');
    }
  }, [outfits, selectedOutfit]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const editingGame = editingId ? games.find((g) => g.id === editingId) : null;

  const handleSaveGame = (payload) => {
    if (editingId) {
      setGames((prev) => prev.map((g) => (g.id === editingId ? { ...g, ...payload } : g)));
      setEditingId(null);
      return;
    }
    const nextId = Math.max(0, ...games.map((g) => g.id)) + 1;
    setGames((prev) => [...prev, { id: nextId, ...payload }]);
  };

  const handleGenerateBlurb = async () => {
    if (!recommendation || aiBlurbLoading) return;
    setAiBlurbLoading(true);
    setAiBlurb('');
    try {
      const top = recommendation.top;
      const parts = [
        `Recommended outfit: ${top.outfit} (${top.wins}-${top.losses}, ${top.winRate}% win rate)`,
        `Last worn ${top.recencyDistance} games ago, form: ${top.form || 'neutral'}`,
        `Q1 record: ${top.quadrants[1].wins}-${top.quadrants[1].losses}, Q2: ${top.quadrants[2].wins}-${top.quadrants[2].losses}`,
      ];
      if (top.avgNet) parts.push(`Avg opponent NET: #${top.avgNet}`);
      if (scoutingReport) {
        parts.push(
          `Next game: ${formatLocationLabel(scoutingReport.location, 'full')} ${scoutingReport.opponent}${scoutingReport.netRank ? ` (NET #${scoutingReport.netRank})` : ''}${scoutingReport.quadrant ? `, Q${scoutingReport.quadrant} game` : ''}`
        );
      }
      if (outfitBadges[top.outfit]?.length) {
        parts.push(`Badges: ${outfitBadges[top.outfit].join(', ')}`);
      }
      const trailing = countTrailingStreak(top.recentResults);
      if (trailing && trailing.count >= 2) {
        parts.push(`Current streak: ${trailing.count}${trailing.result}`);
      }

      const { blurb } = await fetchVestBlurb(parts.join('. '));
      setAiBlurb(blurb);
    } catch {
      setAiBlurb('');
    } finally {
      setAiBlurbLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
        <VestTabBar value={vestTab} onChange={setVestTab} />
        <Suspense fallback={GAME_STATS_FALLBACK}>
          <GameStatsPanel games={games} />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <VestTabBar value={vestTab} onChange={setVestTab} />

      <SeasonHeader
        summary={summary}
        streak={streak}
        selectedOutfit={selectedOutfit}
        onClearOutfit={() => setSelectedOutfit('All outfits')}
        recommendation={recommendation}
        jinxAlert={jinxAlert}
        aiBlurb={aiBlurb}
        aiBlurbLoading={aiBlurbLoading}
        onGenerateBlurb={handleGenerateBlurb}
      />

      <ScoutingReport report={scoutingReport} vestAdvisor={vestAdvisor} />

      <SeasonTimeline
        visibleGames={visibleGames}
        netLookup={netLookup}
        netStatus={netStatus}
        onEdit={(game) => setEditingId(game.id)}
      />

      <OutfitCards
        outfitStats={outfitStats}
        outfitBadges={outfitBadges}
        selectedOutfit={selectedOutfit}
        onSelectOutfit={setSelectedOutfit}
        netStatus={netStatus}
        netRankingsCount={netRankings.length}
      />

      <MilestonesPanel milestones={milestones} />

      <HeadToHeadCompare outfitStats={outfitStats} outfitBadges={outfitBadges} />

      <CoffeeCrossover rows={coffeeCrossover} />

      <GameForm
        key={editingId ?? 'new'}
        editingGame={editingGame}
        existingOutfits={existingOutfits}
        onSubmit={handleSaveGame}
        onCancel={() => setEditingId(null)}
      />
    </main>
  );
}
