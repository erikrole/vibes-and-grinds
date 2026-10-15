import { useEffect, useState } from 'react';

// Renders an Apple-Maps-backed shop card.
// Accepts either a fully-resolved MapKit `place` object, or a `placeId` to look up.
// Falls back gracefully when MapKit hasn't loaded or fields are missing.
export default function ShopCard({ place: placeProp, placeId, userVisits = [], onAddVisit }) {
  const [place, setPlace] = useState(placeProp ?? null);
  const [loading, setLoading] = useState(!placeProp && !!placeId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (placeProp || !placeId) return;
    if (typeof window === 'undefined' || !window.mapkit) {
      setError('mapkit-unavailable');
      setLoading(false);
      return;
    }

    const lookup = new window.mapkit.PlaceLookup();
    lookup.getPlace(placeId, (err, result) => {
      if (err) {
        setError(err.message || 'lookup-failed');
      } else {
        setPlace(result);
      }
      setLoading(false);
    });
  }, [placeProp, placeId]);

  if (loading) return <ShopCardSkeleton />;
  if (error || !place) return <ShopCardError reason={error} />;

  const {
    name,
    formattedAddress,
    telephone,
    urls = [],
    hours,
    coordinate,
    pointOfInterestCategory,
  } = place;

  const website = urls[0];
  const isOpen = computeIsOpenNow(hours);
  const visitCount = userVisits.length;
  const lastVisit = userVisits[0];

  const appleMapsUrl = coordinate
    ? `https://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${coordinate.latitude},${coordinate.longitude}`
    : `https://maps.apple.com/?q=${encodeURIComponent(name)}`;

  return (
    <article className="rounded-2xl border border-rule bg-surface-raised p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-ink">
            {name}
          </h3>
          {pointOfInterestCategory && (
            <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-soft">
              {humanizeCategory(pointOfInterestCategory)}
            </p>
          )}
        </div>
        {isOpen != null && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-surface-muted text-ink-soft dark:text-ink-faint'
            }`}
          >
            {isOpen ? 'Open now' : 'Closed'}
          </span>
        )}
      </header>

      {formattedAddress && (
        <p className="mt-3 text-sm text-ink-soft">
          {formattedAddress}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {telephone && (
          <Field label="Phone">
            <a href={`tel:${telephone}`} className="text-accent-text hover:underline">
              {formatPhone(telephone)}
            </a>
          </Field>
        )}
        {website && (
          <Field label="Website">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-accent-text hover:underline"
            >
              {prettyDomain(website)}
            </a>
          </Field>
        )}
        {visitCount > 0 && (
          <Field label="Your visits">
            <span className="font-medium">{visitCount}</span>
            {lastVisit && (
              <span className="ml-1 text-ink-soft">· last {relativeDate(lastVisit.date)}</span>
            )}
          </Field>
        )}
      </dl>

      {hours?.length > 0 && <HoursList hours={hours} />}

      <footer className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddVisit}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Log a visit
        </button>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-rule px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
        >
          View in Apple Maps
        </a>
      </footer>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 truncate text-ink">{children}</dd>
    </div>
  );
}

function HoursList({ hours }) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().getDay();
  const todayHours = hours.find((h) => h.dayOfWeek === today);

  return (
    <section className="mt-4 border-t border-rule pt-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-sm"
      >
        <span className="text-ink-soft">
          {todayHours ? `Today · ${formatHourRange(todayHours)}` : 'Hours'}
        </span>
        <span className="text-ink-faint">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {hours.map((h) => (
            <li key={h.dayOfWeek} className="flex justify-between">
              <span>{dayName(h.dayOfWeek)}</span>
              <span>{formatHourRange(h)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ShopCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-rule bg-surface-raised p-5">
      <div className="h-5 w-2/3 rounded bg-surface-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-surface-muted" />
      <div className="mt-6 h-4 w-3/4 rounded bg-surface-muted" />
    </div>
  );
}

function ShopCardError({ reason }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface-muted p-5 text-sm text-ink-soft dark:text-ink-faint">
      Couldn't load shop details{reason === 'mapkit-unavailable' ? ' (MapKit not initialized)' : ''}.
    </div>
  );
}

function computeIsOpenNow(hours) {
  if (!hours?.length) return null;
  const now = new Date();
  const today = hours.find((h) => h.dayOfWeek === now.getDay());
  if (!today?.openTime || !today?.closeTime) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= toMinutes(today.openTime) && minutes < toMinutes(today.closeTime);
}

function toMinutes(t) {
  // MapKit returns "HH:mm"
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHourRange(h) {
  if (!h?.openTime) return 'Closed';
  return `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`;
}

function formatTime(t) {
  const [h, m] = String(t).split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${period}` : `${hour}${period}`;
}

function dayName(d) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? '';
}

function humanizeCategory(cat) {
  return String(cat).replace(/^MKPOICategory/, '').replace(/([A-Z])/g, ' $1').trim();
}

function formatPhone(p) {
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

function prettyDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function relativeDate(iso) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}
