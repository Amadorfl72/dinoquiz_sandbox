'use strict';

const { normalizeCounter } = require('./normalizeCounter');

describe('normalizeCounter (TRIOFSND-102)', () => {
  it.each([
    ['a non-negative decimal string', '5', 5],
    ['an integer', 5, 5],
    ['an absent value (undefined)', undefined, 0],
    ['an empty string', '', 0],
    ['non-numeric text', 'not-a-number', 0],
    ['a negative number', -3, 0],
    ['a negative numeric string', '-3', 0],
    ['a non-negative decimal (floored)', 2.9, 2],
    ['NaN', NaN, 0],
    ['Infinity', Infinity, 0],
    ['-Infinity', -Infinity, 0],
    ['null', null, 0],
    ['a boolean', true, 0],
    ['an object', {}, 0],
  ])('normalizes %s to %p', (_label, input, expected) => {
    expect(normalizeCounter(input)).toBe(expected);
  });

  it('always returns a finite, non-negative integer', () => {
    expect(Number.isInteger(normalizeCounter('5'))).toBe(true);
    expect(Number.isInteger(normalizeCounter(Infinity))).toBe(true);
    expect(Number.isInteger(normalizeCounter(-1))).toBe(true);
    expect(Number.isInteger(normalizeCounter('not-a-number'))).toBe(true);
  });
});
