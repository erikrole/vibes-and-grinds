import { getCompositeColor, getRatingColor } from '../utils/colors';

export default function StatsHero({ visitCount, averages }) {
  return (
    <section className="paper-card p-7 sm:p-10 mb-6 relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)' }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1px_1fr] gap-7 lg:gap-12 items-center relative">
        <div className="flex flex-col justify-center min-w-[8rem]">
          <p className="eyebrow mb-3">Visits</p>
          <p className="hero-numeral text-7xl sm:text-8xl lg:text-9xl">{visitCount}</p>
        </div>
        <div className="rule-v hidden lg:block" />
        <div className="rule-h lg:hidden" />
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <EditorialStat
            label="Vibe"
            value={averages.vibe}
            accent={getRatingColor(Number(averages.vibe))}
            index={0}
          />
          <EditorialStat
            label="Coffee"
            value={averages.coffee}
            accent={getRatingColor(Number(averages.coffee))}
            index={1}
          />
          <EditorialStat
            label="Overall"
            value={averages.composite}
            suffix="/ 20"
            accent={getCompositeColor(Number(averages.composite))}
            index={2}
          />
        </div>
      </div>
    </section>
  );
}

function EditorialStat({ label, value, suffix, accent, index = 0 }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        {accent && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          />
        )}
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
          <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
