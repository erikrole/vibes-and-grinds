import { useCallback, useMemo, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { formatDate, formatLocationLabel, toSuperscript } from '../utils/vestTrackerMath';
import { Record } from './VestInsights';

export default function VestDetailModal({ game, outfit, games, onClose, onEditGame, onFilterOutfit }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useFocusTrap(panelRef, { onEscape: handleClose, initialFocusRef: closeRef });

  const outfitGames = useMemo(
    () => outfit ? games.filter((entry) => entry.outfit === outfit.outfit && (entry.result === 'W' || entry.result === 'L')) : [],
    [games, outfit]
  );

  return (
    <div className="dialog-shell vest-tracker" role="dialog" aria-modal="true" aria-labelledby="vest-detail-title">
      <button className="dialog-backdrop" onClick={handleClose} aria-label="Close details" />
      <div className="dialog-positioner">
        <section ref={panelRef} className="dialog-panel max-w-2xl overflow-y-auto vt-detail-panel">
          <header className="vt-section-head sticky top-0 z-10 bg-[color:var(--vt-card)]">
            <span className="vt-label vt-label-red">{game ? 'Game Detail' : 'Outfit Detail'}</span>
            <button ref={closeRef} type="button" onClick={handleClose} className="vt-label hover:text-[color:var(--vt-ink)]">Close</button>
          </header>
          {game ? (
            <GameDetail game={game} onEdit={onEditGame ? () => { onClose(); onEditGame(game); } : undefined} />
          ) : (
            <OutfitDetail outfit={outfit} games={outfitGames} onFilter={() => { onFilterOutfit(outfit.outfit); onClose(); }} />
          )}
        </section>
      </div>
    </div>
  );
}

function GameDetail({ game, onEdit }) {
  const pending = game.result !== 'W' && game.result !== 'L';
  return (
    <div className="p-5 sm:p-7">
      <p className="vt-label">{formatDate(game.date) || 'Date TBD'}</p>
      <h2 id="vest-detail-title" className="vt-display-tight text-3xl sm:text-4xl mt-2 uppercase">
        {formatLocationLabel(game.location, 'short')} {game.ranking ? <span className="text-[color:var(--vt-red)]">{toSuperscript(game.ranking)}</span> : null}{game.opponent}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
        <DetailMetric label="Result" value={pending ? 'TBD' : game.result} tone={game.result === 'W' ? 'win' : game.result === 'L' ? 'loss' : ''} />
        <DetailMetric label="Outfit" value={game.outfit || 'TBD'} />
        <DetailMetric label="Location" value={formatLocationLabel(game.location, 'adjective')} />
        <DetailMetric label="Context" value={[game.quadrant ? `Q${game.quadrant}` : null, game.overtime ? 'OT' : null].filter(Boolean).join(' · ') || 'Regular'} />
      </div>
      <div className="mt-6 pt-5 border-t border-[color:var(--vt-rule)] flex justify-end">
        {onEdit && <button type="button" onClick={onEdit} className="vt-btn-primary">Edit game</button>}
      </div>
    </div>
  );
}

function OutfitDetail({ outfit, games, onFilter }) {
  if (!outfit) return null;
  return (
    <div className="p-5 sm:p-7">
      <p className="vt-label">Outfit record</p>
      <h2 id="vest-detail-title" className="vt-display-tight text-3xl sm:text-4xl mt-2 uppercase">{outfit.outfit}</h2>
      <p className="vt-mono text-sm text-[color:var(--vt-ink-mute)] mt-2">{outfit.games} completed {outfit.games === 1 ? 'game' : 'games'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
        <DetailMetric label="Record" value={<Record wins={outfit.wins} losses={outfit.losses} />} />
        <DetailMetric label="Raw win rate" value={`${outfit.winRatePct}%`} />
        <DetailMetric label="Games" value={outfit.games} />
        <DetailMetric label="Road record" value={<Record wins={outfit.roadWins || 0} losses={outfit.roadLosses || 0} />} />
      </div>
      <div className="mt-6">
        <p className="vt-label mb-2">Game history</p>
        <div className="divide-y divide-[color:var(--vt-rule)] border-y border-[color:var(--vt-rule)]">
          {[...games].reverse().map((entry) => (
            <div key={entry.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 py-3 items-center">
              <strong className={`vp-mini-result ${entry.result === 'W' ? 'is-w' : 'is-l'}`}>{entry.result}</strong>
              <span className="vt-condensed uppercase truncate">{formatLocationLabel(entry.location, 'short')} {entry.opponent}</span>
              <small className="vt-mono text-[10px] text-[color:var(--vt-ink-faint)]">{formatDate(entry.date)}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end"><button type="button" onClick={onFilter} className="vt-btn-primary">Filter Dashboard</button></div>
    </div>
  );
}

function DetailMetric({ label, value, tone }) {
  const toneClass = tone === 'win' ? 'is-win' : tone === 'loss' ? 'is-loss' : '';
  return <div className="vt-card-inset p-3 min-w-0"><span className="vt-label text-[9px] block">{label}</span><strong className={`text-xl sm:text-2xl mt-1 block truncate ${toneClass}`}>{value}</strong></div>;
}
