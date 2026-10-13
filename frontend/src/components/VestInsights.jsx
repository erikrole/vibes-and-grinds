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

function VestInsights({ games, briefs, lucky, halftime, maxMargin, coffeeTieIn = null }) {
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

      {coffeeTieIn}

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

    </div>
  );
}

export function CoffeeTieIn({ coffee, status, hasGames, outfitFiltered }) {
  return (
    <section className="vp-section" aria-labelledby="vest-coffee-heading">
      <div className="vp-section-head vp-coffee-head">
        <div>
          <p className="vp-kicker vp-kicker-ink">Just for fun</p>
          <h2 id="vest-coffee-heading">Coffee days</h2>
        </div>
        <p className="vp-section-note">
          Same date in the coffee journal. Small sample.
          {outfitFiltered ? ' Ignores the outfit filter.' : ''}
        </p>
      </div>
      <CoffeeTieInBody coffee={coffee} status={status} hasGames={hasGames} />
    </section>
  );
}

function CoffeeTieInBody({ coffee, status, hasGames }) {
  if (status === 'loading') {
    return <p className="vp-coffee-note">Checking the coffee journal.</p>;
  }
  if (status === 'error') {
    return <p className="vp-coffee-note">The coffee journal didn’t load.</p>;
  }
  if (!hasGames) {
    return <p className="vp-coffee-note">No completed games this season to match.</p>;
  }
  if (!coffee?.days) {
    return <p className="vp-coffee-note">No journal entry shares a date with a completed game.</p>;
  }

  const { withRecord, withoutRecord, goToCafe } = coffee;
  return (
    <>
      <ul className="vp-splits vp-coffee-stats">
        <li className="vp-split">
          <span className="vp-kicker vp-kicker-ink">On coffee days</span>
          <strong><Record wins={withRecord.wins} losses={withRecord.losses} /></strong>
          <span className="vp-coffee-meta">
            {countLabel(coffee.days, 'game day', 'game days')}
            {coffee.withMargin ? (
              <>
                {' '}· margin <span className={coffee.withMargin.avg >= 0 ? 'is-win' : 'is-loss'}>{signed(coffee.withMargin.avg)}</span>
              </>
            ) : null}
          </span>
        </li>
        <li className="vp-split">
          <span className="vp-kicker vp-kicker-ink">No coffee log</span>
          <strong><Record wins={withoutRecord.wins} losses={withoutRecord.losses} /></strong>
          <span className="vp-coffee-meta">{countLabel(withoutRecord.games, 'game day', 'game days')}</span>
        </li>
        <li className="vp-split">
          <span className="vp-kicker vp-kicker-ink">Go-to café</span>
          {goToCafe ? (
            <>
              <strong className="vp-cafe-name">{goToCafe.shop}</strong>
              <span className="vp-coffee-meta">
                <Record wins={goToCafe.wins} losses={goToCafe.losses} />
                {' '}· {countLabel(goToCafe.games, 'game day', 'game days')}
                {goToCafe.games <= 3 ? ' · small sample' : ''}
              </span>
            </>
          ) : coffee.tiedCafes?.length ? (
            <>
              <strong className="vp-cafe-name">{cafeList(coffee.tiedCafes)}</strong>
              <span className="vp-coffee-meta">
                Tied at {countLabel(coffee.tiedCafes[0].games, 'game day', 'game days')}. No single go-to.
              </span>
            </>
          ) : (
            <>
              <strong className="vp-cafe-name">—</strong>
              <span className="vp-coffee-meta">No café on more than one game day.</span>
            </>
          )}
        </li>
      </ul>
      <p className="vp-coffee-note">
        {travelNote(coffee)} The journal stores a date, not a tip time.
      </p>
      {coffee.repeatOrder ? (
        <p className="vp-coffee-note">
          Repeat order: {coffee.repeatOrder.order},{' '}
          <Record wins={coffee.repeatOrder.wins} losses={coffee.repeatOrder.losses} />
          {' '}in {countLabel(coffee.repeatOrder.games, 'game', 'games')}.
        </p>
      ) : null}
    </>
  );
}

function travelNote(coffee) {
  if (coffee.homeCoffee === 0) {
    const days = coffee.days === 1
      ? 'The coffee day was a road or neutral trip.'
      : `All ${coffee.days} coffee days were road or neutral trips.`;
    return `${days} No home game has a coffee log.`;
  }
  if (coffee.awayOrNeutral === 0) {
    return coffee.days === 1 ? 'The coffee day was a home game.' : `All ${coffee.days} coffee days were home games.`;
  }
  return `${coffee.awayOrNeutral} of ${coffee.days} coffee days were road or neutral.`;
}

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function cafeList(cafes) {
  const names = cafes.slice(0, 3).map((cafe) => cafe.shop);
  const extra = cafes.length > 3 ? ` and ${cafes.length - 3} more` : '';
  return `${names.join(', ')}${extra}`;
}

function Half({ label, value, tone }) {
  return (
    <li>
      <span className="vp-kicker vp-kicker-ink">{label}</span>
      <strong className={tone === 'win' ? 'is-win' : tone === 'loss' ? 'is-loss' : ''}>{value}</strong>
    </li>
  );
}

function signed(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export default memo(VestInsights);
