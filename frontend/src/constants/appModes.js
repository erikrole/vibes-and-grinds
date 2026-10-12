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

/** Hostnames like vests.example.com force Vest mode. The journal query string cannot override that. */
export function isVestHostname(hostname = window.location.hostname) {
  return hostname.startsWith('vests.');
}

/** Vest hostnames win. Everywhere else, only an explicit vest preference selects Vest. */
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
 * Returns null on local/dev hosts so the in-app query stays the secondary path.
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
    } else {
      return null;
    }
  }

  if (!nextHost || nextHost === hostname) return null;

  const portPart = port ? `:${port}` : '';
  return `${protocol}//${nextHost}${portPart}${pathname}${search}${hash}`;
}

/**
 * Prefer a coffee.* ↔ vests.* hop. Otherwise flip in-app mode.
 * A locked vest host with no sibling URL cannot fall back to a preference.
 */
export function enterAppMode(targetMode, { setAppMode, location = window.location } = {}) {
  const url = getSiblingProductUrl(targetMode, location);
  if (url) {
    location.assign(url);
    return { navigated: true, mode: targetMode };
  }

  if (isVestHostname(location.hostname) && targetMode === APP_MODES.VIBES) {
    return { navigated: false, mode: APP_MODES.VEST, blocked: true };
  }

  if (typeof setAppMode === 'function') {
    setAppMode(targetMode);
  }
  return { navigated: false, mode: targetMode };
}

/**
 * Footer href. Production coffee.* and vests.* hosts hop to the sibling.
 * Previews and localhost keep the ?app=vest query so they stay on this deployment.
 */
export function productSwitchHref(targetMode, location = window.location) {
  const host = location.hostname || '';
  const sibling = getSiblingProductUrl(targetMode, location);
  if (sibling && (host.startsWith('coffee.') || host.startsWith('vests.'))) {
    const url = new URL(sibling);
    url.searchParams.delete('app');
    url.hash = '';
    return `${url.origin}${url.pathname}${url.search}`;
  }
  return targetMode === APP_MODES.VEST ? '/?app=vest' : '/';
}
