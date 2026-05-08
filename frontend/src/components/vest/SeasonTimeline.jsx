import {
  findNetRankForOpponent,
  formatLocationLabel,
  formatVestDate,
  getQuadrant,
  toSuperscript,
} from '../../utils/vestStats';

export default function SeasonTimeline({ visibleGames, netLookup, netStatus, onEdit }) {
  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Season Timeline</h3>
        <span className="text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 font-medium">
          Tap to edit
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {visibleGames.map((game, index) => {
          const isWin = game.result === 'W';
          const isLoss = game.result === 'L';
          const resultLabel = isWin ? 'W' : isLoss ? 'L' : 'TBD';
          const gameQuadrant =
            (isWin || isLoss) && netStatus === 'loaded'
              ? getQuadrant(game.location, findNetRankForOpponent(netLookup, game.opponent))
              : null;

          return (
            <button
              key={`${game.id}-${index}`}
              onClick={() => onEdit(game)}
              className={`min-w-[160px] rounded-xl border px-3 py-2.5 text-left text-sm transition-all hover:shadow-md active:scale-[0.98] ${
                isWin
                  ? 'bg-emerald-50 border-emerald-200/80 dark:bg-emerald-900/20 dark:border-emerald-800/60'
                  : isLoss
                  ? 'bg-red-50 border-red-200/80 dark:bg-red-900/20 dark:border-red-800/60'
                  : 'bg-stone-50 border-stone-200 dark:bg-stone-700/30 dark:border-stone-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {formatVestDate(game.date) || `Game ${index + 1}`}
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isWin
                      ? 'bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300'
                      : isLoss
                      ? 'bg-red-200/60 text-red-700 dark:bg-red-800/50 dark:text-red-300'
                      : 'bg-stone-200/60 text-stone-600 dark:bg-stone-600/50 dark:text-stone-300'
                  }`}
                >
                  {resultLabel}
                  {gameQuadrant ? ` Q${gameQuadrant}` : ''}
                </span>
              </div>
              <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                {formatLocationLabel(game.location, 'full')}&nbsp;
                {game.ranking ? (
                  <>{toSuperscript(game.ranking)}&thinsp;</>
                ) : null}
                {game.opponent}
                {game.overtime && ' (OT)'}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {game.outfit || 'Outfit TBD'}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
