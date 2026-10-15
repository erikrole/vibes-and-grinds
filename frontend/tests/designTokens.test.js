import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const block = (selector) => {
  const match = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n  \\}`));
  return Object.fromEntries([...match[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const light = block(':root');
const dark = block('\\.dark');

const resolve = (tokens, value) => {
  let v = value;
  while (v.startsWith('var(')) v = tokens[v.slice(6, -1)];
  return v;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('every light colour token has a dark counterpart', () => {
  const missing = Object.keys(light).filter((name) => !(name in dark));
  assert.deepEqual(missing, []);
});

test('text pairs meet WCAG AA (4.5:1) in both themes', () => {
  const pairs = [
    ['text-primary', 'surface'], ['text-secondary', 'surface'], ['text-tertiary', 'surface'], ['text-tertiary', 'paper'],
    ['text-tertiary', 'surface-muted'], ['ink-soft', 'paper'], ['ink-faint', 'paper'], ['accent-text', 'surface'],
    ['accent-text', 'paper'], ['accent-text', 'surface-muted'], ['danger', 'surface'], ['success', 'surface'], ['warning', 'surface'],
  ];
  for (const [name, tokens] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg] of pairs) {
      const ratio = contrast(resolve(tokens, tokens[fg]), resolve(tokens, tokens[bg]));
      assert.ok(ratio >= 4.5, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('rating colours stay legible as large text or graphics (3:1) on cards', () => {
  for (const [name, tokens] of [['light', light], ['dark', dark]]) {
    for (const score of ['score-mid', 'score-good', 'score-high', 'score-peak']) {
      const ratio = contrast(resolve(tokens, tokens[score]), resolve(tokens, tokens.surface));
      assert.ok(ratio >= 3, `${name}: ${score} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('shared scales exist and the one-off literals do not creep back', () => {
  const start = css.indexOf('/* Mode-independent scales');
  const shared = css.slice(start, css.indexOf('\n  }', start));
  for (const token of ['--dur-fast', '--ease-out', '--radius-pill', '--text-sm', '--font-display', '--z-toast']) assert.ok(shared.includes(token), token);
  const body = css.slice(css.indexOf('  body {'));
  assert.equal((body.match(/border-radius:\s*999px/g) || []).length, 0);
  assert.equal((body.match(/cubic-bezier\(/g) || []).length, 0);
});

test('filled accent controls keep readable text in both themes', () => {
  for (const [name, tokens] of [['light', light], ['dark', dark]]) {
    const ratio = contrast(resolve(tokens, tokens['on-accent']), resolve(tokens, tokens['accent-fill']));
    assert.ok(ratio >= 4.5, `${name}: on-accent on accent-fill is ${ratio.toFixed(2)}:1`);
  }
});

test('white text is never set directly on the accent (use --on-accent over --accent-fill)', () => {
  const body = css.slice(css.indexOf('  body {'));
  const bad = body.split('\n').filter((line) => /background:\s*var\(--accent\)/.test(line) && /color:\s*(#fff|var\(--on-solid\))/.test(line));
  assert.deepEqual(bad, []);
});
