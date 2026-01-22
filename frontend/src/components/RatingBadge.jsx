import { getRatingColor, getTextColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const bgColor = getRatingColor(rating);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">{label}</span>
      <div
        className="px-5 py-3 rounded-md font-black text-2xl min-w-[75px] text-center border border-stone-200 tabular-nums"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {rating.toFixed(1)}
      </div>
    </div>
  );
}
