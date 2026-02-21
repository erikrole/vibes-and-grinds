import { useMemo, useState } from 'react';
import { vestGames as seedGames } from '../utils/vestTrackerData';

const EMPTY_FORM = {
  date: '',
  location: 'vs',
  opponent: '',
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

export default function VestTrackerDashboard() {
  const [games, setGames] = useState(seedGames);
  const [selectedOutfit, setSelectedOutfit] = useState('All outfits');
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [addingOutfit, setAddingOutfit] = useState(false);

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
          };
        }

        acc[game.outfit].games += 1;
        acc[game.outfit].lastSeen = game.opponent;
        acc[game.outfit].lastSeenLocation = game.location || 'vs';
        acc[game.outfit].lastIndex = index;
        if (game.result === 'W') acc[game.outfit].wins += 1;
        if (game.result === 'L') acc[game.outfit].losses += 1;

        return acc;
      }, {});

    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        winRate: Math.round((entry.wins / entry.games) * 100),
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  }, [completedGames]);

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
        const score = entry.winRate + entry.wins * 3 + recencyBonus - samplePenalty;

        return {
          ...entry,
          score: Math.round(score),
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
      outfit: game.outfit || '',
      result: game.result || 'W',
      overtime: Boolean(game.overtime),
    });
  };

  const handleSave = (event) => {
    event.preventDefault();
    const opponent = formState.opponent.trim();
    const outfit = formState.outfit.trim();

    if (!opponent) return;

    const payload = {
      date: toIsoDate(formState.date),
      location: formState.location,
      opponent,
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-400">Vest Tracker</p>
            <h2 className="text-3xl font-black tracking-tight mt-1">{summary.wins}-{summary.losses}</h2>
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
            {recommendation.alternatives.length > 0 && (
              <p className="text-xs text-red-200/70 mt-2">
                Also consider: {recommendation.alternatives.map((entry) => entry.outfit).join(' • ')}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Outfit cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {outfitStats.map((stat) => {
          const winWidth = (stat.wins / stat.games) * 100;
          const lossWidth = (stat.losses / stat.games) * 100;

          return (
            <article key={stat.outfit} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{stat.outfit}</h3>
                <span className="text-sm font-semibold text-stone-500 dark:text-stone-300">{stat.wins}-{stat.losses}</span>
              </div>

              <div className="h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${winWidth}%` }} title={`Wins: ${stat.wins}`} />
                <div className="h-full bg-red-500" style={{ width: `${lossWidth}%` }} title={`Losses: ${stat.losses}`} />
              </div>

              <div className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                {stat.games} {stat.games === 1 ? 'game' : 'games'} • last seen {stat.lastSeenLocation} {stat.lastSeen}
              </div>
            </article>
          );
        })}
      </section>

      {/* Season timeline — newest first */}
      <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Season timeline</h3>
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

            return (
              <button
                key={`${game.id}-${index}`}
                onClick={() => startEdit(game)}
                className={`min-w-[176px] rounded-xl border px-3 py-2 text-left text-sm transition-colors ${resultClass}`}
              >
                <div className="flex items-center gap-1.5 text-xs opacity-75">
                  <span>{formatDate(game.date) || `Game ${index + 1}`}</span>
                  {game.ranking && <span className="font-bold">#{game.ranking}</span>}
                </div>
                <div className="font-semibold">{game.location || 'vs'} {game.opponent}</div>
                <div className="text-xs mt-1 opacity-80">{game.outfit || 'Outfit TBD'}</div>
                <div className="text-xs mt-1 font-semibold">
                  {resultLabel}{game.overtime ? ' (OT)' : ''}
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

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 items-end">
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
