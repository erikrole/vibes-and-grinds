import { useState } from 'react';

/** Superlative cards that flip open on tap or Enter. */
export default function AwardsGrid({ awards, onVisitClick }) {
  const [open, setOpen] = useState(() => new Set());
  if (!awards.length) return null;
  const toggle = (id) => setOpen((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <section className="fun-awards" aria-label="Awards">
      <h3>Awards</h3>
      <ul>
        {awards.map((award, index) => {
          const flipped = open.has(award.id);
          return (
            <li key={award.id} style={{ '--i': index }}>
              <button type="button" className={flipped ? 'award-card is-flipped' : 'award-card'} aria-pressed={flipped} onClick={() => toggle(award.id)}>
                <span className="award-face award-front"><b>{award.title}</b><small>Tap to reveal</small></span>
                <span className="award-face award-back"><small>{award.title}</small><strong>{award.headline}</strong><em>{award.detail}</em></span>
              </button>
              {flipped && onVisitClick && <button type="button" className="text-action award-open" onClick={() => onVisitClick(award.visit)}>Open visit</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
