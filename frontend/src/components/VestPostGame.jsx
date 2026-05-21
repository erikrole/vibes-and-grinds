import { memo, useEffect, useState } from 'react';
import { formatDate, formatLocationLabel } from '../utils/vestTrackerMath';

// Closes the result loop: surfaces after the game date passes so the user can
// log W or L with one tap instead of hunting through the timeline.
// Replaces VestLockInPick once the game day arrives.
function VestPostGame({ game, onLogResult }) {
  const [overtime, setOvertime] = useState(false);

  // Reset the OT toggle when the card advances to a different game so a prior
  // game's OT selection can't carry into the next result.
  useEffect(() => {
    setOvertime(false);
  }, [game?.id]);

  if (!game) return null;

  const handleLog = (result) => {
    onLogResult(game.id, result, overtime);
  };

  return (
    <section
      className="vt-card mb-6 px-5 py-4"
      style={{ borderColor: 'var(--vt-red)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="vt-label vt-label-red">How&rsquo;d it go?</span>
        <span className="vt-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--vt-ink-mute)]">
          {formatLocationLabel(game.location, 'full')} {game.opponent}
          {game.date ? ` · ${formatDate(game.date)}` : ''}
        </span>
      </div>

      {/* Outfit worn */}
      {game.outfit && (
        <div className="vt-condensed text-sm uppercase tracking-[0.08em] text-[color:var(--vt-ink-dim)] mb-4">
          {game.outfit}
        </div>
      )}

      {/* W / L tap targets */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleLog('W')}
          className="flex-1 min-w-[100px] py-3 rounded vt-display-tight text-4xl leading-none tracking-tighter transition-colors"
          style={{
            background: 'var(--vt-red-soft)',
            color: 'var(--vt-red)',
            border: '1px solid var(--vt-red)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(197,5,12,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--vt-red-soft)')}
        >
          W
        </button>

        <button
          onClick={() => handleLog('L')}
          className="flex-1 min-w-[100px] py-3 rounded vt-display-tight text-4xl leading-none tracking-tighter transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--vt-ink-dim)',
            border: '1px solid var(--vt-rule-strong)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--vt-ink-mute)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--vt-rule-strong)')}
        >
          L
        </button>

        {/* OT toggle — lives beside the taps */}
        <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
          <input
            type="checkbox"
            checked={overtime}
            onChange={(e) => setOvertime(e.target.checked)}
            className="accent-[color:var(--vt-red)] w-4 h-4"
          />
          <span className="vt-condensed text-sm tracking-[0.14em] uppercase text-[color:var(--vt-ink-mute)]">
            OT
          </span>
        </label>
      </div>
    </section>
  );
}

export default memo(VestPostGame);
