import { memo } from 'react';

// 70s retro-futurist scoreboard hero — Monoton chrome numerals on cosmic
// gradient, foil-border card, secondary stat pills as racing-stripe chips.
function VestScoreboard({ wins, losses, streak, secondary, filterLabel, onClearFilter }) {
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <section className="vt-reveal vt-foil-border mb-6 sm:mb-7">
      <div className="vt-card relative overflow-hidden">
        {/* Top racing-stripe ribbon */}
        <div className="vt-stripe h-1.5 w-full opacity-90" aria-hidden />

        {/* Halftone dot field as decorative corner */}
        <div
          aria-hidden
          className="vt-halftone pointer-events-none absolute -right-12 -top-12 h-56 w-56 opacity-20 rotate-12"
        />

        {/* Sunburst accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[160%]"
          style={{
            background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(255,45,123,0.35) 0%, rgba(255,45,123,0) 70%)',
          }}
        />

        <div className="relative px-5 sm:px-8 pt-5 sm:pt-6 pb-6">
          {/* Series label — top tag bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4 sm:mb-5">
            <div className="flex items-center gap-2 vt-mono text-[10px] tracking-[0.24em] text-[color:var(--vt-ink-dim)] uppercase">
              <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--vt-crimson)] shadow-[0_0_10px_var(--vt-crimson-glow)]" />
              <span>Series · 2025–26</span>
              <span className="text-[color:var(--vt-ink-faint)]">·</span>
              <span className="vt-mojo text-[color:var(--vt-cyan)]">{filterLabel ? '01 of 01' : `01 of ${total || '—'}`}</span>
            </div>
            {filterLabel ? (
              <button
                onClick={onClearFilter}
                className="vt-pill vt-pill-crimson hover:bg-[rgba(255,23,76,0.2)] transition-colors group"
              >
                <span className="text-[9px] tracking-[0.18em] opacity-80">Filter</span>
                <span className="font-bold not-italic">{filterLabel}</span>
                <svg className="w-3 h-3 opacity-80 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span className="vt-pill vt-pill-gold">
                <span className="text-[9px] tracking-[0.18em] opacity-80">Season</span>
                <span className="vt-mojo">Record</span>
              </span>
            )}
          </div>

          {/* Hero scoreboard */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="vt-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--vt-cyan)] mb-1.5">
                {filterLabel ? `${filterLabel} · Record` : 'Season Record'}
              </p>
              <h2 className="vt-monoton vt-numeral-emboss vt-pulse text-[64px] sm:text-[96px] lg:text-[120px] leading-[0.85] vt-text-foil tabular-nums">
                {wins}<span className="text-[color:var(--vt-crimson)] vt-text-neon-crimson mx-1">·</span>{losses}
              </h2>
              {winPct != null && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="vt-anton text-2xl sm:text-3xl vt-text-chrome tabular-nums">{winPct}%</span>
                  <span className="vt-mono text-[10px] tracking-[0.2em] text-[color:var(--vt-ink-faint)] uppercase">
                    Win Pct
                  </span>
                </div>
              )}
            </div>

            {streak && streak.count >= 2 && (
              <StreakBadge streak={streak} />
            )}
          </div>

          {/* Secondary stat strip */}
          {secondary?.length > 0 && (
            <div className="mt-6 flex gap-2 flex-wrap items-stretch">
              {secondary.map((pill) => (
                <StatPill key={pill.label} label={pill.label} value={pill.value} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom racing stripe */}
        <div className="vt-stripe h-1 w-full opacity-70" aria-hidden />
      </div>
    </section>
  );
}

function StreakBadge({ streak }) {
  const isWin = streak.result === 'W';
  return (
    <div
      className={`vt-hex relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${
        isWin
          ? 'bg-[color:var(--vt-crimson)] text-white'
          : 'bg-[#2a3550] text-[#a6c4ff]'
      }`}
      style={{
        boxShadow: isWin
          ? '0 0 28px var(--vt-crimson-glow), 0 0 0 2px rgba(255,255,255,0.15) inset'
          : '0 0 24px rgba(38, 80, 156, 0.5), 0 0 0 2px rgba(255,255,255,0.10) inset',
      }}
      title={`${streak.count}-game ${isWin ? 'win' : 'loss'} streak`}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="vt-anton text-4xl sm:text-5xl tabular-nums">{streak.count}</span>
        <span className="vt-mono text-[9px] tracking-[0.2em] mt-1 opacity-90">
          {isWin ? 'W STREAK' : 'L STREAK'}
        </span>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="vt-mono px-3 py-2 rounded-md bg-[rgba(0,0,0,0.35)] border border-[color:var(--vt-rule)] flex flex-col gap-0.5 min-w-[72px]">
      <span className="text-[9px] tracking-[0.24em] uppercase text-[color:var(--vt-ink-faint)]">{label}</span>
      <span className="vt-anton text-xl text-[color:var(--vt-ink)] tabular-nums leading-tight">{value}</span>
    </div>
  );
}

export default memo(VestScoreboard);
