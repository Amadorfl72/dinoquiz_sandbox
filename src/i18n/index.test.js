'use strict';

const { DEFAULT_LOCALE, getStrings } = require('./index');
const es = require('./es.json');

describe('i18n resource loader', () => {
  test('exposes "es" as the default locale (v1 ships only Spanish)', () => {
    expect(DEFAULT_LOCALE).toBe('es');
  });

  test('returns the es.json resource for the "es" locale', () => {
    expect(getStrings('es')).toEqual(es);
  });

  test('falls back to the default locale for an unsupported one', () => {
    expect(getStrings('fr')).toEqual(es);
  });

  test('the parental notice string exists and mentions local-only progress loss', () => {
    const { home } = getStrings('es');
    expect(home.parentalNotice.message).toMatch(/dispositivo/i);
    expect(home.parentalNotice.message).toMatch(/progreso/i);
  });
});
