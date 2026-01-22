import { getRatingColor, getTextColor } from '../utils/colors';

export default function RatingBadge({ rating, label, maxRating = 10 }) {
  const bgColor = getRatingColor(rating);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500 mb-1 font-medium">{label}</span>
      <div
        className="px-4 py-2 rounded-lg font-bold text-lg min-w-[60px] text-center shadow-sm"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {rating.toFixed(1)}
      </div>
      <span className="text-xs text-gray-400 mt-1">/ {maxRating}</span>
    </div>
  );
}
