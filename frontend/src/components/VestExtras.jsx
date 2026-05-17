import { memo, useState } from 'react';

// Auxiliary tabs: storylines, head-to-head matchup, game-day coffee.
// Plain broadcast tab strip, no decoration.
function VestExtras({ milestones, outfitStats, outfitBadges, coffeeCrossover }) {
  const [openTab, setOpenTab] = useState(null);
  const [compareOutfits, setCompareOutfits] = useState([null, null]);

  const tabs = [
    { value: 'storylines', label: 'Storylines', count: milestones.length, available: milestones.length > 0 },
    { value: 'compare', label: 'Head to Head', count: null, available: outfitStats.length >= 2 },
    { value: 'coffee', label: 'Game-Day Brew', count: coffeeCrossover.length, available: coffeeCrossover.length > 0 },
  ].filter((t) => t.available);

  if (!tabs.length) return null;

  const comparisonData = (() => {
    const [a, b] = compareOutfits;
    if (!a || !b) return null;
    const statA = outfitStats.find((s) => s.outfit === a);
    const statB = outfitStats.find((s) => s.outfit === b);
    if (!statA || !statB) return null;
    return {
      a: { ...statA, badges: outfitBadges[a] || [] },
      b: { ...statB, badges: outfitBadges[b] || [] },
    };
  })();

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="flex border-b border-[color:var(--vt-rule)] overflow-x-auto">
        {tabs.map((tab) => {
          const isOpen = openTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setOpenTab(isOpen ? null : tab.value)}
              className={`vt-tab whitespace-nowrap ${isOpen ? 'is-active' : ''}`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-2 vt-mono text-[10px] text-[color:var(--vt-ink-faint)] vt-tabular">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openTab === 'storylines' && (
        <ul className="divide-y divide-[color:var(--vt-rule)]">
          {milestones.map((m, i) => (
            <li key={i} className="flex items-baseline gap-3 px-5 py-3">
              <span className="vt-label vt-label-red w-6 text-center" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="vt-mono text-sm text-[color:var(--vt-ink-dim)]">
                {m.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {openTab === 'compare' && (
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={compareOutfits[slot] || ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setCompareOutfits((prev) => {
                    const next = [...prev];
                    next[slot] = val;
                    return next;
                  });
                }}
                className="text-sm flex-1 min-w-[140px]"
              >
                <option value="">— Slot {slot + 1} —</option>
                {outfitStats.map((s) => (
                  <option key={s.outfit} value={s.outfit}>{s.outfit}</option>
                ))}
              </select>
            ))}
            {(compareOutfits[0] || compareOutfits[1]) && (
              <button
                onClick={() => setCompareOutfits([null, null])}
                className="vt-condensed text-xs tracking-[0.16em] uppercase text-[color:var(--vt-ink-mute)] hover:text-[color:var(--vt-red)] transition-colors px-2"
              >
                Clear
              </button>
            )}
          </div>

          {comparisonData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompareCard stat={comparisonData.a} other={comparisonData.b} />
              <CompareCard stat={comparisonData.b} other={comparisonData.a} />
            </div>
          ) : (
            <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] text-center py-4">
              Pick two outfits to compare.
            </p>
          )}
        </div>
      )}

      {openTab === 'coffee' && (
        <div className="px-5 py-4">
          <p className="vt-label mb-3">Drinks logged on game day · grouped by outcome</p>
          <ul className="divide-y divide-[color:var(--vt-rule)]">
            {coffeeCrossover.map((c) => (
              <li key={c.drink} className="grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] gap-3 items-center py-2.5">
                <span className="vt-condensed text-sm text-[color:var(--vt-ink)] uppercase truncate">
                  {c.drink}
                </span>
                <span className="vt-display text-base text-[color:var(--vt-ink)] vt-tabular text-right">
                  {c.wins}–{c.losses}
                </span>
                <div className="vt-bar-track">
                  <div
                    className="vt-bar-fill-red"
                    style={{ width: `${c.winRate}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CompareCard({ stat, other }) {
  const winning = stat.smoothedRate > other.smoothedRate;
  return (
    <div
      className="vt-card-inset p-3"
      style={
        winning
          ? { borderColor: 'var(--vt-red)', borderLeftWidth: '2px' }
          : undefined
      }
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="vt-display text-base text-[color:var(--vt-ink)] uppercase truncate">
          {stat.outfit}
        </h4>
        {winning && <span className="vt-label vt-label-red">Leader</span>}
      </div>
      <ul className="space-y-1 vt-mono text-xs text-[color:var(--vt-ink-mute)] vt-tabular">
        <li>
          <span className="text-[color:var(--vt-ink-faint)]">Record</span>{' '}
          <span className="text-[color:var(--vt-ink)]">{stat.wins}–{stat.losses}</span>{' '}
          <span>· {stat.smoothedRatePct}% smoothed</span>
        </li>
        <li>Q1 {stat.quadrants[1].wins}–{stat.quadrants[1].losses} · Q2 {stat.quadrants[2].wins}–{stat.quadrants[2].losses}</li>
        <li>Q3 {stat.quadrants[3].wins}–{stat.quadrants[3].losses} · Q4 {stat.quadrants[4].wins}–{stat.quadrants[4].losses}</li>
        <li>
          <span className="text-[color:var(--vt-ink-faint)]">vs Expected</span>{' '}
          <span style={{ color: stat.winsAboveExpected >= 0 ? 'var(--vt-red)' : 'var(--vt-ink-mute)' }}>
            {stat.winsAboveExpected >= 0 ? '+' : ''}{stat.winsAboveExpected.toFixed(1)}
          </span>
        </li>
        {stat.avgNet && <li>Avg opp NET #{stat.avgNet}</li>}
      </ul>
      {stat.badges.length > 0 && (
        <div className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] mt-2 truncate">
          {stat.badges.join(' · ')}
        </div>
      )}
    </div>
  );
}

export default memo(VestExtras);
