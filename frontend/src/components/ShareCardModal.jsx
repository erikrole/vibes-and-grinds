import { useEffect, useMemo, useRef, useState } from 'react';
import { generateShareCard, shareCardBlob, downloadCardBlob, canShareCard, CARD_FORMATS } from '../utils/shareCard';
import { buildInstagramCaption, copyCaption } from '../utils/instagramCaption';
import useFocusTrap from '../hooks/useFocusTrap';

const FORMAT_OPTIONS = [
  { id: 'post', label: 'Post' },
  { id: 'story', label: 'Story' },
];

export default function ShareCardModal({ visit, onClose }) {
  const modalRef = useRef(null);
  const [format, setFormat] = useState('post');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const blobRef = useRef(null);

  const caption = useMemo(() => buildInstagramCaption(visit), [visit]);

  useFocusTrap(modalRef, { onEscape: onClose });

  useEffect(() => {
    let cancelled = false;
    let url = null;
    setStatus('loading');
    setPreviewUrl(null);
    blobRef.current = null;
    (async () => {
      try {
        const blob = await generateShareCard(visit, format);
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
  }, [visit, format]);

  // One tap: put the caption on the clipboard, then hand the image to the
  // share sheet (pick Instagram) or, on desktop, save it. Instagram ignores
  // text sent with an image, so the caption has to come from the clipboard.
  // The clipboard write starts before share() so both run inside the tap.
  const handleShare = async () => {
    if (!blobRef.current) return;
    setBusy(true);
    setNotice('');
    const copied = copyCaption(caption);
    try {
      const result = await shareCardBlob(blobRef.current, visit, format);
      if (result === 'cancelled') return;
      const captionNote = (await copied) ? 'Caption copied — paste it in Instagram.' : 'Copy the caption above and paste it in Instagram.';
      setNotice(result === 'downloaded' ? `Image saved. ${captionNote}` : captionNote);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!blobRef.current) return;
    downloadCardBlob(blobRef.current, visit, format);
  };

  const handleCopyCaption = async () => {
    setNotice((await copyCaption(caption)) ? 'Caption copied.' : 'Couldn’t copy — select the caption and copy it.');
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${visit.coffee_shop_name}`}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm max-h-full overflow-y-auto rounded-xl shadow-xl border border-rule p-6 sm:p-7"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-xl"
            style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
          >
            Share visit
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink p-2 -m-2 rounded-xl transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format */}
        <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-lg" style={{ backgroundColor: 'var(--surface-muted)' }} role="radiogroup" aria-label="Card size">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={format === option.id}
              onClick={() => setFormat(option.id)}
              className={`py-2 rounded-md text-sm font-semibold transition-colors ${format === option.id ? 'shadow-sm' : 'text-ink-soft hover:text-ink'}`}
              style={format === option.id ? { backgroundColor: 'var(--surface)', color: 'var(--text-primary)' } : undefined}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div
          className="relative mx-auto overflow-hidden rounded-lg"
          style={{
            aspectRatio: `1080 / ${CARD_FORMATS[format].height}`,
            width: format === 'story' ? '70%' : '100%',
            backgroundColor: 'var(--surface-muted)',
          }}
        >
          {status === 'ready' && previewUrl && (
            <img src={previewUrl} alt={`Share card preview for ${visit.coffee_shop_name}`} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-rule border-t-ink-soft rounded-full animate-spin" />
              <span className="text-sm text-ink-soft">Generating card…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="text-sm text-ink-soft">Couldn’t generate the card. Please try again.</span>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="share-caption" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Caption</label>
            <button type="button" onClick={handleCopyCaption} className="text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Copy</button>
          </div>
          <textarea
            id="share-caption"
            readOnly
            value={caption}
            rows={5}
            onFocus={(e) => e.target.select()}
            className="w-full resize-none rounded-lg border border-rule p-3 text-sm leading-snug"
            style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-primary)' }}
          />
        </div>

        <p className="min-h-[1.25rem] mt-2 text-sm text-center text-ink-soft" role="status" aria-live="polite">{notice}</p>

        {/* Actions */}
        <div className="mt-2 space-y-2">
          <button
            onClick={handleShare}
            disabled={status !== 'ready' || busy}
            className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--canvas)' }}
          >
            {busy ? 'Sharing…' : shareSupported ? 'Share to Instagram' : 'Save image + copy caption'}
          </button>
          {shareSupported && (
            <button
              onClick={handleDownload}
              disabled={status !== 'ready'}
              className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-primary)' }}
            >
              Download PNG
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 text-ink-faint hover:text-ink font-medium text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
