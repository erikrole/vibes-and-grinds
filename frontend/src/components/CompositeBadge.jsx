import { getCompositeColor, getTextColor } from '../utils/colors';

export default function CompositeBadge({ composite }) {
  const bgColor = getCompositeColor(composite);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500 mb-1 font-medium">Total</span>
      <div
        className="px-5 py-3 rounded-xl font-bold text-2xl min-w-[80px] text-center shadow-md"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {composite.toFixed(1)}
      </div>
      <span className="text-xs text-gray-400 mt-1">/ 20</span>
    </div>
  );
}
