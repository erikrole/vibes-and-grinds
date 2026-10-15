/** 50-state grid that lights up as states are logged. */
export default function StatePassport({ passport }) {
  const visited = passport.filter((s) => s.count);
  return (
    <section className="fun-card fun-passport" aria-label="State passport">
      <h3>State passport</h3>
      <p className="fun-note">{visited.length} of 50 states</p>
      <ul className="passport-grid">
        {passport.map((s, i) => (
          <li key={s.code} className={s.count ? 'is-lit' : undefined} style={{ '--i': i }} title={s.count ? `${s.code}: ${s.count} ${s.count === 1 ? 'stop' : 'stops'}` : s.code}>
            {s.code}<span className="sr-only">{s.count ? `, ${s.count} stops` : ', not yet'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
