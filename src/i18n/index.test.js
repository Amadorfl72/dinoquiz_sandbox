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
    // Mirrors src/game/modesCatalog.js MODE_IDS exactly, so the illustrated
    // selector and the availability evaluator always agree on which modes exist.
    const MODE_IDS = [
      'quiz',
      'laberinto',
      'sombra',
      'oidoJurasico',
      'parejas',
      'clasifica',
      'ordenaPorTamano',
      'lineaDelTiempo',
    ];

    test('exposes a screen title and back button label', () => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.screenTitle).toBe('string');
      expect(modeSelector.screenTitle.length).toBeGreaterThan(0);
      expect(typeof modeSelector.backButtonLabel).toBe('string');
      expect(modeSelector.backButtonLabel.length).toBeGreaterThan(0);
    });

    test.each(MODE_IDS)('mode "%s" has an accessible label, and its display name comes from modes.%s.name', (modeId) => {
      const { modeSelector, modes } = getStrings('es');
      const mode = modeSelector.modes[modeId];
      expect(mode).toBeDefined();
      expect(typeof mode.accessibleLabel).toBe('string');
      expect(mode.accessibleLabel.length).toBeGreaterThan(0);
      expect(typeof modes[modeId].name).toBe('string');
      expect(modes[modeId].name.length).toBeGreaterThan(0);
    });

    test('exposes available/blocked status text', () => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.status.available).toBe('string');
      expect(modeSelector.status.available.length).toBeGreaterThan(0);
      expect(typeof modeSelector.status.blocked).toBe('string');
      expect(modeSelector.status.blocked.length).toBeGreaterThan(0);
    });

    // Mirrors src/game/modesCatalog.js AVAILABILITY_CAUSES exactly, so every
    // cause the evaluator can return resolves to real, kid-friendly copy.
    test.each([
      'insufficient_questions',
      'insufficient_creatures',
      'insufficient_creature_sounds',
      'missing_creature_field',
    ])('exposes blocked-reason copy for cause "%s"', (cause) => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.blockedReasons[cause]).toBe('string');
      expect(modeSelector.blockedReasons[cause].length).toBeGreaterThan(0);
    });

    test('the last-played badge text exists', () => {
      const { modeSelector } = getStrings('es');
      expect(typeof modeSelector.lastPlayedBadge).toBe('string');
      expect(modeSelector.lastPlayedBadge.length).toBeGreaterThan(0);
    });

    test('the Oído Jurásico accessible label presents its sounds as imagined, not scientific fact', () => {
      const { modeSelector } = getStrings('es');
      expect(modeSelector.modes.oidoJurasico.accessibleLabel).toMatch(/imaginado/i);
    });
  });
});
