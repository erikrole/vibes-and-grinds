import { memo, useState } from 'react';

// Extras drawer — collapsible tabs for season storylines, head-to-head,
// and game-day coffee. Styled as a retro broadcast control panel.
function VestExtras({ milestones, outfitStats, outfitBadges, coffeeCrossover }) {
  const [openTab, setOpenTab] = useState(null);
  const [compareOutfits, setCompareOutfits] = useState([null, null]);

  const tabs = [
    { value: 'storylines', label: 'Storylines', count: milestones.length, available: milestones.length > 0 },
    { value: 'compare', label: 'Head·to·Head', count: null, available: outfitStats.length >= 2 },
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
    <section className="vt-reveal vt-reveal-4 vt-card mb-6 sm:mb-7 overflow-hidden">
      <div className="flex border-b border-[color:var(--vt-rule)] overflow-x-auto bg-[rgba(0,0,0,0.3)]">
        {tabs.map((tab) => {
          const isOpen = openTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setOpenTab(isOpen ? null : tab.value)}
              className={`relative px-4 sm:px-5 py-3 vt-anton text-sm tracking-[0.08em] uppercase whitespace-nowrap transition-colors ${
                isOpen
                  ? 'text-[color:var(--vt-crimson)] vt-text-neon-crimson'
                  : 'text-[color:var(--vt-ink-dim)] hover:text-[color:var(--vt-ink)]'
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 vt-mono text-[10px] text-[color:var(--vt-ink-faint)] tabular-nums">
                  · {tab.count}
                </span>
              )}
              {isOpen && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[color:var(--vt-crimson)] rounded-full shadow-[0_0_8px_var(--vt-crimson-glow)]" />
              )}
            </button>
          );
        })}
      </div>

      {openTab === 'storylines' && (
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md bg-[rgba(0,0,0,0.35)] border border-[color:var(--vt-rule)] px-3 py-2.5"
              >
                <span className="text-base shrink-0 leading-tight">{m.icon}</span>
                <span className="vt-mono text-xs text-[color:var(--vt-ink-dim)] leading-snug tracking-wide">
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        </div>
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
                className="vt-mono rounded-md border px-3 py-2 text-sm flex-1 min-w-[140px]"
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
                className="vt-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--vt-ink-faint)] hover:text-[color:var(--vt-crimson)] transition-colors px-2"
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
            <p className="vt-mono text-xs text-[color:var(--vt-ink-faint)] text-center py-4 tracking-wider">
              ◌ Choose two cards to draw a matchup.
            </p>
          )}
        </div>
      )}

      {openTab === 'coffee' && (
        <div className="px-5 py-4">
          <p className="vt-mono text-[10px] tracking-[0.22em] text-[color:var(--vt-cyan)] uppercase mb-3">
            ☕ Drinks logged on game day · grouped by outcome
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {coffeeCrossover.map((c) => {
              const accent =
                c.winRate >= 60
                  ? 'var(--vt-cyan)'
                  : c.winRate <= 40
                  ? 'var(--vt-crimson)'
                  : 'var(--vt-gold)';
              return (
                <div
                  key={c.drink}
                  className="rounded-md bg-[rgba(0,0,0,0.35)] border border-[color:var(--vt-rule)] px-3 py-2.5"
                  style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="vt-anton text-sm text-[color:var(--vt-ink)] truncate">
                      {c.drink.toUpperCase()}
                    </span>
                    <span
                      className="vt-mono text-xs tabular-nums tracking-wider"
                      style={{ color: accent }}
                    >
                      {c.wins}–{c.losses}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden flex">
                    <div className="h-full bg-[color:var(--vt-cyan)]" style={{ width: `${c.winRate}%` }} />
                    <div className="h-full bg-[color:var(--vt-crimson)]" style={{ width: `${100 - c.winRate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function CompareCard({ stat, other }) {
  const winning = stat.smoothedRate > other.smoothedRate;
  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: 'rgba(0,0,0,0.35)',
        borderColor: winning ? 'var(--vt-cyan)' : 'var(--vt-rule)',
        boxShadow: winning ? '0 0 24px -8px var(--vt-cyan-glow)' : 'none',
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="vt-anton text-lg text-[color:var(--vt-ink)] truncate">{stat.outfit.toUpperCase()}</h4>
        {winning && (
          <span className="vt-mono text-[9px] tracking-[0.18em] text-[color:var(--vt-cyan)] uppercase">
            ◆ Leader
          </span>
        )}
      </div>
      <div className="space-y-1.5 vt-mono text-xs text-[color:var(--vt-ink-dim)] tabular-nums tracking-wide">
        <p>
          Record · <span className="text-[color:var(--vt-ink)] font-bold">{stat.wins}–{stat.losses}</span> · {stat.smoothedRatePct}% smoothed
        </p>
        <p>Q1 {stat.quadrants[1].wins}–{stat.quadrants[1].losses} · Q2 {stat.quadrants[2].wins}–{stat.quadrants[2].losses}</p>
        <p>Q3 {stat.quadrants[3].wins}–{stat.quadrants[3].losses} · Q4 {stat.quadrants[4].wins}–{stat.quadrants[4].losses}</p>
        <p>
          vs Expected ·{' '}
          <span style={{ color: stat.winsAboveExpected >= 0 ? 'var(--vt-cyan)' : 'var(--vt-crimson)' }}>
            {stat.winsAboveExpected >= 0 ? '+' : ''}{stat.winsAboveExpected.toFixed(1)}
          </span>
        </p>
        {stat.avgNet && <p>Avg opp NET · #{stat.avgNet}</p>}
        {stat.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {stat.badges.map((b) => (
              <span
                key={b}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(244,197,66,0.10)] text-[color:var(--vt-gold)]"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VestExtras);
