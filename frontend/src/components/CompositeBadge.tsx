import { getCompositeColor, getTextColor } from '../utils/colors';

interface Props {
  composite: number;
}

export default function CompositeBadge({ composite }: Props) {
  const bgColor = getCompositeColor(composite);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center flex-1 min-w-0 max-w-[120px]">
      <span className="text-xs text-stone-500 dark:text-stone-400 mb-2 font-medium tracking-widest uppercase">Total</span>
      <div
        className="w-full px-3 sm:px-4 py-3 rounded-xl font-bold text-xl sm:text-2xl flex items-center justify-center border-2 rating-number min-w-0 transition-shadow"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: `${bgColor}dd`,
          boxShadow: `0 4px 12px ${bgColor}50`,
        }}
        role="meter"
        aria-label="Total composite rating"
        aria-valuenow={composite}
        aria-valuemin={0}
        aria-valuemax={20}
      >
        {composite.toFixed(1)}
      </div>
    </div>
  );
}
