import { memo, useState } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Broadcast-style next-game card. Section header → opponent row → spec sheet.
// One accent (Wisconsin red), heavy condensed type, thin rules.
function VestNextGame({
  scoutingReport,
  recommendation,
  advisor,
  jinxAlert,
  aiBlurb,
  aiBlurbLoading,
  onGenerateBlurb,
  netStatus,
  whyText,
}) {
  const [expandAdvisor, setExpandAdvisor] = useState(false);

  if (!scoutingReport && !recommendation) return null;

  const game = scoutingReport;
  const rec = recommendation?.top;

  return (
    <section className="vt-card vt-rail-top mb-6 overflow-hidden">
      {/* Caption row */}
      <div className="vt-section-head">
        <span className="vt-label vt-label-red">
          {game ? 'Next Game' : 'Season Top Pick'}
        </span>
        {game?.date && (
          <span className="vt-label">{formatDate(game.date)}</span>
        )}
      </div>

      {/* Opponent line */}
      {game && (
        <div className="px-5 sm:px-6 py-5 border-b border-[color:var(--vt-rule)]">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="vt-label mb-1.5">
                {formatLocationLabel(game.location, 'Adjective')}
              </div>
              <h3 className="vt-display-tight text-4xl sm:text-6xl text-[color:var(--vt-ink)]">
                {game.opponent.toUpperCase()}
                {game.netRank ? (
                  <span className="vt-display text-2xl sm:text-3xl text-[color:var(--vt-red)] ml-3 align-baseline">
                    #{game.netRank}
                  </span>
                ) : null}
              </h3>
            </div>

            <div className="flex gap-2 flex-wrap">
              {game.netRank && <StatBlock label="NET" value={`#${game.netRank}`} />}
              {game.quadrant && (
                <StatBlock
                  label="Quadrant"
                  value={`Q${game.quadrant}`}
                  emphasize={game.quadrant <= 2}
                />
              )}
              {game.allTimeRecord && (
                <StatBlock
                  label="All-time"
                  value={`${game.allTimeRecord.wins}–${game.allTimeRecord.losses}`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendation spec sheet */}
      {rec && (
        <div className="px-5 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              {game && (
                <div className="vt-label vt-label-red mb-1.5">Wear This</div>
              )}
              <h4 className="vt-display-tight text-3xl sm:text-5xl text-[color:var(--vt-ink)]">
                {rec.outfit.toUpperCase()}
              </h4>
              <div className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mt-2 vt-tabular">
                {rec.wins}–{rec.losses} · {rec.smoothedRatePct}% smoothed
                {rec.avgNet ? ` · SoS #${rec.avgNet}` : ''}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="vt-label mb-0.5">Score</div>
              <div className="vt-display-tight text-6xl sm:text-7xl text-[color:var(--vt-ink)] vt-tabular leading-none">
                {Math.round(rec.score)}
                <span className="vt-display text-2xl text-[color:var(--vt-ink-faint)]">/100</span>
              </div>
              {Number.isFinite(rec.scoreAvg) && (
                <div className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] mt-1 vt-tabular">
                  vs avg{' '}
                  <span
                    style={{
                      color:
                        rec.score - rec.scoreAvg >= 0
                          ? 'var(--vt-red)'
                          : 'var(--vt-ink-mute)',
                    }}
                  >
                    {rec.score - rec.scoreAvg >= 0 ? '+' : ''}
                    {Math.round(rec.score - rec.scoreAvg)}
                  </span>{' '}
                  · top of {rec.scoreField}
                </div>
              )}
            </div>
          </div>

          {/* Score components — plain English labels with hover tooltips */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScoreMeter
              label="Win rate"
              value={rec.scoreComponents.smoothed}
              weight={45}
              tip="Win % adjusted for sample size. Reads lower than raw rate when only a few games — protects against small-sample noise."
            />
            <ScoreMeter
              label="Quality"
              value={rec.scoreComponents.woe}
              weight={25}
              tip="Wins above what an average fit would get against the same opponents. Beating tough teams scores higher than beating cupcakes."
            />
            <ScoreMeter
              label="Form"
              value={rec.scoreComponents.form}
              weight={20}
              tip="Recent results weighted heavier than old ones. A late-season cold streak drags this down."
            />
            <ScoreMeter
              label="Freshness"
              value={rec.scoreComponents.recency}
              weight={10}
              tip="How long since you wore it. Rotation bonus — encourages giving other fits a chance."
            />
          </div>

          {/* Quadrant table */}
          {netStatus === 'loaded' && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((q) => (
                <div key={q} className="vt-card-inset px-2.5 py-2 text-center">
                  <span className="vt-label text-[10px] block">Q{q}</span>
                  <span className="vt-display text-lg text-[color:var(--vt-ink)] vt-tabular block mt-0.5">
                    {rec.quadrants[q].wins}–{rec.quadrants[q].losses}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Why this pick — heuristic narrative pulled from score components */}
          {whyText && (
            <p className="mt-4 vt-mono text-sm text-[color:var(--vt-ink-dim)] leading-snug">
              <span className="vt-label vt-label-red mr-2">Why</span>
              {whyText}
            </p>
          )}

          {/* Alternatives */}
          {recommendation.alternatives?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[color:var(--vt-rule)] flex items-baseline gap-3 flex-wrap">
              <span className="vt-label">Also In Rotation</span>
              {recommendation.alternatives.map((alt, idx) => (
                <span key={alt.outfit} className="vt-condensed text-sm text-[color:var(--vt-ink-dim)]">
                  {idx > 0 && <span className="text-[color:var(--vt-ink-faint)] mx-2">·</span>}
                  {alt.outfit.toUpperCase()}{' '}
                  <span className="vt-mono text-xs text-[color:var(--vt-red)] vt-tabular">
                    {Math.round(alt.score)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {jinxAlert && (
            <div className="mt-4 border-l-2 border-[color:var(--vt-red)] pl-3 py-1">
              <span className="vt-label vt-label-red">Untested</span>
              <p className="vt-mono text-xs text-[color:var(--vt-ink-dim)] mt-0.5">
                {jinxAlert.outfit} has never been worn in a Q{jinxAlert.quadrant} game.
              </p>
            </div>
          )}

          {/* AI take — promoted treatment: outline pill on first call, then
              the generated blurb anchors to a red left rail with a regenerate
              button inline. */}
          {aiBlurb ? (
            <div className="mt-4 border-l-2 border-[color:var(--vt-red)] pl-4 py-1">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="vt-label vt-label-red">AI Take</span>
                <button
                  onClick={onGenerateBlurb}
                  disabled={aiBlurbLoading}
                  className="vt-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--vt-ink-mute)] hover:text-[color:var(--vt-ink)] transition-colors disabled:opacity-50"
                >
                  {aiBlurbLoading ? 'Regenerating…' : '↻ Regenerate'}
                </button>
              </div>
              <p className="font-[Fraunces,Georgia,serif] text-base text-[color:var(--vt-ink-dim)] leading-snug italic">
                &ldquo;{aiBlurb}&rdquo;
              </p>
            </div>
          ) : (
            <button
              onClick={onGenerateBlurb}
              disabled={aiBlurbLoading}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded vt-condensed text-xs tracking-[0.18em] uppercase border transition-colors disabled:opacity-50"
              style={{
                color: 'var(--vt-red)',
                borderColor: 'var(--vt-red)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vt-red-soft)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span aria-hidden>›</span>
              {aiBlurbLoading ? 'Generating Take…' : 'Generate AI Take'}
            </button>
          )}
        </div>
      )}

      {/* Advisor accordion */}
      {advisor?.length > 0 && game?.quadrant && (
        <div className="border-t border-[color:var(--vt-rule)]">
          <button
            onClick={() => setExpandAdvisor((v) => !v)}
            className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <span className="vt-label">
              Full Advisor · Q{game.quadrant} {formatLocationLabel(game.location, 'adjective')}
            </span>
            <span
              className={`vt-condensed text-sm text-[color:var(--vt-ink-mute)] transition-transform ${
                expandAdvisor ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </button>
          {expandAdvisor && (
            <div className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {advisor.map((a) => (
                <AdvisorRow key={a.outfit} entry={a} location={game.location} quadrant={game.quadrant} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatBlock({ label, value, emphasize }) {
  return (
    <div
      className="vt-stat"
      style={emphasize ? { borderColor: 'var(--vt-red)' } : undefined}
    >
      <span className="vt-stat-label">{label}</span>
      <span
        className="vt-stat-value"
        style={emphasize ? { color: 'var(--vt-red)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function ScoreMeter({ label, value, weight, tip }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="group">
      <div className="flex items-baseline justify-between gap-1 mb-1.5">
        <span className="vt-label text-[10px] flex items-center gap-1" title={tip}>
          {label}
          {tip && (
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-3 h-3 rounded-full border text-[8px] leading-none text-[color:var(--vt-ink-faint)] border-[color:var(--vt-rule-strong)] cursor-help"
            >
              i
            </span>
          )}
        </span>
        <span className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)] vt-tabular">
          {weight}%
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="vt-bar-track flex-1">
          <div className="vt-bar-fill-red" style={{ width: `${clamped}%` }} />
        </div>
        <span className="vt-display text-base text-[color:var(--vt-ink)] vt-tabular w-7 text-right">
          {Math.round(clamped)}
        </span>
      </div>
    </div>
  );
}

const CONFIDENCE_TEXT = {
  high: 'text-[color:var(--vt-red)]',
  medium: 'text-[color:var(--vt-ink-dim)]',
  low: 'text-[color:var(--vt-ink-mute)]',
  untested: 'text-[color:var(--vt-ink-faint)]',
  unknown: 'text-[color:var(--vt-ink-faint)]',
};
const CONFIDENCE_LABEL = { high: 'HIGH', medium: 'MED', low: 'LOW', untested: 'NEW', unknown: '—' };

function AdvisorRow({ entry, location, quadrant }) {
  return (
    <div className="vt-card-inset px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="vt-condensed text-sm text-[color:var(--vt-ink)] truncate uppercase">
          {entry.outfit}
        </span>
        <span className={`vt-label ${CONFIDENCE_TEXT[entry.confidence]}`}>
          {CONFIDENCE_LABEL[entry.confidence]}
        </span>
      </div>
      <div className="vt-mono text-[11px] text-[color:var(--vt-ink-mute)] mt-1 vt-tabular">
        Q{quadrant} {entry.qRecord}
        {entry.locRecord && ` · ${location} ${entry.locRecord}`}
      </div>
    </div>
  );
}

export default memo(VestNextGame);
