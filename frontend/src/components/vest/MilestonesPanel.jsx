export default function MilestonesPanel({ milestones }) {
  if (!milestones.length) return null;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
        Season Storylines
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {milestones.map((m, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm text-stone-700 dark:text-stone-200"
          >
            <span className="text-base shrink-0">{m.icon}</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
