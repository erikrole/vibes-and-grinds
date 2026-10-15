export default function AppToast({ toast, exiting, dismiss }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[1004] ${exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      onClick={() => {
        if (toast.onUndo) {
          toast.onUndo();
          dismiss();
        } else {
          dismiss();
        }
      }}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm cursor-pointer select-none transition-opacity hover:opacity-80 ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200'
        }`}
      >
        <span>{toast.onUndo ? 'Visit deleted.' : toast.message}</span>
        {toast.onUndo && (
          <span className="font-semibold underline underline-offset-2">Undo</span>
        )}
      </div>
    </div>
  );
}
