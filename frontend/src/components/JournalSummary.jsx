export default function JournalSummary({ visitCount, avgVibe, avgCoffee, avgComposite }) {
  return (
    <section className="journal-summary mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1px_1fr] gap-6 lg:gap-10 items-end">
        <div>
          <p className="eyebrow mb-3">Coffee journal</p>
          <div className="flex items-end gap-3">
            <p className="hero-numeral text-6xl sm:text-7xl">{visitCount}</p>
            <p className="text-sm sm:text-base mb-1.5" style={{ color: 'var(--ink-soft)' }}>stops logged on the road and around Madison</p>
          </div>
        </div>
        <div className="rule-v hidden lg:block" />
        <div className="rule-h lg:hidden" />
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <EditorialStat label="Vibe" value={avgVibe} index={0} />
          <EditorialStat label="Coffee" value={avgCoffee} index={1} />
          <EditorialStat label="Overall" value={avgComposite} suffix="/ 20" index={2} />
        </div>
      </div>
    </section>
  );
}

function EditorialStat({ label, value, suffix, index = 0 }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="eyebrow truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span
          className="text-3xl sm:text-4xl lg:text-5xl animate-stat-pop tracking-tight font-semibold tabular-nums"
          style={{
            animationDelay: `${index * 80}ms`,
            color: 'var(--ink)',
            fontFamily: 'Fraunces, Georgia, serif',
            fontWeight: 600,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}
