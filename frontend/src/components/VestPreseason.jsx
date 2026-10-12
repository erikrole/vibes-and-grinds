import { memo } from 'react';
import { seasonTitle } from '../utils/vestSeason';

function VestPreseason({ endYear, priorLabel }) {
  const title = seasonTitle(endYear);
  return (
    <section className="vt-card vt-rail-top vt-preseason mb-6" aria-labelledby="vest-preseason-heading">
      <div className="px-5 sm:px-6 py-5 sm:py-7">
        <p className="vt-label vt-label-red mb-3">Preseason</p>
        <h2 id="vest-preseason-heading" className="vt-display-tight vt-preseason-title">{title}</h2>
        <p className="vt-mono text-sm sm:text-base mt-4 max-w-xl text-[color:var(--vt-ink-dim)] leading-relaxed">
          No {title} games are logged yet. The scoreboard fills in after the first tip.
          {priorLabel ? ` The ${priorLabel} record stays below.` : ''}
        </p>
      </div>
    </section>
  );
}

export default memo(VestPreseason);
