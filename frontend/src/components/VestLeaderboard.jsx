import { memo, useState } from 'react';
import { formatLocationLabel } from '../utils/vestTrackerMath';

const SORT_OPTIONS = [
  { value: 'wilson', label: 'Confidence' },
  { value: 'rate', label: 'Win %' },
  { value: 'woe', label: 'vs Expected' },
  { value: 'games', label: 'Games' },
];

const TIER_LABEL = {
  untested: 'no games',
  tiny: '1 game',
  small: 'small sample',
  decent: 'decent sample',
  solid: 'solid sample',
};
const TIER_DOTS = { untested: 0, tiny: 1, small: 2, decent: 3, solid: 4 };
const RANK_GLYPH = ['★', '✦', '✧', '◆', '◇'];

// Outfit leaderboard as a deck of trading cards. Each row is a foil-border
// card with stat blocks, sample tier dots, quadrant micro-table, and a
// rank glyph that ramps from solid star → outline diamond.
function VestLeaderboard({ stats, badges, selectedOutfit, onSelectOutfit, netStatus }) {
  const [sortBy, setSortBy] = useState('wilson');

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'rate') return b.smoothedRate - a.smoothedRate || b.games - a.games;
    if (sortBy === 'woe') return b.woePerGame - a.woePerGame || b.games - a.games;
    if (sortBy === 'games') return b.games - a.games || b.smoothedRate - a.smoothedRate;
    return b.wilson - a.wilson || b.winsAboveExpected - a.winsAboveExpected;
  });

  if (!stats.length) {
    return (
      <section className="vt-card mb-6 p-6 text-center">
        <p className="vt-mono text-sm text-[color:var(--vt-ink-dim)] tracking-wider">
          ◌ Log a few games to fill the deck.
        </p>
      </section>
    );
  }

  return (
    <section className="vt-reveal vt-reveal-3 mb-6 sm:mb-7">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="vt-monoton text-2xl sm:text-3xl vt-text-foil">DECK</span>
          <span className="vt-mojo text-[10px] tracking-[0.32em] text-[color:var(--vt-cyan)] uppercase">
            ◆ {sorted.length} cards
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-[color:var(--vt-rule)] bg-[rgba(0,0,0,0.35)] p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`vt-mono text-[9px] uppercase tracking-[0.12em] px-2.5 py-1.5 rounded transition-colors ${
                sortBy === opt.value
                  ? 'bg-[color:var(--vt-crimson)] text-white shadow-[0_0_12px_var(--vt-crimson-glow)]'
                  : 'text-[color:var(--vt-ink-dim)] hover:text-[color:var(--vt-ink)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {sorted.map((stat, idx) => (
          <DeckCard
            key={stat.outfit}
            stat={stat}
            rank={idx + 1}
            isSelected={selectedOutfit === stat.outfit}
            onSelect={onSelectOutfit}
            badges={badges[stat.outfit] || []}
            netStatus={netStatus}
            sortBy={sortBy}
          />
        ))}
      </div>
    </section>
  );
}

function DeckCard({ stat, rank, isSelected, onSelect, badges, netStatus, sortBy }) {
  const winPct = stat.winRatePct;
  const woeSign = stat.winsAboveExpected >= 0 ? '+' : '';
  const accentColor =
    stat.winsAboveExpected > 0.5
      ? 'var(--vt-cyan)'
      : stat.winsAboveExpected < -0.5
      ? 'var(--vt-crimson)'
      : 'var(--vt-gold)';

  const primaryMetric =
    sortBy === 'woe'
      ? { label: 'vs Exp', value: `${woeSign}${stat.winsAboveExpected.toFixed(1)}`, accent: accentColor }
      : sortBy === 'wilson'
      ? { label: 'Conf', value: `${stat.wilsonPct}%`, accent: 'var(--vt-gold)' }
      : sortBy === 'games'
      ? { label: 'Games', value: `${stat.games}`, accent: 'var(--vt-cyan)' }
      : { label: 'Smooth', value: `${stat.smoothedRatePct}%`, accent: 'var(--vt-gold)' };

  const glyph = RANK_GLYPH[Math.min(rank - 1, RANK_GLYPH.length - 1)];

  return (
    <button
      onClick={() => onSelect(isSelected ? null : stat.outfit)}
      className={`relative text-left rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
        isSelected ? 'vt-foil-border' : ''
      }`}
      style={{
        background: isSelected ? 'transparent' : 'linear-gradient(180deg, var(--vt-card-2) 0%, var(--vt-card) 100%)',
        boxShadow: isSelected
          ? '0 16px 40px -16px rgba(255,23,76,0.5)'
          : '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 30px -16px rgba(0,0,0,0.5)',
        border: isSelected ? 'none' : `1px solid ${rank === 1 ? 'rgba(244,197,66,0.45)' : 'var(--vt-rule)'}`,
      }}
    >
      <div className={isSelected ? 'vt-card relative' : 'relative'}>
        {/* Rank ribbon */}
        <div
          className="absolute top-0 left-4 w-12 h-7 flex items-center justify-center text-[#0a0418] vt-anton text-sm shadow-md"
          style={{
            background: rank === 1 ? 'var(--vt-foil)' : rank <= 3 ? 'var(--vt-chrome)' : 'rgba(255,255,255,0.12)',
            color: rank <= 3 ? '#0a0418' : 'var(--vt-ink)',
            clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)',
          }}
        >
          <span className="tabular-nums">#{rank}</span>
        </div>

        {/* Rank glyph corner */}
        <div className="absolute top-2.5 right-3 vt-mojo text-xl text-[color:var(--vt-ink-faint)] opacity-60">
          {glyph}
        </div>

        <div className="px-4 pt-10 pb-4">
          {/* Outfit name + sample dots */}
          <div className="flex items-center gap-2 mb-1">
            <SampleTier tier={stat.tier} />
            {stat.form === 'hot' && (
              <span className="vt-mono text-[9px] tracking-[0.16em] px-1.5 py-0.5 rounded bg-[rgba(255,23,76,0.18)] text-[color:var(--vt-crimson)] vt-text-neon-crimson uppercase">
                ◉ Hot
              </span>
            )}
            {stat.form === 'cold' && (
              <span className="vt-mono text-[9px] tracking-[0.16em] px-1.5 py-0.5 rounded bg-[rgba(0,229,255,0.12)] text-[color:var(--vt-cyan)] uppercase">
                ❄ Cold
              </span>
            )}
          </div>
          <h4 className="vt-anton text-xl sm:text-2xl text-[color:var(--vt-ink)] leading-[1.05] truncate">
            {stat.outfit.toUpperCase()}
          </h4>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.slice(0, 2).map((badge) => (
                <span
                  key={badge}
                  className="vt-mono text-[9px] tracking-[0.12em] px-1.5 py-0.5 rounded bg-[rgba(244,197,66,0.10)] text-[color:var(--vt-gold)] truncate max-w-[160px]"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Primary stat block */}
          <div className="mt-3 flex items-end justify-between gap-3 pb-2 border-b border-[color:var(--vt-rule)]">
            <div>
              <div className="vt-mono text-[9px] uppercase tracking-[0.24em] text-[color:var(--vt-ink-faint)]">
                W–L
              </div>
              <div className="vt-anton text-2xl text-[color:var(--vt-ink)] tabular-nums leading-none mt-0.5">
                {stat.wins}–{stat.losses}
              </div>
            </div>
            <div className="text-right">
              <div className="vt-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: primaryMetric.accent }}>
                {primaryMetric.label}
              </div>
              <div
                className="vt-monoton text-3xl tabular-nums leading-none mt-1"
                style={{
                  color: primaryMetric.accent,
                  textShadow: `0 0 14px ${primaryMetric.accent}`,
                }}
              >
                {primaryMetric.value}
              </div>
            </div>
          </div>

          {/* Win/loss bar */}
          <div
            className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden flex"
            title={`${stat.wins}W – ${stat.losses}L (raw ${winPct}%)`}
          >
            <div
              className="h-full bg-[color:var(--vt-cyan)]"
              style={{ width: `${winPct}%`, boxShadow: '0 0 6px var(--vt-cyan-glow)' }}
            />
            <div
              className="h-full bg-[color:var(--vt-crimson)]"
              style={{ width: `${100 - winPct}%`, boxShadow: '0 0 6px var(--vt-crimson-glow)' }}
            />
          </div>

          {/* Footer / quadrants */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="vt-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--vt-ink-faint)] truncate">
              last: {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
            </span>
            {stat.avgNet && netStatus === 'loaded' && (
              <span className="vt-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--vt-cyan)] tabular-nums">
                SoS #{stat.avgNet}
              </span>
            )}
          </div>

          {netStatus === 'loaded' && (
            <div className="mt-2 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((q) => {
                const w = stat.quadrants[q].wins;
                const l = stat.quadrants[q].losses;
                const empty = w + l === 0;
                return (
                  <div
                    key={q}
                    className="rounded vt-mono text-center py-1 tabular-nums"
                    style={{
                      background: empty ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${empty ? 'var(--vt-rule)' : 'rgba(255,255,255,0.12)'}`,
                      color: empty ? 'var(--vt-ink-faint)' : 'var(--vt-ink)',
                    }}
                  >
                    <span className="text-[9px] tracking-[0.16em] text-[color:var(--vt-ink-faint)]">Q{q}</span>{' '}
                    <span className="text-[10px]">{empty ? '—' : `${w}–${l}`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card bottom foil edge */}
        <div className="vt-stripe h-[3px] w-full opacity-70" aria-hidden />
      </div>
    </button>
  );
}

function SampleTier({ tier }) {
  const count = TIER_DOTS[tier] ?? 0;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={TIER_LABEL[tier]}
      aria-label={TIER_LABEL[tier]}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-sm"
          style={{
            background: i < count ? 'var(--vt-cyan)' : 'rgba(255,255,255,0.10)',
            boxShadow: i < count ? '0 0 4px var(--vt-cyan-glow)' : 'none',
          }}
        />
      ))}
    </span>
  );
}

export default memo(VestLeaderboard);
