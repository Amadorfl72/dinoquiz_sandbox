const assert = require('assert');
const { validateGameCompleted } = require('../src/validators/gameCompleted');

function validPayload(overrides = {}) {
  return {
    event_name: 'game_completed',
    score: 7,
    duration_ms: 180000,
    app_version: '1.0.0',
    timestamp_ms: Date.now(),
    device: { os: 'iPadOS 17', locale: 'es', screen: '1024x768' },
    ...overrides
  };
}

test('accepts a valid payload', () => {
  const r = validateGameCompleted(validPayload());
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.score, 7);
  assert.strictEqual(r.value.app_version, '1.0.0');
});

test('rejects wrong event_name', () => {
  const r = validateGameCompleted(validPayload({ event_name: 'foo' }));
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(' ').includes('event_name'));
});

test('rejects out-of-range score', () => {
  assert.ok(!validateGameCompleted(validPayload({ score: -1 })).ok);
  assert.ok(!validateGameCompleted(validPayload({ score: 11 })).ok);
  assert.ok(!validateGameCompleted(validPayload({ score: 5.5 })).ok);
});

test('rejects negative duration', () => {
  assert.ok(!validateGameCompleted(validPayload({ duration_ms: -1 })).ok);
});

test('rejects UUID-like app_version (PII guard)', () => {
  const r = validateGameCompleted(
    validPayload({ app_version: '550e8400-e29b-41d4-a716-446655440000' })
  );
  assert.strictEqual(r.ok, false);
});

test('rejects unexpected top-level fields', () => {
  const r = validateGameCompleted(validPayload({ user_id: 'abc' }));
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(' ').includes('user_id'));
});

test('strips unknown device keys but keeps allowed ones', () => {
  const r = validateGameCompleted(
    validPayload({ device: { os: 'iOS', adid: 'secret', locale: 'es' } })
  );
  assert.strictEqual(r.ok, false); // adid triggers PII pattern
});

test('defaults timestamp_ms when omitted', () => {
  const p = validPayload();
  delete p.timestamp_ms;
  const r = validateGameCompleted(p);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(typeof r.value.timestamp_ms, 'number');
});
