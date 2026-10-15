import { useEffect, useMemo, useRef, useState } from 'react';
import { tripLegs } from '../utils/funExtras';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const W = 640;
const H = 320;
const PAD = 28;
const LEG_MS = 1100;

/** Plays the journal back stop by stop on a simple route sketch, with a running mile counter. */
export default function TripReplay({ visits }) {
  const legs = useMemo(() => tripLegs(visits), [visits]);
  const [position, setPosition] = useState(0); // 0..legs.length-1, fractional while playing
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const points = useMemo(() => {
    if (legs.length < 2) return [];
    const lat0 = legs.reduce((s, l) => s + l.lat, 0) / legs.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = legs.map((l) => l.lng * k);
    const ys = legs.map((l) => -l.lat);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((W - PAD * 2) / Math.max(maxX - minX, 0.01), (H - PAD * 2) / Math.max(maxY - minY, 0.01));
    const offX = (W - (maxX - minX) * scale) / 2;
    const offY = (H - (maxY - minY) * scale) / 2;
    return legs.map((l, i) => ({ x: offX + (xs[i] - minX) * scale, y: offY + (ys[i] - minY) * scale }));
  }, [legs]);

  useEffect(() => {
    if (!playing) return undefined;
    const last = legs.length - 1;
    const start = performance.now();
    const from = position >= last ? 0 : position;
    const step = (now) => {
      const next = from + (now - start) / LEG_MS;
      if (next >= last) { setPosition(last); setPlaying(false); return; }
      setPosition(reduceMotion() ? Math.floor(next) : next);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // Restarting only when playback toggles; position is read once as the starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, legs.length]);

  if (legs.length < 2) return null;
  const last = legs.length - 1;
  const whole = Math.min(last, Math.floor(position));
  const frac = position - whole;
  const head = whole >= last ? points[last] : { x: points[whole].x + (points[whole + 1].x - points[whole].x) * frac, y: points[whole].y + (points[whole + 1].y - points[whole].y) * frac };
  const shown = [...points.slice(0, whole + 1), head];
  const miles = Math.round(legs[whole].miles + (whole < last ? (legs[whole + 1].miles - legs[whole].miles) * frac : 0));
  const stop = legs[Math.round(position)] || legs[whole];

  return (
    <section className="trip-replay" aria-label="Road-trip replay">
      <div className="trip-replay__bar">
        <button type="button" className="btn-secondary" onClick={() => { if (!playing && position >= last) setPosition(0); setPlaying((p) => !p); }}>{playing ? 'Pause' : position >= last ? 'Replay trip' : 'Play trip'}</button>
        <label className="trip-replay__scrub"><span className="sr-only">Stop</span>
          <input type="range" min="0" max={last} step="0.01" value={position} onChange={(e) => { setPlaying(false); setPosition(Number(e.target.value)); }} />
        </label>
        <strong className="trip-replay__miles" aria-live="off">{miles.toLocaleString()} mi</strong>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Route through ${legs.length} stops, ${legs[last].miles.toLocaleString()} straight-line miles`}>
        <polyline className="trip-line" points={shown.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
        {points.map((p, i) => <circle key={legs[i].id ?? i} cx={p.x} cy={p.y} r={i <= whole ? 4 : 2.5} className={i <= whole ? 'trip-dot is-on' : 'trip-dot'} />)}
        <circle cx={head.x} cy={head.y} r="7" className="trip-head" />
      </svg>
      <p className="trip-replay__now">{stop.name}{stop.city ? ` · ${stop.city}` : ''} · {stop.date}</p>
    </section>
  );
}
