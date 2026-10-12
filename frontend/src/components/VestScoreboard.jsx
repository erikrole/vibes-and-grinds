import { memo } from 'react';

function VestScoreboard({
  wins,
  losses,
  streak,
  secondary,
  filterLabel,
  onClearFilter,
  status,
}) {
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <div className="vp-score" aria-label="Season record">
      <div>
        <p className="vp-display vp-score-num">
          {wins}<span>–</span>{losses}
        </p>
        <p className="vp-kicker vp-kicker-ink">
          {filterLabel ? `${filterLabel} record` : 'Season record'}
          {winPct != null ? ` · ${winPct}%` : ''}
        </p>
      </div>
      {(secondary?.length > 0 || (streak && streak.count >= 2) || status?.kind === 'next') && (
        <ul className="vp-splits">
          {secondary?.map((pill) => (
            <li key={pill.label} className="vp-split">
              <span className="vp-kicker vp-kicker-ink">{pill.label}</span>
              <strong>{pill.value}</strong>
            </li>
          ))}
          {streak && streak.count >= 2 && (
            <li className="vp-split">
              <span className="vp-kicker vp-kicker-ink">{streak.result === 'W' ? 'Win streak' : 'Loss streak'}</span>
              <strong>{streak.count}</strong>
            </li>
          )}
          {status?.kind === 'next' && (
            <li className="vp-split">
              <span className="vp-kicker vp-kicker-ink">Next</span>
              <strong className="vp-split-note">{status.label}{status.date ? ` · ${status.date}` : ''}</strong>
            </li>
          )}
        </ul>
      )}
      {filterLabel && (
        <button type="button" onClick={onClearFilter} className="vp-text-btn">
          Clear {filterLabel}
        </button>
      )}
    </div>
  );
}

export default memo(VestScoreboard);
