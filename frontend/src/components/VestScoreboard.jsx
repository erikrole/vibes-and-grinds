import { memo } from 'react';

// Arena jumbotron scoreboard. Black surface, red top rail, big Barlow Condensed
// numerals with tabular nums, single accent. No decoration.
function VestScoreboard({
  wins,
  losses,
  streak,
  secondary,
  filterLabel,
  onClearFilter,
  status,
  identity,
}) {
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <section className="vt-card vt-rail-top mb-6 overflow-hidden">
      {/* Identity + status strip */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-[color:var(--vt-rule)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Block W mark */}
          <span
            aria-hidden
            className="vt-display-tight text-2xl shrink-0"
            style={{ color: 'var(--vt-red)', letterSpacing: '-0.04em' }}
          >
            W
          </span>
          <span className="vt-label truncate">
            {identity?.team || 'Wisconsin Badgers'} · {identity?.season || '25–26'}
            {identity?.who && (
              <span className="text-[color:var(--vt-ink-faint)]"> · {identity.who}</span>
            )}
          </span>
        </div>
        {filterLabel ? (
          <button
            onClick={onClearFilter}
            className="vt-condensed text-xs tracking-[0.16em] uppercase text-[color:var(--vt-ink-dim)] hover:text-[color:var(--vt-ink)] flex items-center gap-2 transition-colors"
          >
            <span className="text-[color:var(--vt-ink-faint)]">Filter ·</span>
            <span>{filterLabel}</span>
            <span aria-hidden className="text-[color:var(--vt-red)]">✕</span>
          </button>
        ) : (
          status && <StatusBadge status={status} />
        )}
      </div>

      <div className="px-5 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-5 flex-wrap">
          <div className="min-w-0 flex items-end gap-5 sm:gap-8">
            <div>
            <div className="vt-label mb-1">
              {filterLabel ? `${filterLabel}` : 'Overall'}
            </div>
            <div className="flex items-baseline" style={{ letterSpacing: '-0.04em' }}>
              <span className="vt-hero-num text-[56px] sm:text-[72px] vt-tabular">
                {wins}
              </span>
              <span
                className="vt-hero-num text-[38px] sm:text-[48px] text-[color:var(--vt-ink-faint)] vt-tabular"
                style={{ margin: '0 0.06em', alignSelf: 'center' }}
              >
                –
              </span>
              <span className="vt-hero-num text-[56px] sm:text-[72px] vt-tabular text-[color:var(--vt-ink-dim)]">
                {losses}
              </span>
            </div>
            </div>
            {winPct != null && (
              <div className="pb-1">
                <span className="vt-display text-2xl text-[color:var(--vt-red)] vt-tabular block">
                  {winPct}<span className="text-xl">%</span>
                </span>
                <span className="vt-label block mt-1">Win Pct</span>
              </div>
            )}
          </div>

          {streak && streak.count >= 2 && (
            <StreakBadge streak={streak} />
          )}
        </div>

        {secondary?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {secondary.map((pill) => (
              <StatBlock key={pill.label} label={pill.label} value={pill.value} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  if (status.kind === 'next') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--vt-red)', boxShadow: '0 0 8px var(--vt-red)' }}
          aria-hidden
        />
        <span className="vt-label">
          Next · {status.label}
          {status.date && (
            <span className="text-[color:var(--vt-ink-faint)] ml-1">· {status.date}</span>
          )}
        </span>
      </div>
    );
  }
  if (status.kind === 'final') {
    return <span className="vt-label">Final · Season Closed</span>;
  }
  return <span className="vt-label">Season Record</span>;
}

function StreakBadge({ streak }) {
  const isWin = streak.result === 'W';
  return (
    <div
      className="flex items-baseline gap-2 px-4 py-3 rounded border"
      style={{
        background: isWin ? 'var(--vt-red-soft)' : 'transparent',
        borderColor: isWin ? 'var(--vt-red)' : 'var(--vt-rule-strong)',
      }}
      title={`${streak.count}-game ${isWin ? 'win' : 'loss'} streak`}
    >
      <span
        className="vt-display text-4xl sm:text-5xl vt-tabular"
        style={{ color: isWin ? 'var(--vt-red)' : 'var(--vt-ink-dim)' }}
      >
        {streak.count}
      </span>
      <span className="vt-label" style={{ color: isWin ? 'var(--vt-red)' : 'var(--vt-ink-mute)' }}>
        {isWin ? 'W Streak' : 'L Streak'}
      </span>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="vt-stat">
      <span className="vt-stat-label">{label}</span>
      <span className="vt-stat-value">{value}</span>
    </div>
  );
}

export default memo(VestScoreboard);
