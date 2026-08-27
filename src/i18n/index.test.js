'use strict';

const { DEFAULT_LOCALE, getStrings } = require('./index');
const es = require('../../public/i18n/es.json');

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

  describe('modeSelector strings', () => {
    const MODE_IDS = ['quiz', 'maze', 'shadow', 'hearing', 'pairs', 'classify', 'sizeOrder', 'timeline'];

    test('exposes a screen title and back button label', () => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.screenTitle).toBe('string');
      expect(modeSelector.screenTitle.length).toBeGreaterThan(0);
      expect(typeof modeSelector.backButtonLabel).toBe('string');
      expect(modeSelector.backButtonLabel.length).toBeGreaterThan(0);
    });

    test.each(MODE_IDS)('mode "%s" has a name and an accessible label', (modeId) => {
      const { modeSelector } = getStrings('es');
      const mode = modeSelector.modes[modeId];
      expect(mode).toBeDefined();
      expect(typeof mode.name).toBe('string');
      expect(mode.name.length).toBeGreaterThan(0);
      expect(typeof mode.accessibleLabel).toBe('string');
      expect(mode.accessibleLabel.length).toBeGreaterThan(0);
    });

    test('exposes available/blocked status text', () => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.status.available).toBe('string');
      expect(modeSelector.status.available.length).toBeGreaterThan(0);
      expect(typeof modeSelector.status.blocked).toBe('string');
      expect(modeSelector.status.blocked.length).toBeGreaterThan(0);
    });

    test.each(['comingSoon', 'ageRestricted'])('exposes blocked-reason copy for cause "%s"', (cause) => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.blockedReasons[cause]).toBe('string');
      expect(modeSelector.blockedReasons[cause].length).toBeGreaterThan(0);
    });

    test('the Oído Jurásico accessible label presents its sounds as imagined, not scientific fact', () => {
      const { modeSelector } = getStrings('es');
      expect(modeSelector.modes.hearing.accessibleLabel).toMatch(/imaginado/i);
    });
  });
});
