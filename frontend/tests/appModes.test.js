import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_MODES,
  enterAppMode,
  getSiblingProductUrl,
  isVestHostname,
  productSwitchHref,
  resolveAppMode,
} from '../src/constants/appModes.js';

test('vest hostnames force Vest mode and sibling hosts hop both ways', () => {
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
});

test('production hosts hop and local hosts flip in-app mode', () => {
  let assigned = null;
  let mode = APP_MODES.VIBES;
  const resultNav = enterAppMode(APP_MODES.VEST, {
    setAppMode: (next) => { mode = next; },
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
  assert.equal(mode, APP_MODES.VIBES);

  assigned = null;
  const resultLocal = enterAppMode(APP_MODES.VEST, {
    setAppMode: (next) => { mode = next; },
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

  assert.equal(
    productSwitchHref(APP_MODES.VEST, {
      hostname: 'coffee.erikrole.com',
      protocol: 'https:',
      port: '',
      pathname: '/',
      search: '?app=vest',
      hash: '',
    }),
    'https://vests.erikrole.com/'
  );
  assert.equal(
    productSwitchHref(APP_MODES.VEST, {
      hostname: 'cursor-preview.vibes-and-grinds.pages.dev',
      protocol: 'https:',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    }),
    '/?app=vest'
  );
});
