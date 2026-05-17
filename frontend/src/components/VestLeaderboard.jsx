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

// Outfit leaderboard rendered as a dense, scannable table — broadcast stat
// sheet feel, not a deck of trading cards. Selected row highlights with the
// red left rail; sortable by Wilson/rate/WoE/games. Outfits with zero wins
// collapse into a "Buried" group at the bottom so the leaderboard surfaces
// only meaningful signal by default.
function VestLeaderboard({ stats, badges, selectedOutfit, onSelectOutfit, netStatus }) {
  const [sortBy, setSortBy] = useState('wilson');
  const [showBuried, setShowBuried] = useState(false);

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'rate') return b.smoothedRate - a.smoothedRate || b.games - a.games;
    if (sortBy === 'woe') return b.woePerGame - a.woePerGame || b.games - a.games;
    if (sortBy === 'games') return b.games - a.games || b.smoothedRate - a.smoothedRate;
    return b.wilson - a.wilson || b.winsAboveExpected - a.winsAboveExpected;
  });

  const active = sorted.filter((s) => s.wins > 0);
  const buried = sorted.filter((s) => s.wins === 0);

  if (!stats.length) {
    return (
      <section className="vt-card mb-6 p-6 text-center">
        <p className="vt-mono text-sm text-[color:var(--vt-ink-mute)]">
          Log a few games to fill the leaderboard.
        </p>
      </section>
    );
  }

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="vt-section-head">
        <span className="vt-label">Outfit Leaderboard</span>
        <div className="flex gap-0 -mr-3">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`vt-tab text-[11px] px-3 py-1 ${sortBy === opt.value ? 'is-active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ul role="list">
        {active.map((stat, idx) => (
          <LeaderboardRow
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
      </ul>

      {buried.length > 0 && (
        <>
          <button
            onClick={() => setShowBuried((v) => !v)}
            className="w-full px-5 py-3 border-t border-[color:var(--vt-rule)] flex items-center justify-between hover:bg-white/[0.025] transition-colors"
          >
            <span className="vt-label">
              {showBuried ? '▾' : '▸'} Buried · {buried.length} winless
            </span>
            <span className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)] vt-tabular">
              tap to {showBuried ? 'collapse' : 'reveal'}
            </span>
          </button>
          {showBuried && (
            <ul role="list">
              {buried.map((stat, idx) => (
                <LeaderboardRow
                  key={stat.outfit}
                  stat={stat}
                  rank={active.length + idx + 1}
                  isSelected={selectedOutfit === stat.outfit}
                  onSelect={onSelectOutfit}
                  badges={badges[stat.outfit] || []}
                  netStatus={netStatus}
                  sortBy={sortBy}
                  dim
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function LeaderboardRow({ stat, rank, isSelected, onSelect, badges, netStatus, sortBy, dim }) {
  const winPct = stat.winRatePct;
  const woeSign = stat.winsAboveExpected >= 0 ? '+' : '';
  const primaryLabel =
    sortBy === 'woe' ? 'vs Exp' : sortBy === 'games' ? 'Games' : sortBy === 'rate' ? 'Win %' : 'Conf';
  const primary =
    sortBy === 'woe'
      ? `${woeSign}${stat.winsAboveExpected.toFixed(1)}`
      : sortBy === 'rate'
      ? `${stat.smoothedRatePct}%`
      : sortBy === 'games'
      ? `${stat.games}`
      : `${stat.wilsonPct}%`;

  return (
    <li>
      <button
        onClick={() => onSelect(isSelected ? null : stat.outfit)}
        className={`w-full text-left px-4 sm:px-5 py-3 border-b border-[color:var(--vt-rule)] last:border-b-0 hover:bg-white/[0.025] transition-colors block ${
          dim ? 'opacity-60' : ''
        }`}
        style={
          isSelected
            ? {
                borderLeftWidth: '3px',
                borderLeftColor: 'var(--vt-red)',
                borderLeftStyle: 'solid',
                paddingLeft: 'calc(1rem - 3px)',
                background: 'var(--vt-red-soft)',
              }
            : undefined
        }
      >
        {/* Mobile + desktop share the same row structure */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Rank */}
          <span
            className="vt-display text-xl sm:text-2xl vt-tabular shrink-0 w-7 sm:w-9"
            style={{
              color: rank === 1 ? 'var(--vt-red)' : rank <= 3 ? 'var(--vt-ink)' : 'var(--vt-ink-mute)',
            }}
          >
            {String(rank).padStart(2, '0')}
          </span>

          {/* Outfit name + sample */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="vt-display text-base sm:text-lg text-[color:var(--vt-ink)] uppercase tracking-tight truncate">
                {stat.outfit}
              </span>
              <SampleTag stat={stat} />
              {stat.form === 'hot' && (
                <span className="vt-label text-[9px] vt-label-red">Hot</span>
              )}
              {stat.form === 'cold' && (
                <span className="vt-label text-[9px]">Cold</span>
              )}
            </div>
            <div className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] mt-0.5 truncate">
              last: {formatLocationLabel(stat.lastSeenLocation)} {stat.lastSeen}
              {stat.avgNet && netStatus === 'loaded' ? ` · SoS #${stat.avgNet}` : ''}
            </div>
          </div>

          {/* W-L */}
          <div className="shrink-0 text-right">
            <span className="vt-label text-[9px] block">W–L</span>
            <span className="vt-display text-base sm:text-lg text-[color:var(--vt-ink)] vt-tabular">
              {stat.wins}–{stat.losses}
            </span>
          </div>

          {/* Primary metric */}
          <div className="shrink-0 text-right w-14 sm:w-20">
            <span className="vt-label text-[9px] block">{primaryLabel}</span>
            <span
              className="vt-display text-xl sm:text-2xl vt-tabular"
              style={{ color: rank === 1 ? 'var(--vt-red)' : 'var(--vt-ink)' }}
            >
              {primary}
            </span>
          </div>
        </div>

        {/* Bar row beneath, shows the underlying raw win % */}
        <div className="mt-2 flex items-center gap-2">
          <div className="vt-bar-track flex-1">
            <div className="vt-bar-fill-white" style={{ width: `${winPct}%` }} />
          </div>
          <span className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] vt-tabular shrink-0">
            {winPct}%
          </span>
        </div>

        {badges.length > 0 && (
          <div className="vt-mono text-[10px] text-[color:var(--vt-ink-mute)] mt-1.5 truncate">
            {badges.slice(0, 3).join(' · ')}
          </div>
        )}
      </button>
    </li>
  );
}

// Sample size tag. Reads as broadcast stat ("n=8") with subtle color shift
// based on tier so analysts can see at a glance how trustworthy the row is.
function SampleTag({ stat }) {
  const tone =
    stat.tier === 'untested' || stat.tier === 'tiny'
      ? 'var(--vt-ink-faint)'
      : stat.tier === 'small'
      ? 'var(--vt-ink-mute)'
      : 'var(--vt-ink-dim)';
  return (
    <span
      className="vt-mono text-[10px] vt-tabular px-1.5 py-0.5 rounded border"
      style={{
        color: tone,
        borderColor: 'var(--vt-rule)',
        background: 'var(--vt-bg)',
      }}
      title={`${TIER_LABEL[stat.tier]} (n=${stat.games})`}
      aria-label={`${TIER_LABEL[stat.tier]}, n=${stat.games}`}
    >
      n={stat.games}
    </span>
  );
}

export default memo(VestLeaderboard);
