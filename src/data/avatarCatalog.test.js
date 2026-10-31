'use strict';

const fs = require('fs');
const path = require('path');

const { AVATAR_CATALOG, getAvatarById } = require('./avatarCatalog');
const { getStrings } = require('../i18n');

const IMAGES_DIR = path.resolve(__dirname, '../../public/assets/images');

function resolveI18nKey(strings, key) {
  return key
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), strings);
}

describe('AVATAR_CATALOG', () => {
  test('is a non-empty array with a unique id per entry', () => {
    expect(Array.isArray(AVATAR_CATALOG)).toBe(true);
    expect(AVATAR_CATALOG.length).toBeGreaterThan(0);
    const ids = AVATAR_CATALOG.map((avatar) => avatar.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every entry references an svg asset that exists under public/assets/images/dinosaurs', () => {
    AVATAR_CATALOG.forEach((avatar) => {
      expect(typeof avatar.image).toBe('string');
      expect(avatar.image).toMatch(/^dinosaurs\/.+\.svg$/);
      expect(fs.existsSync(path.join(IMAGES_DIR, avatar.image))).toBe(true);
    });
  });

  test('every entry declares an i18n key that resolves to a non-empty translated name', () => {
    const strings = getStrings('es');
    AVATAR_CATALOG.forEach((avatar) => {
      expect(typeof avatar.nameKey).toBe('string');
      const name = resolveI18nKey(strings, avatar.nameKey);
      expect(typeof name).toBe('string');
      expect(name.trim()).not.toBe('');
    });
  });

  test('catalog and entries are frozen so avatars cannot be mutated at runtime', () => {
    expect(Object.isFrozen(AVATAR_CATALOG)).toBe(true);
    expect(Object.isFrozen(AVATAR_CATALOG[0])).toBe(true);
  });

  test('getAvatarById resolves every real id and returns undefined for an unknown one', () => {
    AVATAR_CATALOG.forEach((avatar) => {
      expect(getAvatarById(avatar.id)).toEqual(avatar);
    });
    expect(getAvatarById('not-a-real-dinosaur')).toBeUndefined();
  });
});
