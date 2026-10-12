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
        <p className="vp-score-num">
          <span className="is-win">{wins}</span>
          <span className="vp-dash">–</span>
          <span className="is-loss">{losses}</span>
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
              <strong>
                {pill.wins != null
                  ? <><span className="is-win">{pill.wins}</span><span className="vp-dash">–</span><span className="is-loss">{pill.losses}</span></>
                  : pill.value}
              </strong>
            </li>
          ))}
          {streak && streak.count >= 2 && (
            <li className="vp-split">
              <span className="vp-kicker vp-kicker-ink">{streak.result === 'W' ? 'Win streak' : 'Loss streak'}</span>
              <strong className={streak.result === 'W' ? 'is-win' : 'is-loss'}>{streak.count}</strong>
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
