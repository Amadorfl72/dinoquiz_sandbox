'use strict';

const {
  AUDIO_MUTED_NOTICE_CONTRACT,
  DRAG_SELECTION_ALTERNATIVE_CONTRACT,
} = require('./audioAccessNotice');
const { getStrings, DEFAULT_LOCALE } = require('../i18n');
const { checkMutedBeforeAudioMode } = require('./sound');

describe('AUDIO_MUTED_NOTICE_CONTRACT (TRIOFSND-314)', () => {
  it('requires exactly the two actions AC-11 mandates: unmute and back', () => {
    expect(AUDIO_MUTED_NOTICE_CONTRACT.requiredActions).toEqual(['unmuteButton', 'backButton']);
  });

  it('lists Oído Jurásico as an applying mode', () => {
    expect(AUDIO_MUTED_NOTICE_CONTRACT.appliesTo).toContain('oidoJurasico');
  });

  it('points at a shared default i18n block that actually exists and satisfies the contract shape', () => {
    const strings = getStrings(DEFAULT_LOCALE);
    const sharedDefaults = strings[AUDIO_MUTED_NOTICE_CONTRACT.sharedDefaultStringsPath];

    expect(sharedDefaults).toBeDefined();
    AUDIO_MUTED_NOTICE_CONTRACT.requiredStringKeys.forEach((key) => {
      expect(typeof sharedDefaults[key]).toBe('string');
      expect(sharedDefaults[key].trim().length).toBeGreaterThan(0);
    });
  });

  it("checkMutedBeforeAudioMode's muted result satisfies the contract's required string keys", () => {
    const strings = getStrings(DEFAULT_LOCALE).audioAccessNotice;
    const storageObj = { getItem: () => 'true' };

    const result = checkMutedBeforeAudioMode(strings, { storageObj });

    expect(result.muted).toBe(true);
    AUDIO_MUTED_NOTICE_CONTRACT.requiredStringKeys.forEach((key) => {
      expect(result[key]).toBe(strings[key]);
    });
  });

  it("oidoJurasico's own mutedNotice copy also satisfies the contract's required string keys", () => {
    const strings = getStrings(DEFAULT_LOCALE).oidoJurasico.mutedNotice;

    AUDIO_MUTED_NOTICE_CONTRACT.requiredStringKeys.forEach((key) => {
      expect(typeof strings[key]).toBe('string');
      expect(strings[key].trim().length).toBeGreaterThan(0);
    });
  });
});

describe('DRAG_SELECTION_ALTERNATIVE_CONTRACT (TRIOFSND-314)', () => {
  it('applies to the three drag-shaped modes committed in the PRD', () => {
    expect(DRAG_SELECTION_ALTERNATIVE_CONTRACT.appliesTo).toEqual(['maze', 'sizeOrder', 'parejas']);
  });

  it('names the quiz answer options as the reference tap-to-select implementation', () => {
    expect(DRAG_SELECTION_ALTERNATIVE_CONTRACT.referenceImplementation).toContain('questionScreen.js');
  });

  DRAG_SELECTION_ALTERNATIVE_CONTRACT.appliesTo.forEach((modeName) => {
    it(`${modeName}'s screen never wires up a drag/drop listener`, () => {
      const fs = require('fs');
      const path = require('path');
      const screenFile = path.resolve(__dirname, `../../public/scripts/${modeName}Screen.js`);

      const src = fs.readFileSync(screenFile, 'utf-8');

      expect(src).not.toMatch(/addEventListener\(\s*['"]drag/);
      expect(src).not.toMatch(/addEventListener\(\s*['"]drop['"]/);
    });
  });
});
