export const APP_MODES = {
  VIBES: 'vibes',
  VEST: 'vest',
};

/** Hostnames like vests.example.com force Vest mode. The journal query string cannot override that. */
export function isVestHostname(hostname = window.location.hostname) {
  return hostname.startsWith('vests.');
}
