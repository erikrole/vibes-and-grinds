import { useEffect, useState } from 'react';
import { ownerRequest, restoreVisit } from '../utils/api';
import { formatDate } from '../utils/dates';

export default function OwnerPanel({ owner, onSignedIn, onSignedOut, onRestored, onSavingChange }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [trash, setTrash] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => { onSavingChange?.(busy); }, [busy, onSavingChange]);
  useEffect(() => {
    if (owner) {
      ownerRequest('trash').then(setTrash).catch((err) => setError(err.message));
      ownerRequest('vest-history').then(setSnapshots).catch((err) => setError(err.message));
    }
  }, [owner]);
  const run = async (action) => {
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <section className="owner-panel">
    <h2 className="type-title">{owner ? 'Manage journal' : 'Owner sign-in'}</h2>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!owner ? <form onSubmit={(event) => { event.preventDefault(); run(async () => {
      await ownerRequest('session', 'POST', { key }); setKey(''); onSignedIn();
    }); }}>
      <p className="type-meta my-4">Sign in to add visits, edit entries, or restore deleted visits.</p>
      <label htmlFor="owner-key" className="block text-sm font-medium mb-2">Owner access key</label>
      <input id="owner-key" name="password" type="password" autoComplete="current-password" value={key} onChange={(event) => setKey(event.target.value)} className="control-field w-full" required />
      <button type="submit" disabled={busy} className="btn-primary mt-4">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form> : <>
      <p className="type-meta my-4">Your changes are saved to the journal. Deleted visits stay here until you restore them.</p>
      <div className="flex flex-wrap gap-3 mb-7">
        <a className="btn-secondary" href="/api/owner/export" download>Export journal</a>
        <button type="button" className="text-action" disabled={busy} onClick={() => run(async () => { await ownerRequest('session', 'DELETE'); onSignedOut(); })}>Sign out</button>
      </div>
      <h3 className="text-lg font-semibold mb-3">Deleted visits</h3>
      {trash === null ? <p className="type-meta" role="status">Loading deleted visits…</p> : trash.length ? <ul className="trash-list">{trash.map((visit) => <li key={visit.id}>
        <div><strong>{visit.coffee_shop_name}</strong><p className="type-meta">{formatDate(visit.date)} · {visit.city}</p></div>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(async () => { const restored = await restoreVisit(visit.id); setTrash((items) => items.filter((item) => item.id !== visit.id)); onRestored(restored); })}>Restore</button>
      </li>)}</ul> : <p className="type-meta">No deleted visits.</p>}
      {snapshots.length > 0 && <details className="mt-7"><summary className="text-action cursor-pointer">Vest Tracker recovery</summary><p className="type-meta my-3">Restore a previous game list. Your current list is saved as another snapshot before restoration.</p><ul className="trash-list">{snapshots.map((snapshot) => <li key={snapshot.id}><div><strong>{snapshot.game_count} games</strong><p className="type-meta">{snapshot.created_at} UTC</p></div><button type="button" className="btn-secondary" disabled={busy} onClick={() => run(async () => { await ownerRequest(`vest-history/${snapshot.id}`, 'POST'); setSnapshots(await ownerRequest('vest-history')); window.dispatchEvent(new Event('vg:vest-restored')); })}>Restore game list</button></li>)}</ul></details>}
    </>}
  </section>;
}
