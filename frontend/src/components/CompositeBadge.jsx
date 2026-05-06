import { getCompositeColor } from '../utils/colors';

export default function CompositeBadge({ composite }) {
  const accent = getCompositeColor(composite);

  return (
    <div className="flex flex-col items-center min-w-0 px-2">
      <span className="eyebrow mb-1.5 text-[0.65rem]">Total</span>
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
          aria-label="Total composite rating"
          aria-valuenow={composite}
          aria-valuemin={0}
          aria-valuemax={20}
        >
          {composite.toFixed(1)}
        </span>
        <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">/ 20</span>
      </div>
      <div
        className="mt-1.5 h-[3px] rounded-full"
        style={{ backgroundColor: accent, width: '1.75rem' }}
      />
    </div>
  );
}
