import { getRatingColor, getTextColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const bgColor = getRatingColor(rating);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center flex-1 min-w-0 max-w-[120px]">
      <span className="text-xs text-stone-500 dark:text-stone-400 mb-2 font-medium tracking-widest uppercase">{label}</span>
      <div
        className="w-full px-3 sm:px-4 py-3 rounded-xl font-bold text-xl sm:text-2xl flex items-center justify-center rating-number min-w-0 transition-shadow"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          boxShadow: `0 2px 8px ${bgColor}40`,
        }}
        role="meter"
        aria-label={`${label} rating`}
        aria-valuenow={rating}
        aria-valuemin={0}
        aria-valuemax={maxRating}
      >
        {rating.toFixed(1)}
      </div>
    </div>
  );
}
