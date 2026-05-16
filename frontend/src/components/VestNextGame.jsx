import { memo, useState } from 'react';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';

// Trading-card style Next Game / Top Pick card.
// Header reads as a vintage card series number, the opponent banner is
// the "subject of the card", and the recommendation block is the spec sheet
// with a hexagonal foil score badge.
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
    <section className="vt-reveal vt-reveal-1 vt-foil-border mb-6 sm:mb-7">
      <div className="vt-card relative overflow-hidden">
        {/* Card series header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-[color:var(--vt-rule)]">
          <div className="vt-mojo text-[10px] tracking-[0.3em] text-[color:var(--vt-cyan)] uppercase">
            {game ? '› Next Up · Card 01' : '› Season MVP · Foil Pull'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--vt-crimson)] shadow-[0_0_8px_var(--vt-crimson-glow)]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--vt-gold)] shadow-[0_0_8px_rgba(244,197,66,0.6)]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--vt-cyan)] shadow-[0_0_8px_var(--vt-cyan-glow)]" />
          </div>
        </div>

        {/* Opponent banner */}
        {game && (
          <div className="relative px-5 sm:px-6 pt-5 pb-5">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,23,76,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 80% at 90% 50%, rgba(0,229,255,0.12) 0%, transparent 60%)',
              }}
            />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="vt-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--vt-gold)] mb-1.5">
                  Opponent · {formatLocationLabel(game.location, 'Adjective')}
                </p>
                <h3 className="vt-anton text-3xl sm:text-5xl leading-[0.95] text-[color:var(--vt-ink)]">
                  {formatLocationLabel(game.location, 'full').toUpperCase()}{' '}
                  {game.netRank ? (
                    <span className="vt-mono text-base sm:text-lg text-[color:var(--vt-cyan)] vt-text-neon-cyan align-top">
                      #{game.netRank}
                    </span>
                  ) : null}
                  <br />
                  <span className="vt-text-foil">{game.opponent.toUpperCase()}</span>
                </h3>
                {game.date && (
                  <p className="vt-mono text-xs text-[color:var(--vt-ink-dim)] mt-2 tracking-wider">
                    {formatDate(game.date)?.toUpperCase()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-start">
                {game.netRank && (
                  <ScoutBlock label="NET" value={`#${game.netRank}`} accent="cyan" />
                )}
                {game.quadrant && (
                  <ScoutBlock
                    label="Quadrant"
                    value={`Q${game.quadrant}`}
                    accent={game.quadrant <= 2 ? 'crimson' : 'gold'}
                  />
                )}
                {game.allTimeRecord && (
                  <ScoutBlock
                    label="All-time"
                    value={`${game.allTimeRecord.wins}–${game.allTimeRecord.losses}`}
                    accent="gold"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spec sheet — recommendation */}
        {rec && (
          <div className="relative px-5 sm:px-6 pt-5 pb-5 border-t border-[color:var(--vt-rule)]">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="vt-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--vt-crimson)] mb-1.5">
                  {game ? '✦ Wear This' : '✦ Season Top Pick'}
                </p>
                <h4 className="vt-anton text-2xl sm:text-4xl vt-text-foil leading-[0.95]">
                  {rec.outfit.toUpperCase()}
                </h4>
                <p className="vt-mono text-xs text-[color:var(--vt-ink-dim)] mt-2 tracking-wider">
                  {rec.wins}–{rec.losses} · {rec.smoothedRatePct}% smoothed
                  {rec.avgNet ? ` · SoS #${rec.avgNet}` : ''}
                </p>
              </div>

              {/* Hex foil score badge */}
              <ScoreHex score={rec.score} />
            </div>

            {/* Component bars */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <ComponentMeter label="Smoothed" value={rec.scoreComponents.smoothed} weight="45%" accent="crimson" />
              <ComponentMeter label="vs Expected" value={rec.scoreComponents.woe} weight="25%" accent="cyan" />
              <ComponentMeter label="Form" value={rec.scoreComponents.form} weight="20%" accent="gold" />
              <ComponentMeter label="Recency" value={rec.scoreComponents.recency} weight="10%" accent="magenta" />
            </div>

            {/* Quadrant stripe */}
            {netStatus === 'loaded' && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((q) => (
                  <div
                    key={q}
                    className="rounded-md bg-[rgba(0,0,0,0.4)] border border-[color:var(--vt-rule)] px-2 py-1.5 text-center vt-mono"
                  >
                    <span className="text-[9px] tracking-[0.18em] text-[color:var(--vt-ink-faint)] uppercase">Q{q}</span>{' '}
                    <span className="vt-anton text-sm text-[color:var(--vt-ink)] tabular-nums">
                      {rec.quadrants[q].wins}–{rec.quadrants[q].losses}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Alternatives ticker */}
            {recommendation.alternatives?.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="vt-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--vt-cyan)]">
                  Also In Rotation
                </span>
                {recommendation.alternatives.map((alt) => (
                  <span key={alt.outfit} className="vt-pill vt-pill-cyan">
                    <span className="font-bold">{alt.outfit}</span>
                    <span className="vt-mojo text-[color:var(--vt-gold)]">{Math.round(alt.score)}</span>
                  </span>
                ))}
              </div>
            )}

            {jinxAlert && (
              <div className="mt-4 rounded-md border-l-4 border-[color:var(--vt-gold)] bg-[rgba(244,197,66,0.06)] px-3 py-2.5">
                <p className="vt-mono text-xs text-[color:var(--vt-gold)] tracking-wider">
                  <span className="vt-anton text-sm mr-2">▲ UNTESTED</span>
                  {jinxAlert.outfit} has never been worn in a Q{jinxAlert.quadrant} game.
                </p>
              </div>
            )}

            {/* AI blurb row */}
            <div className="mt-4 flex items-start gap-3 flex-wrap">
              <button
                onClick={onGenerateBlurb}
                disabled={aiBlurbLoading}
                className="vt-pill vt-pill-crimson hover:scale-[1.03] active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <span className="vt-anton text-sm">{aiBlurbLoading ? '◌ Thinking' : '✦ AI Take'}</span>
              </button>
              {aiBlurb && (
                <p className="vt-mono text-sm text-[color:var(--vt-ink-dim)] italic flex-1 min-w-0">
                  &ldquo;{aiBlurb}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* Advisor accordion */}
        {advisor?.length > 0 && game?.quadrant && (
          <div className="border-t border-[color:var(--vt-rule)]">
            <button
              onClick={() => setExpandAdvisor((v) => !v)}
              className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between text-left vt-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--vt-cyan)] hover:bg-white/[0.02] transition-colors"
            >
              <span>
                <span className="text-[color:var(--vt-gold)] mr-2">▾</span>
                Full Advisor · Q{game.quadrant} {formatLocationLabel(game.location, 'adjective')}
              </span>
              <span
                className={`vt-anton text-base text-[color:var(--vt-ink-faint)] transition-transform ${
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

        {/* Card foil edge */}
        <div className="vt-stripe h-1 w-full opacity-80" aria-hidden />
      </div>
    </section>
  );
}

const ACCENT_BAR = {
  crimson: 'bg-[color:var(--vt-crimson)]',
  cyan: 'bg-[color:var(--vt-cyan)]',
  gold: 'bg-[color:var(--vt-gold)]',
  magenta: 'bg-[color:var(--vt-magenta)]',
};
const ACCENT_GLOW = {
  crimson: 'shadow-[0_0_8px_var(--vt-crimson-glow)]',
  cyan: 'shadow-[0_0_8px_var(--vt-cyan-glow)]',
  gold: 'shadow-[0_0_8px_rgba(244,197,66,0.6)]',
  magenta: 'shadow-[0_0_8px_rgba(255,45,123,0.55)]',
};
const ACCENT_TEXT = {
  crimson: 'text-[color:var(--vt-crimson)]',
  cyan: 'text-[color:var(--vt-cyan)]',
  gold: 'text-[color:var(--vt-gold)]',
  magenta: 'text-[color:var(--vt-magenta)]',
};

function ScoutBlock({ label, value, accent = 'gold' }) {
  return (
    <div className="rounded-md bg-[rgba(0,0,0,0.4)] border border-[color:var(--vt-rule)] px-3 py-2 min-w-[78px]">
      <div className={`vt-mono text-[9px] uppercase tracking-[0.24em] ${ACCENT_TEXT[accent]} opacity-80`}>
        {label}
      </div>
      <div className={`vt-anton text-lg sm:text-xl tabular-nums leading-tight ${ACCENT_TEXT[accent]}`}>
        {value}
      </div>
    </div>
  );
}

function ScoreHex({ score }) {
  const rounded = Math.round(score);
  return (
    <div className="relative shrink-0">
      <div
        className="vt-hex w-28 h-28 sm:w-32 sm:h-32 p-[2px]"
        style={{ background: 'var(--vt-foil)' }}
      >
        <div className="vt-hex w-full h-full bg-[#0a0418] flex flex-col items-center justify-center">
          <span className="vt-mono text-[9px] uppercase tracking-[0.24em] text-[color:var(--vt-gold)] mb-0.5">
            Score
          </span>
          <span className="vt-monoton vt-text-foil text-4xl sm:text-5xl leading-none tabular-nums">
            {rounded}
          </span>
          <span className="vt-mono text-[8px] uppercase tracking-[0.22em] text-[color:var(--vt-ink-faint)] mt-1">
            /100
          </span>
        </div>
      </div>
    </div>
  );
}

function ComponentMeter({ label, value, weight, accent }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-md bg-[rgba(0,0,0,0.3)] border border-[color:var(--vt-rule)] px-3 py-2">
      <div className="flex items-baseline justify-between gap-1">
        <span className={`vt-mono text-[9px] uppercase tracking-[0.18em] ${ACCENT_TEXT[accent]} opacity-90`}>
          {label}
        </span>
        <span className="vt-mojo text-[9px] text-[color:var(--vt-ink-faint)] tabular-nums">{weight}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div
            className={`h-full ${ACCENT_BAR[accent]} ${ACCENT_GLOW[accent]} transition-all`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className="vt-anton text-base text-[color:var(--vt-ink)] tabular-nums w-7 text-right">
          {Math.round(clamped)}
        </span>
      </div>
    </div>
  );
}

const CONFIDENCE_STYLE = {
  high: { bar: 'var(--vt-cyan)', glow: 'rgba(0,229,255,0.55)', text: 'text-[color:var(--vt-cyan)]' },
  medium: { bar: 'var(--vt-gold)', glow: 'rgba(244,197,66,0.55)', text: 'text-[color:var(--vt-gold)]' },
  low: { bar: 'var(--vt-crimson)', glow: 'rgba(255,23,76,0.55)', text: 'text-[color:var(--vt-crimson)]' },
  untested: { bar: 'rgba(255,255,255,0.18)', glow: 'transparent', text: 'text-[color:var(--vt-ink-faint)]' },
  unknown: { bar: 'rgba(255,255,255,0.18)', glow: 'transparent', text: 'text-[color:var(--vt-ink-faint)]' },
};
const CONFIDENCE_LABEL = { high: 'HIGH', medium: 'MED', low: 'LOW', untested: 'NEW', unknown: '—' };

function AdvisorRow({ entry, location, quadrant }) {
  const style = CONFIDENCE_STYLE[entry.confidence];
  return (
    <div
      className="rounded-md bg-[rgba(0,0,0,0.4)] border border-[color:var(--vt-rule)] px-3 py-2"
      style={{ boxShadow: `inset 4px 0 0 ${style.bar}, 0 0 12px -4px ${style.glow}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="vt-anton text-sm text-[color:var(--vt-ink)] truncate">{entry.outfit}</span>
        <span className={`vt-mono text-[9px] tracking-[0.18em] font-bold ${style.text}`}>
          {CONFIDENCE_LABEL[entry.confidence]}
        </span>
      </div>
      <div className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)] mt-0.5 tabular-nums tracking-wider">
        Q{quadrant} {entry.qRecord}
        {entry.locRecord && ` · ${location} ${entry.locRecord}`}
        {entry.form === 'hot' ? ' · ◉' : entry.form === 'cold' ? ' · ❄' : ''}
      </div>
    </div>
  );
}

export default memo(VestNextGame);
