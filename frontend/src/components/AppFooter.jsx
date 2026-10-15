import { APP_MODES } from '../appMode';

export default function AppFooter({ appMode }) {
  return (
    <footer className={`mt-16 py-10 text-center transition-colors ${
      appMode === APP_MODES.VEST
        ? 'border-t border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm'
        : ''
    }`}>
      {appMode === APP_MODES.VIBES ? (
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Built for logging AJ Harrison's road coffee orders
        </p>
      ) : (
        <p>Built for charting AJ's sideline fits and results</p>
      )}
    </footer>
  );
}
