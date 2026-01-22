import { getCompositeColor, getTextColor } from '../utils/colors';

export default function CompositeBadge({ composite }) {
  const bgColor = getCompositeColor(composite);
  const textColor = getTextColor(bgColor);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Total</span>
      <div
        className="px-6 py-4 rounded-md font-black text-3xl min-w-[95px] text-center border-2 tabular-nums"
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
