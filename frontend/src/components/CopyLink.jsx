import { useState } from 'react';
export default function CopyLink({ url = window.location.href, label = 'Copy link' }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  return <span className="copy-link-control">
    <button type="button" className="text-action" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); }
      catch { setManual(true); }
    }}>{copied ? 'Link copied' : label}</button>
    <span role="status" className="sr-only">{copied ? 'Link copied to clipboard.' : ''}</span>
    {manual && <input aria-label="Link to copy" className="control-field" readOnly value={url} onFocus={(event) => event.target.select()} />}
  </span>;
}
