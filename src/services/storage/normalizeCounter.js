'use strict';

/**
 * Normalizes a stored counter value before incrementing it (TRIOFSND-102).
 *
 * Integers and non-negative decimal strings resolve to their integer value
 * (decimals are floored); anything absent, empty, non-numeric, negative,
 * `NaN` or infinite resolves to `0`. Shared by every backend that persists
 * `replay_pulsado`/`partida_iniciada` (src/services/storage/StorageClient.js
 * and public/scripts/main.js's browser-native fallback) so a stale or
 * corrupted value can never be silently string-concatenated into the next
 * count (e.g. `"5" + 1` -> `"51"`).
 */
function normalizeCounter(value) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return 0;
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }

  return Math.floor(num);
}

module.exports = { normalizeCounter };
