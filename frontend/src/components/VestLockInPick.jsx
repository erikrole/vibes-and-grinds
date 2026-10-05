import { memo, useEffect, useState } from 'react';
import { formatDate, formatLocationLabel } from '../utils/vestTrackerMath';

// Closes the decision loop: lets the user lock in the outfit for the next
// upcoming game without opening the full edit form. Editing here just
// updates the game record's `outfit` field.
function VestLockInPick({ upcomingGame, existingOutfits, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pick, setPick] = useState(upcomingGame?.outfit || '');

  // Keep local state in sync if upstream changes (e.g. user edits via form).
  useEffect(() => {
    setPick(upcomingGame?.outfit || '');
  }, [upcomingGame?.id, upcomingGame?.outfit]);

  if (!upcomingGame) return null;

  const handleSelect = async (next) => {
    setSaving(true); setError('');
    try { await onUpdate(upcomingGame.id, { outfit: next }); setPick(next); }
    catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  const isLocked = Boolean(pick);

  return (
    <section
      className="vt-card mb-6 px-5 py-4"
      style={isLocked ? { borderColor: 'var(--vt-red)' } : undefined}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="vt-label vt-label-red">Tonight&rsquo;s Pick</span>
        <span className="vt-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--vt-ink-mute)]">
          {formatLocationLabel(upcomingGame.location, 'full')} {upcomingGame.opponent}
          {upcomingGame.date ? ` · ${formatDate(upcomingGame.date)}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          disabled={saving}
          aria-label="Outfit for next game"
          value={pick}
          onChange={(e) => handleSelect(e.target.value)}
          className="vt-condensed text-sm uppercase tracking-[0.04em] flex-1 min-w-[200px]"
          style={
            isLocked
              ? { borderColor: 'var(--vt-red)', color: 'var(--vt-ink)' }
              : undefined
          }
        >
          <option value="">— Choose an outfit —</option>
          {existingOutfits.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        {isLocked ? (
          <span
            className="vt-condensed text-xs uppercase tracking-[0.18em] px-3 py-1.5 rounded"
            style={{
              color: 'var(--vt-red)',
              background: 'var(--vt-red-soft)',
              border: '1px solid var(--vt-red)',
            }}
          >
            {saving ? 'Saving…' : 'Saved'}
          </span>
        ) : (
          <span className="vt-label">Awaiting pick</span>
        )}
      </div>
      {error && <p role="alert" className="vt-mono text-sm mt-3">{error}</p>}
    </section>
  );
}

export default memo(VestLockInPick);
