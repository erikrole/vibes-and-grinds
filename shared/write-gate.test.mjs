import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WRITE_NOT_CONFIGURED_ERROR,
  WRITE_UNAUTHORIZED_ERROR,
  acceptedWriteKey,
  authorizeWrite,
  secretsEqual,
} from './write-gate.mjs';

const REAL_KEY = '0123456789abcdef';

test('secretsEqual matches equal strings and rejects differences', () => {
  assert.equal(secretsEqual('abc', 'abc'), true);
  assert.equal(secretsEqual('abc', 'abd'), false);
  assert.equal(secretsEqual('abc', 'abcd'), false);
  assert.equal(secretsEqual('', ''), true);
  assert.equal(secretsEqual('a', ''), false);
});

test('acceptedWriteKey rejects empty, short, and placeholder secrets', () => {
  assert.equal(acceptedWriteKey(''), '');
  assert.equal(acceptedWriteKey('   '), '');
  assert.equal(acceptedWriteKey('short-key'), '');
  assert.equal(acceptedWriteKey('change-me-to-a-long-random-secret'), '');
  assert.equal(acceptedWriteKey('  Change-Me-To-A-Long-Random-Secret  '), '');
  assert.equal(acceptedWriteKey(REAL_KEY), REAL_KEY);
  assert.equal(acceptedWriteKey(`  ${REAL_KEY}  `), REAL_KEY);
});

test('unset key fails closed unless insecure local writes are enabled', () => {
  assert.deepEqual(authorizeWrite({}), {
    ok: false,
    status: 503,
    error: WRITE_NOT_CONFIGURED_ERROR,
  });
  assert.equal(authorizeWrite({ allowInsecure: 'false' }).status, 503);
  assert.equal(authorizeWrite({ allowInsecure: 'true' }).ok, true);
  assert.equal(authorizeWrite({ allowInsecure: true }).ok, true);
  assert.equal(
    authorizeWrite({
      writeKey: 'change-me-to-a-long-random-secret',
      allowInsecure: 'false',
      providedKey: 'change-me-to-a-long-random-secret',
    }).status,
    503
  );
});

test('a real key requires an exact X-Write-Key and ignores the insecure flag', () => {
  const base = { writeKey: REAL_KEY, allowInsecure: 'true' };
  assert.deepEqual(authorizeWrite({ ...base, providedKey: '' }), {
    ok: false,
    status: 401,
    error: WRITE_UNAUTHORIZED_ERROR,
  });
  assert.equal(authorizeWrite({ ...base, providedKey: 'wrong-key-value!!' }).status, 401);
  assert.equal(authorizeWrite({ ...base, providedKey: REAL_KEY }).ok, true);
  assert.equal(authorizeWrite({ ...base, providedKey: `  ${REAL_KEY}  ` }).ok, true);
  assert.equal(authorizeWrite({ writeKey: `  ${REAL_KEY}  `, providedKey: REAL_KEY }).ok, true);
});
