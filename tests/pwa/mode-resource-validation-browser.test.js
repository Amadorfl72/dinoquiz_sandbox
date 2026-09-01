'use strict';

const path = require('path');

const MODE_RESOURCE_VALIDATION_PATH = path.resolve(__dirname, '../../public/scripts/modeResourceValidation.js');

const {
  validateModeResources,
  SHARED_SCRIPTS,
  SHARED_I18N,
  SHARED_IMAGES,
  SHARED_AUDIO,
  MODE_SPECIFIC_SCRIPTS,
  MODES_WITH_CREATURE_CARTOON_ART,
  TIMELINE_PERIOD_IMAGES,
} = require(MODE_RESOURCE_VALIDATION_PATH);

const { getModeManifest, getAllModeManifests } = require('../../src/data/modeResourceManifest');
const { MODE_IDS } = require('../../src/game/modesCatalog');

const ALL_MODE_IDS = Object.values(MODE_IDS);

/**
 * TRIOFSND-307: public/scripts/modeResourceValidation.js is the
 * browser-runnable twin of src/services/modeResourceValidation.js (see that
 * file's own doc comment for why it can't just re-export it -- the real
 * module's manifest dependency chain requires `fs`, which doesn't exist in
 * a real, unbundled browser). Its local SHARED_ constants, plus
 * MODE_SPECIFIC_SCRIPTS, MODES_WITH_CREATURE_CARTOON_ART and
 * TIMELINE_PERIOD_IMAGES, mirror
 * src/data/modeResourceManifest.js by hand, so this guards against the two
 * silently drifting apart -- same precedent as
 * tests/pwa/maze-game-browser.test.js for public/scripts/mazeGame.js's own
 * local DINOSAUR_DIETS mirror.
 */
describe('public/scripts/modeResourceValidation.js mirrors the authoritative manifest data', () => {
  test('SHARED_SCRIPTS/SHARED_I18N/SHARED_IMAGES/SHARED_AUDIO match src/data/modeResourceManifest.js', () => {
    const { SHARED_SCRIPTS: realScripts, SHARED_I18N: realI18n, SHARED_IMAGES: realImages, SHARED_AUDIO: realAudio } =
      require('../../src/data/modeResourceManifest');
    expect(SHARED_SCRIPTS.slice().sort()).toEqual(realScripts.slice().sort());
    expect(SHARED_I18N.slice().sort()).toEqual(realI18n.slice().sort());
    expect(SHARED_IMAGES.slice().sort()).toEqual(realImages.slice().sort());
    expect(SHARED_AUDIO.slice().sort()).toEqual(realAudio.slice().sort());
  });

  test('MODE_SPECIFIC_SCRIPTS matches src/data/modeResourceManifest.js for every mode', () => {
    ALL_MODE_IDS.forEach((modeId) => {
      const manifest = getModeManifest(modeId, { catalog: [], dinosaurs: [] });
      const realExtraScripts = manifest.scripts.filter((script) => !SHARED_SCRIPTS.includes(script));
      expect(MODE_SPECIFIC_SCRIPTS[modeId].slice().sort()).toEqual(realExtraScripts.slice().sort());
    });
  });

  test('MODES_WITH_CREATURE_CARTOON_ART matches src/data/modeResourceManifest.js', () => {
    const { MODES_WITH_CREATURE_CARTOON_ART: real } = require('../../src/data/modeResourceManifest');
    expect(MODES_WITH_CREATURE_CARTOON_ART.slice().sort()).toEqual(real.slice().sort());
  });

  test('TIMELINE_PERIOD_IMAGES matches src/data/modeResourceManifest.js', () => {
    const { TIMELINE_PERIOD_IMAGES: real } = require('../../src/data/modeResourceManifest');
    expect(TIMELINE_PERIOD_IMAGES.slice().sort()).toEqual(real.slice().sort());
  });

  test('validateModeResources, given the real catalog, declares exactly the same manifest URLs per mode as src/data/modeResourceManifest.js', async () => {
    const realManifests = getAllModeManifests();
    const catalog = require('../../public/data/creatures.json');
    const dinosaurs = catalog.map((creature) => creature.id);

    for (const realManifest of realManifests) {
      const missing = await validateModeResources(realManifest.modeId, {
        catalog,
        dinosaurs,
        caches: { match: async () => undefined },
        logService: { logModeResourceMissing: () => {} },
      });
      const realUrls = [...realManifest.scripts, ...realManifest.i18n, ...realManifest.images, ...realManifest.audio, ...realManifest.fallback];
      expect(missing.slice().sort()).toEqual(Array.from(new Set(realUrls)).sort());
    }
  });
});

function createFakeCaches(cachedUrls) {
  return {
    match: jest.fn((url) => Promise.resolve(cachedUrls.includes(url) ? { url } : undefined)),
  };
}

function createFakeLogService() {
  return { logModeResourceMissing: jest.fn() };
}

describe('public/scripts/modeResourceValidation.js validateModeResources', () => {
  const FIXTURE_MANIFEST = {
    modeId: MODE_IDS.QUIZ,
    scripts: ['/scripts/main.js', '/scripts/questionScreen.js'],
    i18n: ['/i18n/es.json'],
    images: ['/assets/images/mascot.svg'],
    audio: ['/assets/sounds/correct.wav'],
    fallback: [],
  };

  test('resolves to an empty list when every declared resource is cached', async () => {
    const caches = createFakeCaches(['/scripts/main.js', '/scripts/questionScreen.js', '/i18n/es.json', '/assets/images/mascot.svg', '/assets/sounds/correct.wav']);
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches, logService });

    expect(missing).toEqual([]);
    expect(logService.logModeResourceMissing).not.toHaveBeenCalled();
  });

  test('resolves to the declared URLs caches.match could not find, and tallies each one', async () => {
    const caches = createFakeCaches(['/scripts/main.js', '/i18n/es.json', '/assets/sounds/correct.wav']);
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches, logService });

    expect(missing.sort()).toEqual(['/assets/images/mascot.svg', '/scripts/questionScreen.js'].sort());
    expect(logService.logModeResourceMissing).toHaveBeenCalledTimes(2);
  });

  test('resolves to an empty list and logs nothing when the Cache Storage API is unavailable', async () => {
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches: null, logService });

    expect(missing).toEqual([]);
    expect(logService.logModeResourceMissing).not.toHaveBeenCalled();
  });

  test('builds the real manifest for a mode id from a catalog read out of Cache Storage when no manifest/catalog override is given', async () => {
    const catalog = [{ id: 'trex', image: 'dinosaurs/trex.svg', imageRealistic: 'realistic/trex.jpg', imageFallback: 'fallback/trex.svg' }];
    const caches = {
      match: jest.fn((url) => {
        if (url === '/data/creatures.json') {
          return Promise.resolve({ json: () => Promise.resolve(catalog) });
        }
        return Promise.resolve(undefined);
      }),
    };
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.QUIZ, { caches, logService });

    expect(missing).toContain('/assets/images/dinosaurs/trex.svg');
    expect(missing).toContain('/assets/images/realistic/trex.jpg');
  });

  test('resolves to an empty list (never throws) when Cache Storage has no entry yet for creatures.json', async () => {
    const caches = createFakeCaches([]);
    const missing = await validateModeResources(MODE_IDS.LABERINTO, { caches, logService: createFakeLogService() });
    expect(Array.isArray(missing)).toBe(true);
  });

  test('rejects for an unknown mode id, mirroring src/data/modeResourceManifest.js', async () => {
    await expect(
      validateModeResources('not-a-real-mode', { caches: createFakeCaches([]), logService: createFakeLogService() }),
    ).rejects.toThrow(/unknown mode id/i);
  });
});
