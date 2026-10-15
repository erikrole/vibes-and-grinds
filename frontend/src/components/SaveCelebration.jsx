import { useEffect } from 'react';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const PIECES = Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 90, hue: [24, 38, 16, 48][i % 4], spin: (i * 53) % 360 }));

/** Quick celebration card after a visit is saved. Dismisses itself; tap to close sooner. */
export default function SaveCelebration({ celebration, onClose }) {
  useEffect(() => {
    if (!celebration) return undefined;
    const timer = setTimeout(onClose, celebration.newBadges.length || celebration.milestone ? 6500 : 4200);
    return () => clearTimeout(timer);
  }, [celebration, onClose]);
  if (!celebration) return null;
  const { stop, score, confetti, milestone, newBadges, next } = celebration;
  return (
    <div className="celebrate" role="status" aria-live="polite" onClick={onClose}>
      {confetti && !reduceMotion() && (
        <div className="celebrate__confetti" aria-hidden="true">
          {PIECES.map((p, i) => <i key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}ms`, background: `hsl(${p.hue} 80% 55%)`, '--spin': `${p.spin}deg` }} />)}
        </div>
      )}
      <div className={milestone ? 'celebrate__card is-milestone' : 'celebrate__card'}>
        <p className="celebrate__stop">Stop <b>#{stop}</b></p>
        {milestone && <p className="celebrate__line">{milestone} stops. That is a lot of coffee.</p>}
        {Number.isFinite(score) && score > 0 && <p className="celebrate__score">{score % 1 ? score.toFixed(1) : score} <small>/ 20{confetti ? ' · what a cup' : ''}</small></p>}
        {newBadges.map((b) => <p key={b.id} className="celebrate__badge"><span aria-hidden="true">{b.icon}</span> New badge: {b.name}{b.tier ? ` (${b.tier})` : ''}</p>)}
        {!newBadges.length && next && <p className="celebrate__next"><span aria-hidden="true">{next.icon}</span> {next.remaining} more to level up {next.name}</p>}
      </div>
    </div>
  );
}
