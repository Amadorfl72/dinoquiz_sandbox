'use strict';

const {
  APPROVED_ANALYTICS_EVENTS,
  QUESTION_ANSWERED_EVENT_FIELDS,
  APPROVED_LOG_EVENT_TYPES,
  PII_FIELD_DENYLIST,
} = require('./approvedEvents');

describe('approvedEvents allowlist', () => {
  test.each([
    ['APPROVED_ANALYTICS_EVENTS', APPROVED_ANALYTICS_EVENTS],
    ['QUESTION_ANSWERED_EVENT_FIELDS', QUESTION_ANSWERED_EVENT_FIELDS],
    ['APPROVED_LOG_EVENT_TYPES', APPROVED_LOG_EVENT_TYPES],
    ['PII_FIELD_DENYLIST', PII_FIELD_DENYLIST],
  ])('%s is a non-empty array of unique lowercase strings', (_name, list) => {
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(new Set(list).size).toBe(list.length);
    for (const entry of list) {
      expect(typeof entry).toBe('string');
      expect(entry).toBe(entry.toLowerCase());
    }
  });

  test('no approved analytics event name or field is itself a denylisted PII term', () => {
    for (const eventName of APPROVED_ANALYTICS_EVENTS) {
      expect(PII_FIELD_DENYLIST).not.toContain(eventName);
    }
    for (const field of QUESTION_ANSWERED_EVENT_FIELDS) {
      expect(PII_FIELD_DENYLIST).not.toContain(field);
    }
  });
});
