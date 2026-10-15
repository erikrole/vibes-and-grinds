import { useEffect, useMemo, useRef, useState } from 'react';
import { computeFunStats, RATING_BINS, WEEKDAYS } from '../utils/funStats';
import { formatDate } from '../utils/dates';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view; stays true so animations play once. */
function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined' || reducedMotion());
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Counts from 0 to `value` with an ease-out once `active` flips on. */
function useCountUp(value, active, duration = 1100) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  useEffect(() => {
    if (!active) return undefined;
    if (reducedMotion()) { setShown(value); return undefined; }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active, duration]);
  return shown;
}

function Counter({ value, active, decimals = 0 }) {
  const shown = useCountUp(value, active);
  return <>{decimals ? shown.toFixed(decimals) : Math.round(shown).toLocaleString()}</>;
}

function Card({ title, delay = 0, seen, className = '', children }) {
  return (
    <article className={`fs-card ${seen ? 'is-in' : ''} ${className}`} style={{ '--fs-delay': `${delay}ms` }}>
      <p className="fs-eyebrow">{title}</p>
      {children}
    </article>
  );
}

function Bars({ values, labels, seen, highlight }) {
  const max = Math.max(1, ...values);
  return (
    <div className="fs-bars" role="img" aria-label={labels.map((label, i) => `${label}: ${values[i]}`).join(', ')}>
      {values.map((value, i) => (
        <div key={labels[i]} className={`fs-bar ${i === highlight ? 'is-top' : ''}`}>
          <span className="fs-bar-count">{value || ''}</span>
          <span className="fs-bar-fill" style={{ '--fs-h': `${(value / max) * 100}%`, '--fs-i': i }} />
          <span className="fs-bar-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function FunStats({ visits }) {
  const stats = useMemo(() => computeFunStats(visits), [visits]);
  const [ref, seen] = useInView();
  if (!stats) return null;

  const { palate } = stats;
  // Needle position: far left is "all room", far right is "all cup", centered when balanced.
  const needle = Math.max(4, Math.min(96, 50 - palate.gap * 12));
  const topBin = stats.histogram.indexOf(Math.max(...stats.histogram));
  const topDay = stats.weekdays.indexOf(Math.max(...stats.weekdays));
  const leaning = { room: 'Room person', cup: 'Cup person', balanced: 'Perfectly balanced' }[palate.leaning];
  const leaningLine = {
    room: 'You score the vibe higher than the coffee.',
    cup: 'The coffee beats the room, every time.',
    balanced: 'Vibe and coffee land in the same place.',
  }[palate.leaning];

  return (
    <section ref={ref} className="fs" aria-label="Coffee by the numbers">
      <header className="section-intro"><h2>By the numbers</h2><p>Everything AJ has sipped so far.</p></header>

      <div className={`fs-hero ${seen ? 'is-in' : ''}`}>
        <div><strong><Counter value={stats.total} active={seen} /></strong><span>{stats.total === 1 ? 'cup' : 'cups'}</span></div>
        <div><strong><Counter value={stats.shops} active={seen} /></strong><span>{stats.shops === 1 ? 'shop' : 'shops'}</span></div>
        <div><strong><Counter value={stats.cities} active={seen} /></strong><span>{stats.cities === 1 ? 'city' : 'cities'}</span></div>
        {stats.states > 1 && <div><strong><Counter value={stats.states} active={seen} /></strong><span>states</span></div>}
        {stats.miles > 0 && <div><strong><Counter value={stats.miles} active={seen} /></strong><span>road miles</span></div>}
      </div>

      <div className="fs-grid">
        <Card title="Heat check" seen={seen} delay={0} className="fs-wide">
          <div className="fs-dots" aria-hidden="true">
            {stats.lastEight.map((dot, i) => (
              <span key={dot.id ?? i} className={dot.hot ? 'is-hot' : ''} style={{ '--fs-i': i }} />
            ))}
          </div>
          <p className="fs-line">
            {stats.streak.length >= 2
              ? <>Best streak: <strong>{stats.streak.length} in a row</strong> at 8 or better ({formatDate(stats.streak.from, { month: 'short', day: 'numeric' })} to {formatDate(stats.streak.to, { month: 'short', day: 'numeric' })}).</>
              : 'No back-to-back 8s yet. Lit dots are coffee at 8 or better.'}
          </p>
        </Card>

        <Card title="How the cups scored" seen={seen} delay={80}>
          <Bars values={stats.histogram} labels={RATING_BINS} seen={seen} highlight={topBin} />
          <p className="fs-line">Most cups land in the <strong>{RATING_BINS[topBin]}</strong>.</p>
        </Card>

        <Card title="Caffeine calendar" seen={seen} delay={160}>
          <Bars values={stats.weekdays} labels={WEEKDAYS.map((day) => day[0])} seen={seen} highlight={topDay} />
          <p className="fs-line">{stats.busiestDay ? <>Most stops happen on <strong>{stats.busiestDay}</strong>.</> : null}</p>
        </Card>

        <Card title="Palate" seen={seen} delay={240}>
          <div className="fs-meter" aria-hidden="true">
            <span className="fs-meter-needle" style={{ '--fs-x': `${needle}%` }} />
          </div>
          <div className="fs-meter-ends"><span>Room</span><span>Cup</span></div>
          <p className="fs-line"><strong>{leaning}.</strong> {leaningLine}</p>
        </Card>

        <Card title="Favorites" seen={seen} delay={320}>
          <dl className="fs-list">
            {stats.topOrder && <div><dt>Go-to order</dt><dd>{stats.topOrder.label} <small>×{stats.topOrder.count}</small></dd></div>}
            {stats.bestCity && <div><dt>Best city</dt><dd>{stats.bestCity.label} <small>{stats.bestCity.total.toFixed(1)}/20</small></dd></div>}
            {stats.bestShop && <div><dt>Best shop</dt><dd>{stats.bestShop.label} <small>{stats.bestShop.total.toFixed(1)}/20</small></dd></div>}
            <div><dt>18+ club</dt><dd><Counter value={stats.perfectTens} active={seen} /> <small>{stats.perfectTens === 1 ? 'visit' : 'visits'} scoring 18 or higher</small></dd></div>
          </dl>
          {!stats.topOrder && !stats.bestCity && !stats.bestShop && <p className="fs-line">Favorites show up once a drink, shop or city repeats.</p>}
        </Card>

        {stats.hotTake && (
          <Card title="Hot take" seen={seen} delay={400} className="fs-wide">
            <p className="fs-take">
              {stats.hotTake.kind === 'room'
                ? <><strong>{stats.hotTake.label}</strong>: great room, so-so cup.</>
                : <><strong>{stats.hotTake.label}</strong>: plain room, great cup.</>}
            </p>
            <p className="fs-line">The biggest gap between vibe and coffee in the journal.</p>
          </Card>
        )}
      </div>
    </section>
  );
}
