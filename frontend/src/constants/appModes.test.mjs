import assert from 'node:assert/strict';
import {
  APP_MODES,
  enterAppMode,
  getSiblingProductUrl,
  isVestHostname,
  resolveAppMode,
} from './appModes.js';

assert.equal(isVestHostname('vests.erikrole.com'), true);
assert.equal(isVestHostname('coffee.erikrole.com'), false);
assert.equal(resolveAppMode(APP_MODES.VIBES, 'vests.erikrole.com'), APP_MODES.VEST);
assert.equal(resolveAppMode(APP_MODES.VEST, 'coffee.erikrole.com'), APP_MODES.VEST);
assert.equal(resolveAppMode(APP_MODES.VIBES, 'coffee.erikrole.com'), APP_MODES.VIBES);

assert.equal(
  getSiblingProductUrl(APP_MODES.VEST, {
    hostname: 'coffee.erikrole.com',
    protocol: 'https:',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  }),
  'https://vests.erikrole.com/'
);

assert.equal(
  getSiblingProductUrl(APP_MODES.VIBES, {
    hostname: 'vests.erikrole.com',
    protocol: 'https:',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  }),
  'https://coffee.erikrole.com/'
);

assert.equal(
  getSiblingProductUrl(APP_MODES.VEST, {
    hostname: 'localhost',
    protocol: 'http:',
    port: '5173',
    pathname: '/',
    search: '',
    hash: '',
  }),
  null
);

let assigned = null;
let mode = APP_MODES.VIBES;
const resultNav = enterAppMode(APP_MODES.VEST, {
  setAppMode: (m) => { mode = m; },
  location: {
    hostname: 'coffee.erikrole.com',
    protocol: 'https:',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    assign: (url) => { assigned = url; },
  },
});
assert.equal(resultNav.navigated, true);
assert.equal(assigned, 'https://vests.erikrole.com/');
assert.equal(mode, APP_MODES.VIBES); // prefs untouched when hopping host

assigned = null;
const resultLocal = enterAppMode(APP_MODES.VEST, {
  setAppMode: (m) => { mode = m; },
  location: {
    hostname: 'localhost',
    protocol: 'http:',
    port: '5173',
    pathname: '/',
    search: '',
    hash: '',
    assign: (url) => { assigned = url; },
  },
});
assert.equal(resultLocal.navigated, false);
assert.equal(assigned, null);
assert.equal(mode, APP_MODES.VEST);

console.log('appModes.test.mjs: ok');
