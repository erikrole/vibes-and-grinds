import {
  CONFIDENCE_COLORS,
  CONFIDENCE_LABELS,
  CONFIDENCE_LABEL_COLORS,
  formatLocationLabel,
  formatVestDate,
} from '../../utils/vestStats';

export default function ScoutingReport({ report, vestAdvisor }) {
  if (!report) return null;

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
        Scouting Report
      </h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
        Next up: {formatLocationLabel(report.location, 'full')} {report.opponent}
        {report.date ? ` on ${formatVestDate(report.date)}` : ''}
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        {report.netRank && (
          <Stat label="NET Rank" value={`#${report.netRank}`} />
        )}
        {report.quadrant && (
          <Stat
            label="Quadrant"
            value={`Q${report.quadrant}`}
            highlight={report.quadrant <= 2}
          />
        )}
        {report.allTimeRecord && (
          <Stat
            label={`All-time vs ${report.opponent}`}
            value={`${report.allTimeRecord.wins}-${report.allTimeRecord.losses}`}
          />
        )}
      </div>

      {vestAdvisor.length > 0 && report.quadrant && (
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 mb-2">
            Vest Advisor — Q{report.quadrant}{' '}
            {formatLocationLabel(report.location, 'adjective')} confidence
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {vestAdvisor.map((a) => (
              <div
                key={a.outfit}
                className={`rounded-xl border px-3 py-2 text-sm ${CONFIDENCE_COLORS[a.confidence]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">
                    {a.outfit}
                  </span>
                  <span className={`text-xs font-bold ${CONFIDENCE_LABEL_COLORS[a.confidence]}`}>
                    {CONFIDENCE_LABELS[a.confidence]}
                  </span>
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Q{report.quadrant}: {a.qRecord}
                  {a.locRecord &&
                    ` • ${formatLocationLabel(report.location, 'Adjective')}: ${a.locRecord}`}
                  {a.form === 'hot' ? ' • 🔥' : a.form === 'cold' ? ' • ❄️' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 px-3 py-2 text-sm">
      <span className="text-xs text-stone-500 dark:text-stone-400 block">{label}</span>
      <span
        className={`font-bold ${
          highlight ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
