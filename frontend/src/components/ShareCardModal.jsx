import { useEffect, useRef, useState } from 'react';
import { generateShareCard, shareCardBlob, downloadCardBlob, canShareCard } from '../utils/shareCard';
import useFocusTrap from '../hooks/useFocusTrap';

export default function ShareCardModal({ visit, onClose }) {
  const modalRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const blobRef = useRef(null);

  useFocusTrap(modalRef, { onEscape: onClose });

  useEffect(() => {
    let cancelled = false;
    let url = null;
    (async () => {
      try {
        const blob = await generateShareCard(visit);
        if (cancelled || !blob) {
          if (!cancelled) setStatus('error');
          return;
        }
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setShareSupported(canShareCard(blob, visit));
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [visit]);

  const handleShare = async () => {
    if (!blobRef.current) return;
    setBusy(true);
    try {
      await shareCardBlob(blobRef.current, visit);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!blobRef.current) return;
    downloadCardBlob(blobRef.current, visit);
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Share card for ${visit.coffee_shop_name}`}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 p-6 sm:p-7"
        style={{ backgroundColor: 'var(--paper-2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-xl"
            style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}
          >
            Share card
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-2 -m-2 rounded-xl transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: '1080 / 1350', backgroundColor: 'var(--paper-tint)' }}
        >
          {status === 'ready' && previewUrl && (
            <img src={previewUrl} alt={`Share card preview for ${visit.coffee_shop_name}`} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin" />
              <span className="text-sm text-stone-500 dark:text-stone-400">Generating card…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="text-sm text-stone-500 dark:text-stone-400">Couldn’t generate the card. Please try again.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          {shareSupported && (
            <button
              onClick={handleShare}
              disabled={status !== 'ready' || busy}
              className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--ink)', color: 'var(--paper)' }}
            >
              {busy ? 'Sharing…' : 'Share'}
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={status !== 'ready'}
            className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50"
            style={
              shareSupported
                ? { backgroundColor: 'var(--paper-tint)', color: 'var(--ink)' }
                : { backgroundColor: 'var(--ink)', color: 'var(--paper)' }
            }
          >
            Download PNG
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
