import { memo, useState } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Merged Next Game card — scouting + recommendation in one editorial unit.
// Top: opponent banner with date, location, NET, quadrant, all-time record.
// Middle: recommended outfit with score breakdown.
// Bottom: ranked alternatives + jinx alert + AI take.
function VestNextGame({
  scoutingReport,
  recommendation,
  advisor,
  jinxAlert,
  aiBlurb,
  aiBlurbLoading,
  onGenerateBlurb,
  netStatus,
}) {
  const [expandAdvisor, setExpandAdvisor] = useState(false);

  if (!scoutingReport && !recommendation) return null;

  const game = scoutingReport;
  const rec = recommendation?.top;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* Opponent banner */}
      {game && (
        <div className="bg-gradient-to-r from-stone-50 to-white dark:from-stone-800/60 dark:to-stone-800 border-b border-stone-100 dark:border-stone-700 px-5 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500 font-semibold">
                Next Game
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-50 mt-0.5">
                {formatLocationLabel(game.location, 'full')}{' '}
                {game.netRank ? <span className="text-stone-400 dark:text-stone-500 text-xl">{toSuperscript(game.netRank)}</span> : null}
                {game.opponent}
              </h3>
              {game.date && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {formatDate(game.date)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {game.netRank && (
                <ScoutPill label="NET" value={`#${game.netRank}`} />
              )}
              {game.quadrant && (
                <ScoutPill
                  label="Quadrant"
                  value={`Q${game.quadrant}`}
                  tone={game.quadrant <= 2 ? 'hot' : 'cool'}
                />
              )}
              {game.allTimeRecord && (
                <ScoutPill
                  label="All-time"
                  value={`${game.allTimeRecord.wins}–${game.allTimeRecord.losses}`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {rec && (
        <div className="px-5 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-red-600 dark:text-red-400 font-semibold">
                {game ? 'Wear This' : 'Season Top Pick'}
              </p>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-50 mt-0.5">
                {rec.outfit}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {rec.wins}–{rec.losses} · {rec.smoothedRatePct}% smoothed
                {rec.avgNet ? ` · SoS #${rec.avgNet}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500 font-semibold">
                Score
              </div>
              <div className="text-2xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                {Math.round(rec.score)}
              </div>
            </div>
          </div>

          {/* Score component breakdown */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <ComponentBar label="Smoothed" value={rec.scoreComponents.smoothed} weight="45%" />
            <ComponentBar label="vs Expected" value={rec.scoreComponents.woe} weight="25%" />
            <ComponentBar label="Form" value={rec.scoreComponents.form} weight="20%" />
            <ComponentBar label="Recency" value={rec.scoreComponents.recency} weight="10%" />
          </div>

          {/* Quadrant breakdown for recommended outfit */}
          {netStatus === 'loaded' && (
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
              {[1, 2, 3, 4].map((q) => (
                <div
                  key={q}
                  className="rounded-lg bg-stone-50 dark:bg-stone-700/40 px-2 py-1.5 text-center tabular-nums"
                >
                  <span className="text-stone-400 dark:text-stone-500">Q{q}</span>{' '}
                  {rec.quadrants[q].wins}–{rec.quadrants[q].losses}
                </div>
              ))}
            </div>
          )}

          {/* Alternatives */}
          {recommendation.alternatives?.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-400 dark:text-stone-500 uppercase tracking-[0.1em] font-semibold">
                Also good
              </span>
              {recommendation.alternatives.map((alt) => (
                <span
                  key={alt.outfit}
                  className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700/50 text-stone-700 dark:text-stone-200 font-medium"
                >
                  {alt.outfit}
                  <span className="ml-1 text-stone-400 dark:text-stone-500 tabular-nums">
                    {Math.round(alt.score)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {jinxAlert && (
            <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              <span className="font-bold">⚠ Untested:</span>{' '}
              <span className="font-semibold">{jinxAlert.outfit}</span> has never been worn in a Q{jinxAlert.quadrant} game.
            </div>
          )}

          {/* AI Take */}
          <div className="mt-4 flex items-start gap-3 flex-wrap">
            <button
              onClick={onGenerateBlurb}
              disabled={aiBlurbLoading}
              className="text-[10px] uppercase tracking-[0.14em] font-bold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiBlurbLoading ? '✨ Thinking…' : '✨ AI take'}
            </button>
            {aiBlurb && (
              <p className="text-sm text-stone-700 dark:text-stone-200 italic flex-1 min-w-0">
                {aiBlurb}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vest Advisor (collapsible) */}
      {advisor?.length > 0 && game?.quadrant && (
        <div className="border-t border-stone-100 dark:border-stone-700">
          <button
            onClick={() => setExpandAdvisor((v) => !v)}
            className="w-full px-5 sm:px-6 py-3 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors"
          >
            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-stone-500 dark:text-stone-400">
              Full Advisor · all outfits in Q{game.quadrant} {formatLocationLabel(game.location, 'adjective')}
            </span>
            <svg
              className={`w-4 h-4 text-stone-400 transition-transform ${expandAdvisor ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandAdvisor && (
            <div className="px-5 sm:px-6 pb-5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {advisor.map((a) => (
                  <AdvisorRow key={a.outfit} entry={a} location={game.location} quadrant={game.quadrant} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ScoutPill({ label, value, tone }) {
  const toneClass =
    tone === 'hot'
      ? 'text-red-700 dark:text-red-400'
      : tone === 'cool'
      ? 'text-sky-700 dark:text-sky-400'
      : 'text-stone-900 dark:text-stone-100';
  return (
    <div className="rounded-lg bg-white dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600 px-3 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500 font-semibold">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function ComponentBar({ label, value, weight }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-lg bg-stone-50 dark:bg-stone-700/40 px-2.5 py-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[9px] uppercase tracking-[0.1em] text-stone-500 dark:text-stone-400 font-semibold">
          {label}
        </span>
        <span className="text-[9px] text-stone-400 dark:text-stone-500 tabular-nums">{weight}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <div className="flex-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-600 overflow-hidden">
          <div
            className="h-full bg-red-500 dark:bg-red-400 transition-all"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums text-stone-700 dark:text-stone-200 w-6 text-right">
          {Math.round(clamped)}
        </span>
      </div>
    </div>
  );
}

const CONFIDENCE_STYLE = {
  high: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20',
  medium: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20',
  low: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
  untested: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
  unknown: 'border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-700/30',
};
const CONFIDENCE_LABEL = { high: 'HIGH', medium: 'MED', low: 'LOW', untested: 'UNTESTED', unknown: '—' };
const CONFIDENCE_TEXT = {
  high: 'text-emerald-700 dark:text-emerald-400',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-red-700 dark:text-red-400',
  untested: 'text-stone-500 dark:text-stone-400',
  unknown: 'text-stone-500 dark:text-stone-400',
};

function AdvisorRow({ entry, location, quadrant }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${CONFIDENCE_STYLE[entry.confidence]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-stone-800 dark:text-stone-100 truncate">{entry.outfit}</span>
        <span className={`text-[10px] font-bold tabular-nums ${CONFIDENCE_TEXT[entry.confidence]}`}>
          {CONFIDENCE_LABEL[entry.confidence]}
        </span>
      </div>
      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
        Q{quadrant}: {entry.qRecord}
        {entry.locRecord && ` · ${formatLocationLabel(location, 'Adjective')}: ${entry.locRecord}`}
        {entry.form === 'hot' ? ' · 🔥' : entry.form === 'cold' ? ' · ❄️' : ''}
      </div>
    </div>
  );
}

export default memo(VestNextGame);
