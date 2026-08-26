'use strict';

/**
 * Privacy audit -- analytics event allowlist (TRIOFSND-119, PRD G7). Every
 * event name this static scan finds being emitted from shipped code must be
 * in src/services/analytics/approvedEvents.js -- exactly, in both
 * directions: a new `recordEvent('algo_nuevo')` fails here until the
 * allowlist is updated deliberately, and a stale allowlist entry no longer
 * emitted anywhere fails too, so the list never silently drifts from reality.
 *
 * Also checks the two structured event *shapes* DinoQuiz emits (the
 * per-question analytics event and LogService's diagnostic log entries)
 * carry no field the allowlist's PII_FIELD_DENYLIST forbids.
 */

const { collectProductionJsFiles } = require('./collectSourceFiles');
const {
  APPROVED_ANALYTICS_EVENTS,
  QUESTION_ANSWERED_EVENT_FIELDS,
  APPROVED_LOG_EVENT_TYPES,
  PII_FIELD_DENYLIST,
} = require('../../src/services/analytics/approvedEvents');

const RECORD_EVENT_CALL = /\.recordEvent\(\s*([^,)]+)\)/g;
const RECORD_EVENT_ONCE_CALL = /\.recordEventOnce\(\s*([^,)]+)\)/g;
const LOG_EVENT_CALL = /\.logEvent\(\s*([^,)]+)/g;
const COUNTS_PROPERTY_ASSIGNMENT = /counts\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;

/** Resolves a bare `SOME_CONSTANT` identifier to its string value via a same-file `const SOME_CONSTANT = '...'` declaration, without building a dynamic RegExp. */
function resolveConstant(content, identifier) {
  const marker = `${identifier} = '`;
  const start = content.indexOf(marker);
  if (start === -1) return null;
  const valueStart = start + marker.length;
  const valueEnd = content.indexOf("'", valueStart);
  return valueEnd === -1 ? null : content.slice(valueStart, valueEnd);
}

function literalOrResolvedValue(rawArg, content) {
  const trimmed = rawArg.trim();
  const singleQuoted = trimmed.match(/^'([^']*)'$/);
  if (singleQuoted) return singleQuoted[1];
  const doubleQuoted = trimmed.match(/^"([^"]*)"$/);
  if (doubleQuoted) return doubleQuoted[1];
  // An ALL_CAPS bare identifier is treated as a constant reference (e.g.
  // MAX_UNLOCKED_LEVEL_PERSIST_ERROR_CODE); anything else (a lowercase
  // parameter like `eventName`) is a generic passthrough, not an
  // origination site, and is intentionally skipped.
  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed)) {
    return resolveConstant(content, trimmed);
  }
  return null;
}

function collectMatches(pattern, content) {
  return [...content.matchAll(pattern)]
    .map((match) => literalOrResolvedValue(match[1], content))
    .filter((value) => typeof value === 'string');
}

describe('privacy audit: emitted analytics events match the approved allowlist exactly', () => {
  const files = collectProductionJsFiles();

  test('every emitted analytics event name is in APPROVED_ANALYTICS_EVENTS, and every approved event is actually emitted', () => {
    const emitted = new Set();
    for (const file of files) {
      for (const name of collectMatches(RECORD_EVENT_CALL, file.content)) emitted.add(name);
      for (const name of collectMatches(RECORD_EVENT_ONCE_CALL, file.content)) emitted.add(name);
      for (const name of collectMatches(COUNTS_PROPERTY_ASSIGNMENT, file.content)) emitted.add(name);
    }

    const approved = new Set(APPROVED_ANALYTICS_EVENTS);
    const notApproved = [...emitted].filter((name) => !approved.has(name));
    const neverEmitted = [...approved].filter((name) => !emitted.has(name));

    expect(notApproved).toEqual([]);
    expect(neverEmitted).toEqual([]);
  });

  test('every logged diagnostic event type is in APPROVED_LOG_EVENT_TYPES', () => {
    const logged = new Set();
    for (const file of files) {
      for (const name of collectMatches(LOG_EVENT_CALL, file.content)) logged.add(name);
    }

    const approved = new Set(APPROVED_LOG_EVENT_TYPES);
    const notApproved = [...logged].filter((name) => !approved.has(name));
    expect(notApproved).toEqual([]);
    // At least one approved type must actually be emitted, or the allowlist
    // itself would be silently disconnected from reality.
    expect(logged.size).toBeGreaterThan(0);
  });

  test('the per-question analytics event object carries only the approved fields', () => {
    const eventLiteralPattern = /\{\s*tipo:\s*'pregunta_respondida'[^}]*\}/g;
    const occurrences = [];
    for (const file of files) {
      const matches = file.content.match(eventLiteralPattern) || [];
      occurrences.push(...matches);
    }

    expect(occurrences.length).toBeGreaterThan(0);

    for (const literal of occurrences) {
      const keys = [...literal.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)].map((m) => m[1]);
      for (const key of keys) {
        expect(QUESTION_ANSWERED_EVENT_FIELDS).toContain(key);
      }
      for (const denied of PII_FIELD_DENYLIST) {
        expect(keys.map((k) => k.toLowerCase())).not.toContain(denied);
      }
    }
  });

  test('no metadata object literal passed to logEvent/recordEvent contains a denylisted PII field name', () => {
    const metadataCallPattern = /\.(?:logEvent|recordEvent|recordEventOnce)\([^,)]+,\s*\{([^}]*)\}/g;
    const offenders = [];
    for (const file of files) {
      for (const match of file.content.matchAll(metadataCallPattern)) {
        const keys = [...match[1].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)].map((m) =>
          m[1].toLowerCase()
        );
        for (const key of keys) {
          if (PII_FIELD_DENYLIST.includes(key)) {
            offenders.push(`${file.relPath}: metadata field "${key}"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
