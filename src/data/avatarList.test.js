'use strict';

const fs = require('fs');
const path = require('path');

const { AVATAR_LIST } = require('./avatarList');
const { getStrings } = require('../i18n');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

describe('avatarList data', () => {
  test('is a non-empty, frozen array', () => {
    expect(Array.isArray(AVATAR_LIST)).toBe(true);
    expect(AVATAR_LIST.length).toBeGreaterThan(0);
    expect(Object.isFrozen(AVATAR_LIST)).toBe(true);
  });

  test('every entry is itself frozen (cannot be mutated by a consumer)', () => {
    AVATAR_LIST.forEach((avatar) => {
      expect(Object.isFrozen(avatar)).toBe(true);
    });
  });

  test('every entry has a unique, non-empty id', () => {
    const ids = AVATAR_LIST.map((avatar) => avatar.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every entry\'s image points at an svg under public/assets/images/dinosaurs/ that exists on disk', () => {
    AVATAR_LIST.forEach((avatar) => {
      expect(avatar.image).toMatch(/^\/assets\/images\/dinosaurs\/[a-z]+\.svg$/);
      const onDisk = path.join(PUBLIC_DIR, avatar.image);
      expect(fs.existsSync(onDisk)).toBe(true);
    });
  });

  test('no two entries reuse the same illustration', () => {
    const images = AVATAR_LIST.map((avatar) => avatar.image);
    expect(new Set(images).size).toBe(images.length);
  });

  test('every entry\'s nameKey resolves to a non-empty name in every supported locale', () => {
    const { SUPPORTED_LOCALES } = require('../i18n');
    SUPPORTED_LOCALES.forEach((locale) => {
      const { dinosaurNames } = getStrings(locale);
      AVATAR_LIST.forEach((avatar) => {
        expect(typeof dinosaurNames[avatar.nameKey]).toBe('string');
        expect(dinosaurNames[avatar.nameKey].length).toBeGreaterThan(0);
      });
    });
  });

  test('reuses the existing dinosaur illustrations -- it is not missing any of the 14 shipped under public/assets/images/dinosaurs/', () => {
    const svgFiles = fs
      .readdirSync(path.join(PUBLIC_DIR, 'assets', 'images', 'dinosaurs'))
      .filter((file) => file.endsWith('.svg'));
    expect(AVATAR_LIST.length).toBe(svgFiles.length);
  });
});
