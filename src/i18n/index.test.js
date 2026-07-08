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

  test('the privacy policy resource has a title, intro, back button and at least one section', () => {
    const { privacy } = getStrings('es');
    expect(privacy.title).toEqual(expect.any(String));
    expect(privacy.intro).toEqual(expect.any(String));
    expect(privacy.backButton).toEqual(expect.any(String));
    expect(Array.isArray(privacy.sections)).toBe(true);
    expect(privacy.sections.length).toBeGreaterThan(0);
    privacy.sections.forEach((section) => {
      expect(section.heading).toEqual(expect.any(String));
      expect(section.body).toEqual(expect.any(String));
    });
  });

  test('the home privacy button string has a visible label and a descriptive aria-label', () => {
    const { home } = getStrings('es');
    expect(home.privacyButton.label).toEqual(expect.any(String));
    expect(home.privacyButton.ariaLabel).toMatch(/privacidad/i);
  });
});
