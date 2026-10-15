import { useEffect, useMemo, useRef, useState } from 'react';
import { funStats } from '../utils/funStats';
import { titleCaseOrder } from '../utils/display';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view, so animations play when seen. */
function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => reduceMotion() || typeof IntersectionObserver === 'undefined');
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

function CountUp({ value, play, duration = 1100 }) {
  const [shown, setShown] = useState(reduceMotion() ? value : 0);
  useEffect(() => {
    if (!play) return undefined;
    if (reduceMotion()) { setShown(value); return undefined; }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, value, duration]);
  return <span>{shown.toLocaleString()}</span>;
}

function Bars({ title, note, rows, format = (v) => v, play }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className="fun-card">
      <h3>{title}</h3>
      {note && <p className="fun-note">{note}</p>}
      <ul className="fun-bars">
        {rows.map((row, index) => (
          <li key={row.label} style={{ '--i': index }}>
            <span className="fun-bar-label">{row.label}</span>
            <span className="fun-bar-track"><span className="fun-bar-fill" style={{ width: play ? `${Math.max(4, (row.value / max) * 100)}%` : '0%' }} /></span>
            <span className="fun-bar-value">{format(row.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CoffeeFunStats({ visits }) {
  const stats = useMemo(() => funStats(visits), [visits]);
  const [ref, play] = useInView();
  if (!stats.stops) return null;

  const tiles = [
    { label: 'Stops logged', value: stats.stops },
    { label: 'Different shops', value: stats.shops },
    { label: 'Cities', value: stats.cities },
    ...(stats.states > 1 ? [{ label: 'States', value: stats.states }] : []),
    ...(stats.legMiles ? [{ label: 'Road miles, as the crow flies', value: stats.legMiles }] : []),
    ...(stats.perfectTens ? [{ label: 'Perfect 10 cups', value: stats.perfectTens }] : []),
  ];

  return (
    <section className="fun-stats" ref={ref} aria-label="Fun coffee stats">
      <header className="section-intro"><h2>Coffee by the numbers</h2><p>Just for fun, counted from the journal.</p></header>
      <ul className="fun-tiles">
        {tiles.map((tile, index) => (
          <li key={tile.label} className={play ? 'fun-tile is-in' : 'fun-tile'} style={{ '--i': index }}>
            <strong><CountUp value={tile.value} play={play} /></strong>
            <span>{tile.label}</span>
          </li>
        ))}
      </ul>
      <div className="fun-facts">
        {stats.farthest && <p className="fun-fact"><span aria-hidden="true">📍</span> Farthest cup: <b>{stats.farthest.shop}</b>{stats.farthest.city ? `, ${stats.farthest.city}` : ''}, about {stats.farthest.miles.toLocaleString()} miles from Madison.</p>}
        {stats.topOrder && <p className="fun-fact"><span aria-hidden="true">☕</span> Go-to order: <b>{titleCaseOrder(stats.topOrder.order)}</b>, {stats.topOrder.count} {stats.topOrder.count === 1 ? 'time' : 'times'}.</p>}
        {stats.busiestMonth && <p className="fun-fact"><span aria-hidden="true">🗓️</span> Busiest month: <b>{stats.busiestMonth.label}</b> with {stats.busiestMonth.count} {stats.busiestMonth.count === 1 ? 'stop' : 'stops'}.</p>}
      </div>
      <div className="fun-grid">
        {stats.sports.length > 0 && <Bars title="Stops by sport" rows={stats.sports} play={play} />}
        {stats.weekdayCoffee.length > 1 && <Bars title="Best coffee day" note="Average coffee rating by weekday" rows={stats.weekdayCoffee} format={(v) => v.toFixed(1)} play={play} />}
        <Bars title="How the cups rated" note="Coffee rating out of 10" rows={stats.spread} play={play} />
      </div>
    </section>
  );
}
