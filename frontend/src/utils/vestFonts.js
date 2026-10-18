// Barlow and JetBrains are only used by the vest scoreboard. The journal
// shell loads Fraunces and Inter. This stylesheet is added when vest mode
// is already saved, or when the user switches into it.
export const VEST_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=JetBrains+Mono:wght@400&display=swap';

export function ensureVestFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('vest-fonts')) return;
  const link = document.createElement('link');
  link.id = 'vest-fonts';
  link.rel = 'stylesheet';
  link.href = VEST_FONT_HREF;
  document.head.appendChild(link);
}
