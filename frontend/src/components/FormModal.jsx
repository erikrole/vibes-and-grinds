export default function FormModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1001] overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="animate-modal-in relative bg-white dark:bg-stone-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-stone-200/60 dark:border-stone-700/60"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all"
            aria-label={`Close ${title}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-5 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
