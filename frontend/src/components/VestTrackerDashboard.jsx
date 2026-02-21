import { useMemo, useState } from 'react';
import { vestGames } from '../utils/vestTrackerData';

export default function VestTrackerDashboard() {
  const [selectedOutfit, setSelectedOutfit] = useState('All outfits');

  const outfits = useMemo(
    () => ['All outfits', ...new Set(vestGames.map((game) => game.outfit))],
    []
  );

  const visibleGames = useMemo(() => {
    if (selectedOutfit === 'All outfits') {
      return vestGames;
    }

    return vestGames.filter((game) => game.outfit === selectedOutfit);
  }, [selectedOutfit]);

  const summary = useMemo(() => {
    const wins = visibleGames.filter((game) => game.result === 'W').length;
    const losses = visibleGames.length - wins;
    const winRate = visibleGames.length ? Math.round((wins / visibleGames.length) * 100) : 0;
    return { wins, losses, winRate };
  }, [visibleGames]);

  const outfitStats = useMemo(() => {
    const grouped = vestGames.reduce((acc, game) => {
      if (!acc[game.outfit]) {
        acc[game.outfit] = { outfit: game.outfit, wins: 0, losses: 0, games: 0, lastSeen: game.opponent };
      }

      acc[game.outfit].games += 1;
      acc[game.outfit].lastSeen = game.opponent;
      if (game.result === 'W') {
        acc[game.outfit].wins += 1;
      } else {
        acc[game.outfit].losses += 1;
      }

      return acc;
    }, {});

    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        winRate: Math.round((entry.wins / entry.games) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  }, []);

  const topOutfit = outfitStats[0];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-400">Vest Tracker</p>
            <h2 className="text-3xl font-black tracking-tight mt-1">{summary.wins}-{summary.losses}</h2>
            <p className="text-neutral-400 text-sm mt-1">Win rate: {summary.winRate}%</p>
          </div>

          <div className="min-w-[220px]">
            <label className="block text-xs uppercase tracking-[0.12em] text-neutral-400 mb-2" htmlFor="outfit-filter">
              Filter by outfit
            </label>
            <select
              id="outfit-filter"
              value={selectedOutfit}
              onChange={(event) => setSelectedOutfit(event.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {outfits.map((outfit) => (
                <option key={outfit} value={outfit}>
                  {outfit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {topOutfit && (
          <p className="text-sm text-red-200 mt-4">
            Best look right now: <span className="font-semibold">{topOutfit.outfit}</span> ({topOutfit.wins}-{topOutfit.losses})
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {outfitStats.map((stat) => (
          <article key={stat.outfit} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{stat.outfit}</h3>
              <span className="text-sm font-semibold text-stone-500 dark:text-stone-300">{stat.wins}-{stat.losses}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div className="h-full bg-red-600" style={{ width: `${stat.winRate}%` }} />
            </div>
            <div className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {stat.winRate}% win rate • {stat.games} games • last seen vs {stat.lastSeen}
            </div>
          </article>
        ))}
      </section>

      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">Season timeline</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visibleGames.map((game, index) => (
            <div
              key={`${game.opponent}-${index}`}
              className={`min-w-[140px] rounded-xl border px-3 py-2 text-sm ${
                game.result === 'W'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'
              }`}
            >
              <div className="font-semibold">{game.opponent}</div>
              <div className="text-xs mt-1 opacity-80">{game.outfit}</div>
              <div className="text-xs mt-1 font-semibold">{game.result}{game.overtime ? ' • OT' : ''}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
