/**
 * Coffee journal first-viewport composition: brand + visit count + averages.
 * Lives outside AppChrome so Vest mode-switch chrome cannot compete with brand.
 * After #47 shell split, mount from CoffeeJournalShell instead of App.jsx.
 */
export default function CoffeeJournalHero({
  visitCount,
  avgVibe,
  avgCoffee,
  avgComposite,
  onAddVisit,
  showAddVisit = true,
}) {
  return (
    <section className="journal-hero" aria-labelledby="journal-brand">
      <div className="journal-hero__brand-row">
        <div className="journal-hero__brand">
          <h1 id="journal-brand" className="journal-hero__title">
            vibes & grinds
          </h1>
          <p className="journal-hero__lede">
            Road-trip coffee journal — Madison home stops and away days.
          </p>
        </div>
        {showAddVisit && onAddVisit && (
          <div className="journal-hero__cta">
            <button type="button" onClick={onAddVisit} className="btn-primary">
              Add Visit
            </button>
            <p className="journal-hero__cta-hint">Browse the log below, or press <kbd>n</kbd></p>
          </div>
        )}
      </div>

      <div className="journal-hero__summary" aria-label="Journal summary">
        <div className="journal-hero__count">
          <p className="hero-numeral journal-hero__numeral">{visitCount}</p>
          <p className="journal-hero__count-label">
            {visitCount === 1 ? 'stop logged' : 'stops logged'}
          </p>
        </div>

        <div className="rule-v journal-hero__rule-v" aria-hidden="true" />
        <div className="rule-h journal-hero__rule-h" aria-hidden="true" />

        <div className="journal-hero__stats">
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
    <div className="journal-hero__stat">
      <p className="eyebrow truncate">{label}</p>
      <div className="journal-hero__stat-value">
        <span
          className="journal-hero__stat-num animate-stat-pop"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {value}
        </span>
        {suffix && <span className="journal-hero__stat-suffix">{suffix}</span>}
      </div>
    </div>
  );
}
