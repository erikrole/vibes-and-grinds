export const APP_MODES = {
  VIBES: 'vibes',
  VEST: 'vest',
};

/** Hostnames like vests.example.com force Vest mode (prefs cannot override). */
export function isVestHostname(hostname = window.location.hostname) {
  return hostname.startsWith('vests.');
}
