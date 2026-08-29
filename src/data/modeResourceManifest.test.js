'use strict';

const {
  MODE_IDS,
  SHARED_SCRIPTS,
  SHARED_I18N,
  SHARED_IMAGES,
  SHARED_AUDIO,
  MODES_WITH_CREATURE_CARTOON_ART,
  getModeManifest,
  getAllModeManifests,
  collectAllManifestUrls,
} = require('./modeResourceManifest');
const { PRECACHE_URLS } = require('../../public/service-worker');

const ALL_MODE_IDS = Object.values(MODE_IDS);

describe('modeResourceManifest', () => {
  test('declares a manifest for every one of the eight PRD modes', () => {
    expect(ALL_MODE_IDS).toHaveLength(8);
    const manifests = getAllModeManifests();
    expect(manifests.map((manifest) => manifest.modeId)).toEqual(ALL_MODE_IDS);
  });

  test('throws for an unknown mode id', () => {
    expect(() => getModeManifest('not-a-real-mode')).toThrow(/unknown mode id/i);
  });

  test('every mode inherits the shared app-shell scripts, i18n bundle, selector art and feedback sounds', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      SHARED_SCRIPTS.forEach((script) => expect(manifest.scripts).toContain(script));
      SHARED_I18N.forEach((file) => expect(manifest.i18n).toContain(file));
      SHARED_IMAGES.forEach((image) => expect(manifest.images).toContain(image));
      SHARED_AUDIO.forEach((sound) => expect(manifest.audio).toContain(sound));
    });
  });

  test('every mode also declares at least one mode-specific script', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      const extra = manifest.scripts.filter((script) => !SHARED_SCRIPTS.includes(script));
      expect(extra.length).toBeGreaterThan(0);
    });
  });

  test('only the modes that render creature illustrations declare cartoon art', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      const cartoonArt = manifest.images.filter((image) => image.startsWith('/assets/images/dinosaurs/'));
      if (MODES_WITH_CREATURE_CARTOON_ART.includes(modeId)) {
        expect(cartoonArt.length).toBeGreaterThan(0);
      } else {
        expect(cartoonArt).toEqual([]);
      }
    });
  });

  test('only Quiz declares the realistic image variant and its local fallback', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      const realistic = manifest.images.filter((image) => image.startsWith('/assets/images/realistic/'));
      if (modeId === MODE_IDS.QUIZ) {
        expect(realistic.length).toBeGreaterThan(0);
        expect(manifest.fallback.length).toBeGreaterThan(0);
        manifest.fallback.forEach((image) => expect(image).toMatch(/^\/assets\/images\/fallback\//));
      } else {
        expect(realistic).toEqual([]);
        expect(manifest.fallback).toEqual([]);
      }
    });
  });

  test('only Parejas declares the memory card back', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      const hasCardBack = manifest.images.includes('/assets/images/cards/back.svg');
      expect(hasCardBack).toBe(modeId === MODE_IDS.PAREJAS);
    });
  });

  test('only Oído Jurásico declares per-creature sound files', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId);
      const creatureSounds = manifest.audio.filter((sound) => sound.startsWith('/assets/sounds/oido-jurasico/'));
      if (modeId === MODE_IDS.OIDO_JURASICO) {
        expect(creatureSounds.length).toBeGreaterThan(0);
      } else {
        expect(creatureSounds).toEqual([]);
      }
    });
  });

  test('every resource in every mode manifest is precached (superset check)', () => {
    const precacheSet = new Set(PRECACHE_URLS);
    getAllModeManifests().forEach((manifest) => {
      [...manifest.scripts, ...manifest.i18n, ...manifest.images, ...manifest.audio, ...manifest.fallback].forEach(
        (url) => {
          expect(precacheSet.has(url)).toBe(true);
        },
      );
    });
  });

  test('collectAllManifestUrls returns a deduplicated, sorted, fully-precached list', () => {
    const urls = collectAllManifestUrls();
    expect(urls).toEqual(Array.from(new Set(urls)).sort());
    expect(urls.length).toBeGreaterThan(0);

    const precacheSet = new Set(PRECACHE_URLS);
    const missing = urls.filter((url) => !precacheSet.has(url));
    expect(missing).toEqual([]);
  });

  test('a fixture-injected catalog/dinosaur list is honored instead of the real one', () => {
    const catalog = [
      { id: 'trex', image: 'dinosaurs/trex.svg', imageRealistic: 'realistic/trex.jpg', imageFallback: 'fallback/trex.svg' },
    ];
    const manifest = getModeManifest(MODE_IDS.QUIZ, { catalog, dinosaurs: ['trex'] });
    expect(manifest.images).toContain('/assets/images/dinosaurs/trex.svg');
    expect(manifest.images).toContain('/assets/images/realistic/trex.jpg');
    expect(manifest.fallback).toContain('/assets/images/fallback/trex.svg');

    const oido = getModeManifest(MODE_IDS.OIDO_JURASICO, { catalog, dinosaurs: ['trex'] });
    expect(oido.audio).toContain('/assets/sounds/oido-jurasico/trex.wav');
    expect(oido.audio).toHaveLength(SHARED_AUDIO.length + 1);
  });
});
