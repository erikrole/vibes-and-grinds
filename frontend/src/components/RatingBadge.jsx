import { getRatingColor, getTextColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const bgColor = getRatingColor(rating);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center flex-1 max-w-[120px]">
      <span className="text-xs text-stone-500 dark:text-stone-400 mb-2 font-medium tracking-widest uppercase">{label}</span>
      <div
        className="w-full px-4 py-3 rounded-md font-bold text-2xl flex items-center justify-center border border-stone-200 dark:border-stone-700 rating-number min-w-[75px]"
        style={{
          backgroundColor: bgColor,
          color: textColor
        }}
      >
        {rating.toFixed(1)}
      </div>
    </div>
  );
}
