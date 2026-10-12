import { memo } from 'react';
import { formatDate, formatLocationLabel } from '../utils/vestTrackerMath';
import { outfitSampleNote } from '../utils/vestTrackerMath';

export function Record({ wins, losses, className = '' }) {
  return (
    <span className={`vp-record ${className}`.trim()}>
      <span className="is-win">{wins}</span>
      <span className="vp-dash">–</span>
      <span className="is-loss">{losses}</span>
    </span>
  );
}

function splitText(record) {
  if (!record?.games) return '—';
  return `${record.wins}–${record.losses}`;
}

function VestInsights({ games, briefs, lucky, halftime, coffee, maxMargin }) {
  const done = (games || []).filter((game) => game.result === 'W' || game.result === 'L');
  if (!done.length) return null;
  const wins = done.filter((game) => game.result === 'W').length;
  const scale = Math.max(1, maxMargin || 1);

  return (
    <div className="vp-insights">
      <section className="vp-section" aria-labelledby="vest-strip-heading">
        <div className="vp-section-head">
          <h2 id="vest-strip-heading">Season line</h2>
          <p className="vp-section-note">Oldest first. {wins}–{done.length - wins}.</p>
        </div>
        <div
          className="vp-strip"
          role="img"
          aria-label={`Season results, oldest first: ${wins} wins and ${done.length - wins} losses.`}
        >
          {done.map((game) => (
            <span
              key={game.id}
              className={game.result === 'W' ? 'is-w' : 'is-l'}
              title={`${game.result === 'W' ? 'Win' : 'Loss'}, ${formatLocationLabel(game.location, 'full')} ${game.opponent}, ${formatDate(game.date) || game.date}`}
            >
              {game.result}
            </span>
          ))}
        </div>
      </section>

      {lucky && (
        <p className="vp-callout">
          <span className="vp-kicker vp-kicker-ink">Lucky outfit</span>
          <strong>{lucky.outfit}</strong>
          <Record wins={lucky.wins} losses={lucky.losses} />
          <span>
            Best win rate in at least three games.
            {lucky.margin ? ` Average margin ${signed(lucky.margin.avg)}.` : ''}
            {lucky.smallSample || outfitSampleNote(lucky.games) ? ' Small sample.' : ''}
          </span>
        </p>
      )}

      {briefs?.some((brief) => brief.margin) && (
        <section className="vp-section" aria-labelledby="vest-margin-heading">
          <div className="vp-section-head">
            <h2 id="vest-margin-heading">Margin by outfit</h2>
            <p className="vp-section-note">Average final margin. Wisconsin’s score minus the opponent.</p>
          </div>
          <ul className="vp-margins">
            {briefs.filter((brief) => brief.margin).sort((a, b) => b.games - a.games || a.outfit.localeCompare(b.outfit)).map((brief) => {
              const avg = brief.margin.avg;
              const width = Math.max(8, Math.round((Math.abs(avg) / scale) * 100));
              return (
                <li key={brief.outfit}>
                  <span className="vp-margin-name">{brief.outfit}</span>
                  <span className="vp-margin-track" aria-hidden="true">
                    <span className={avg >= 0 ? 'is-w' : 'is-l'} style={{ width: `${width}%` }} />
                  </span>
                  <span className={avg >= 0 ? 'is-win' : 'is-loss'}>{signed(avg)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {halftime && (
        <section className="vp-section" aria-labelledby="vest-half-heading">
          <div className="vp-section-head">
            <h2 id="vest-half-heading">First half, then the final</h2>
            <p className="vp-section-note">{halftime.games} games with a halftime score.</p>
          </div>
          <ul className="vp-halves">
            <Half label="Led, won" value={halftime.ledWon} tone="win" />
            <Half label="Led, lost" value={halftime.ledLost} tone="loss" />
            <Half label="Trailed, won" value={halftime.trailedWon} tone="win" />
            <Half label="Trailed, lost" value={halftime.trailedLost} tone="loss" />
            {(halftime.tiedWon + halftime.tiedLost) > 0 && (
              <Half label="Tied at half" value={`${halftime.tiedWon}–${halftime.tiedLost}`} />
            )}
          </ul>
        </section>
      )}

      {coffee && <CoffeeBrief coffee={coffee} />}
    </div>
  );
}

function Half({ label, value, tone }) {
  return (
    <li>
      <span className="vp-kicker vp-kicker-ink">{label}</span>
      <strong className={tone === 'win' ? 'is-win' : tone === 'loss' ? 'is-loss' : ''}>{value}</strong>
    </li>
  );
}

function CoffeeBrief({ coffee }) {
  const { withRecord, withoutRecord } = coffee;
  return (
    <section className="vp-section" aria-labelledby="vest-coffee-heading">
      <div className="vp-section-head">
        <h2 id="vest-coffee-heading">Coffee on game day</h2>
        <p className="vp-section-note">Same calendar day in the coffee journal. Read only.</p>
      </div>
      <div className="vp-coffee">
        <p>
          <Record wins={withRecord.wins} losses={withRecord.losses} />
          {' '}on {coffee.days} game {coffee.days === 1 ? 'day' : 'days'} with a coffee log
          {coffee.withMargin ? ` · margin ${signed(coffee.withMargin.avg)}` : ''}.
          {' '}Days with no log: <Record wins={withoutRecord.wins} losses={withoutRecord.losses} />
          {coffee.withoutMargin ? ` · margin ${signed(coffee.withoutMargin.avg)}` : ''}.
        </p>
        <p>
          {coffee.homeCoffee === 0
            ? `All ${coffee.days} coffee days were road or neutral trips. Home games have no coffee log, so the gap tracks travel more than the drink.`
            : `${coffee.awayOrNeutral} of ${coffee.days} coffee days were road or neutral.`}
          {' '}Small sample.
        </p>
        {coffee.repeatOrder && (
          <p>
            Repeat order: {coffee.repeatOrder.order},{' '}
            <Record wins={coffee.repeatOrder.wins} losses={coffee.repeatOrder.losses} />
            {' '}in {coffee.repeatOrder.games} games. Small sample.
          </p>
        )}
        <p>
          {coffee.repeatShop
            ? `${coffee.repeatShop.shop} is the only cafe logged on more than one game day.`
            : 'No cafe is logged on more than one game day.'}
        </p>
      </div>
    </section>
  );
}

function signed(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export default memo(VestInsights);
