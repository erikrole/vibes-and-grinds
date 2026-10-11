export const APP_MODES = {
  VIBES: 'vibes',
  VEST: 'vest',
};

export const MODE_LABELS = {
  [APP_MODES.VIBES]: {
    short: 'Vibes & Grinds',
    brand: 'vibes & grinds',
    outcome: 'Coffee journal',
    hint: 'Paper log for road and Madison stops',
  },
  [APP_MODES.VEST]: {
    short: 'Vest Tracker',
    brand: 'VEST TRACKER',
    outcome: 'Vest Tracker',
    hint: 'Scoreboard for sideline fits and results',
  },
};

/** Hostnames like vests.example.com force Vest mode (prefs cannot override). */
export function isVestHostname(hostname = window.location.hostname) {
  return hostname.startsWith('vests.');
}

/** Resolve effective mode: vest subdomain always wins over persisted prefs. */
export function resolveAppMode(preferredMode, hostname = window.location.hostname) {
  if (isVestHostname(hostname)) return APP_MODES.VEST;
  return preferredMode === APP_MODES.VEST ? APP_MODES.VEST : APP_MODES.VIBES;
}

function isLocalDevHost(hostname) {
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.localhost')
    || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  );
}

/**
 * Map coffee.* ↔ vests.* (and apex → vests.*).
 * Returns null on local/dev hosts so the in-app toggle stays the secondary path.
 */
export function getSiblingProductUrl(targetMode, location = window.location) {
  const { hostname, protocol, port, pathname, search, hash } = location;
  if (isLocalDevHost(hostname)) return null;

  let nextHost = null;

  if (targetMode === APP_MODES.VEST) {
    if (hostname.startsWith('vests.')) return null;
    if (hostname.startsWith('coffee.')) {
      nextHost = `vests.${hostname.slice('coffee.'.length)}`;
    } else {
      nextHost = `vests.${hostname}`;
    }
  } else if (targetMode === APP_MODES.VIBES) {
    if (hostname.startsWith('vests.')) {
      nextHost = `coffee.${hostname.slice('vests.'.length)}`;
    } else if (hostname.startsWith('coffee.')) {
      return null;
    } else {
      return null;
    }
  }

  if (!nextHost || nextHost === hostname) return null;

  const portPart = port ? `:${port}` : '';
  return `${protocol}//${nextHost}${portPart}${pathname}${search}${hash}`;
}

/**
 * Prefer vests.* / coffee.* hostname hops when available; otherwise flip in-app mode.
 * On a locked vest host, coffee exit must navigate (prefs cannot override).
 */
export function enterAppMode(targetMode, { setAppMode, location = window.location } = {}) {
  const url = getSiblingProductUrl(targetMode, location);
  if (url) {
    location.assign(url);
    return { navigated: true, mode: targetMode };
  }

  if (isVestHostname(location.hostname) && targetMode === APP_MODES.VIBES) {
    // Locked on vests.* with no sibling URL — nowhere to go.
    return { navigated: false, mode: APP_MODES.VEST, blocked: true };
  }

  if (typeof setAppMode === 'function') {
    setAppMode(targetMode);
  }
  return { navigated: false, mode: targetMode };
}
