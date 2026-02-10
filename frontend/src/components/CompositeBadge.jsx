import { getCompositeColor, getTextColor } from '../utils/colors';

export default function CompositeBadge({ composite }) {
  const bgColor = getCompositeColor(composite);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center flex-1 max-w-[120px]">
      <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Total</span>
      <div
        className="w-full px-4 py-3 rounded-md font-bold text-2xl flex items-center justify-center border-2 rating-number min-w-[75px]"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: `${bgColor}dd`
        }}
      >
        {composite.toFixed(1)}
      </div>
    </div>
  );
}
