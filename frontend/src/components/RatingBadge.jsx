import { getRatingColor, getTextColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const bgColor = getRatingColor(rating);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">{label}</span>
      <div
        className="px-5 py-2.5 rounded-md font-bold text-lg min-w-[70px] text-center border border-stone-200"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {rating.toFixed(1)}
      </div>
    </div>
  );
}
