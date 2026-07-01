const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24h sanity cap
const ALLOWED_DEVICE_KEYS = new Set(['os', 'locale', 'screen']);

// Reject any string that looks like it could carry an identifier.
// This is a defensive measure: the client should never send PII,
// but we enforce it server-side per COPPA / GDPR-K.
const PII_PATTERNS = [
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, // UUID
  /^[A-Za-z0-9+/]{40,}={0,2}$/, // base64 blobs
  /\b(idfa|gaid|adid|android[_-]?id|udid|imei|serial)\b/i
];

function isSafeShortString(value, maxLen = 64) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > maxLen) return false;
  return !PII_PATTERNS.some((re) => re.test(value));
}

function validateDevice(device) {
  const errors = [];
  const cleaned = {};

  if (device === undefined || device === null) return { ok: true, value: {} };
  if (typeof device !== 'object' || Array.isArray(device)) {
    return { ok: false, errors: ['device must be an object'] };
  }

  for (const [key, val] of Object.entries(device)) {
    if (!ALLOWED_DEVICE_KEYS.has(key)) {
      // Ignore unknown keys rather than failing, but never persist them.
      continue;
    }
    if (!isSafeShortString(val, 128)) {
      errors.push(`device.${key} is not a safe string`);
      continue;
    }
    cleaned[key] = val;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: cleaned };
}

function validateGameCompleted(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }

  // event_name — must be exactly 'game_completed'
  if (body.event_name !== 'game_completed') {
    errors.push('event_name must be "game_completed"');
  }

  // score — integer 0..10
  if (
    typeof body.score !== 'number' ||
    !Number.isInteger(body.score) ||
    body.score < 0 ||
    body.score > 10
  ) {
    errors.push('score must be an integer between 0 and 10');
  }

  // duration_ms — non-negative integer
  if (
    typeof body.duration_ms !== 'number' ||
    !Number.isInteger(body.duration_ms) ||
    body.duration_ms < 0 ||
    body.duration_ms > MAX_DURATION_MS
  ) {
    errors.push('duration_ms must be a non-negative integer (<= 24h)');
  }

  // app_version — short safe string (e.g. "1.0.0")
  if (!isSafeShortString(body.app_version, 32)) {
    errors.push('app_version must be a short safe string (e.g. "1.0.0")');
  }

  // timestamp_ms — optional, must be recent-ish if provided
  let timestampMs = body.timestamp_ms;
  if (timestampMs === undefined) {
    timestampMs = Date.now();
  } else if (
    typeof timestampMs !== 'number' ||
    !Number.isInteger(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > 7 * 24 * 60 * 60 * 1000
  ) {
    errors.push('timestamp_ms must be an integer within ±7 days of now');
  }

  // device — optional, validated separately
  const deviceResult = validateDevice(body.device);
  if (!deviceResult.ok) {
    errors.push(...deviceResult.errors);
  }

  // Reject any unexpected top-level keys that could smuggle PII.
  const ALLOWED_TOP_KEYS = new Set([
    'event_name', 'score', 'duration_ms', 'app_version', 'timestamp_ms', 'device'
  ]);
  for (const key of Object.keys(body)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      errors.push(`unexpected field: ${key}`);
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      event_name: 'game_completed',
      score: body.score,
      duration_ms: body.duration_ms,
      app_version: body.app_version,
      timestamp_ms: timestampMs,
      device: deviceResult.value
    }
  };
}

module.exports = { validateGameCompleted };
