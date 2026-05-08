/**
 * Top "Season Record" panel: wins-losses, streak chip, optional outfit
 * filter clear button, and the Next-Fit recommendation box (with optional
 * jinx alert + AI blurb generator).
 */
export default function SeasonHeader({
  summary,
  streak,
  selectedOutfit,
  onClearOutfit,
  recommendation,
  jinxAlert,
  aiBlurb,
  aiBlurbLoading,
  onGenerateBlurb,
}) {
  return (
    <section className="bg-neutral-900 text-neutral-100 border border-red-900/40 rounded-2xl p-5 sm:p-6 shadow-sm mb-6 overflow-hidden relative">
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
            Season Record
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="text-4xl font-black tracking-tight">
              {summary.wins}-{summary.losses}
            </h2>
            {streak && streak.count >= 2 && (
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  streak.result === 'W'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {streak.result === 'W' ? '🔥 ' : ''}
                {streak.count}
                {streak.result === 'W' ? 'W' : 'L'}
              </span>
            )}
          </div>
        </div>
        {selectedOutfit !== 'All outfits' && (
          <button
            onClick={onClearOutfit}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-colors"
          >
            <span className="text-neutral-400">Filtered:</span>
            <span className="font-semibold">{selectedOutfit}</span>
            <svg
              className="w-3 h-3 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {recommendation && (
        <div className="mt-5 rounded-xl border border-red-800/50 bg-red-950/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-red-300/70 font-semibold">
                Next Fit
              </p>
              <p className="text-xl font-black mt-1">{recommendation.top.outfit}</p>
            </div>
            <div className="text-right text-sm shrink-0">
              <p className="font-bold text-red-100">
                {recommendation.top.wins}-{recommendation.top.losses}
              </p>
              <p className="text-xs text-red-200/60">{recommendation.top.games} games</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
              Q-score: {recommendation.top.quadrantScore >= 0 ? '+' : ''}
              {recommendation.top.quadrantScore}
            </span>
            <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
              Q1+Q2: {recommendation.top.highTierGames} games
            </span>
            <span className="px-2 py-1 rounded-md bg-red-900/40 text-red-200/80">
              Last:{' '}
              {recommendation.top.recencyDistance === 1
                ? '1 game ago'
                : `${recommendation.top.recencyDistance} ago`}
            </span>
          </div>
          {recommendation.alternatives.length > 0 && (
            <p className="text-xs text-red-200/60 mt-3">
              Also consider:{' '}
              {recommendation.alternatives.map((entry) => entry.outfit).join(' · ')}
            </p>
          )}
          {jinxAlert && (
            <div className="mt-3 rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              ⚠️ <span className="font-semibold">Jinx Alert:</span> {jinxAlert.outfit} has never
              been worn in a Q{jinxAlert.quadrant} game.
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={onGenerateBlurb}
              disabled={aiBlurbLoading}
              className="text-[11px] uppercase tracking-[0.08em] font-semibold text-red-200/70 hover:text-red-100 transition-colors disabled:opacity-50"
            >
              {aiBlurbLoading ? 'Generating...' : '✨ AI take'}
            </button>
            {aiBlurb && <p className="text-sm text-red-100/90 italic">{aiBlurb}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
