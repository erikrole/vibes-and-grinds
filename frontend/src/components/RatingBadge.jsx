import { getRatingColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const accent = getRatingColor(rating);

  return (
    <div className="flex flex-col items-center min-w-0 px-2">
      <span className="eyebrow mb-1.5 text-[0.65rem]">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-3xl sm:text-4xl tabular-nums"
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
          role="meter"
          aria-label={`${label} rating`}
          aria-valuenow={rating}
          aria-valuemin={0}
          aria-valuemax={maxRating}
        >
          {rating.toFixed(1)}
        </span>
      </div>
      <div
        className="mt-1.5 h-[3px] rounded-full"
        style={{ backgroundColor: accent, width: '1.75rem' }}
      />
    </div>
  );
}
