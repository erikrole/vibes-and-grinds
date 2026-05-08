/**
 * Renders the active toast from a useToast() bag. Tap to dismiss; if the
 * toast carries an `onUndo` callback, taps invoke it before dismissing.
 */
export default function Toast({ bag }) {
  if (!bag.toast) return null;
  const { toast, exiting, dismiss } = bag;

  const handleClick = () => {
    if (toast.onUndo) {
      toast.onUndo();
      dismiss();
    } else {
      dismiss();
    }
  };

  const tone =
    toast.type === 'error'
      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200';

  return (
    <div
      className={`fixed top-4 right-4 z-[1004] ${exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      onClick={handleClick}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm cursor-pointer select-none transition-opacity hover:opacity-80 ${tone}`}
      >
        <span>{toast.onUndo ? 'Visit deleted.' : toast.message}</span>
        {toast.onUndo && <span className="font-semibold underline underline-offset-2">Undo</span>}
      </div>
    </div>
  );
}
