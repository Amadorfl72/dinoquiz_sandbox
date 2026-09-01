'use strict';

const { validateModeResources } = require('./modeResourceValidation');
const { MODE_IDS } = require('../game/modesCatalog');

const FIXTURE_MANIFEST = {
  modeId: MODE_IDS.QUIZ,
  scripts: ['/scripts/main.js', '/scripts/questionScreen.js'],
  i18n: ['/i18n/es.json'],
  images: ['/assets/images/mascot.svg'],
  audio: ['/assets/sounds/correct.wav'],
  fallback: [],
};

function createFakeCaches(cachedUrls) {
  return {
    match: jest.fn((url) => Promise.resolve(cachedUrls.includes(url) ? { url } : undefined)),
  };
}

function createFakeLogService() {
  return { logModeResourceMissing: jest.fn() };
}

function createFakeDiagnostics() {
  return { recordError: jest.fn(), incrementCounter: jest.fn() };
}

describe('validateModeResources', () => {
  test('resolves to an empty list when every declared resource is cached', async () => {
    const caches = createFakeCaches([
      '/scripts/main.js',
      '/scripts/questionScreen.js',
      '/i18n/es.json',
      '/assets/images/mascot.svg',
      '/assets/sounds/correct.wav',
    ]);
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
    expect(logService.logModeResourceMissing).toHaveBeenCalledWith(MODE_IDS.QUIZ, '/assets/images/mascot.svg');
    expect(logService.logModeResourceMissing).toHaveBeenCalledWith(MODE_IDS.QUIZ, '/scripts/questionScreen.js');
  });

  test('checks caches.match against every URL in the declared manifest exactly once', async () => {
    const caches = createFakeCaches([]);
    await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches, logService: createFakeLogService() });

    expect(caches.match).toHaveBeenCalledTimes(5);
    ['/scripts/main.js', '/scripts/questionScreen.js', '/i18n/es.json', '/assets/images/mascot.svg', '/assets/sounds/correct.wav'].forEach(
      (url) => expect(caches.match).toHaveBeenCalledWith(url),
    );
  });

  test('resolves to an empty list and logs nothing when the Cache Storage API is unavailable', async () => {
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches: null, logService });

    expect(missing).toEqual([]);
    expect(logService.logModeResourceMissing).not.toHaveBeenCalled();
  });

  test('never sends anything remotely -- misses only ever reach the injected local logService', async () => {
    const caches = createFakeCaches([]);
    const logService = createFakeLogService();

    await validateModeResources(MODE_IDS.QUIZ, { manifest: FIXTURE_MANIFEST, caches, logService });

    expect(logService).not.toHaveProperty('sendLogs');
  });

  test('builds the real manifest for a mode id when no manifest override is given', async () => {
    const caches = createFakeCaches([]);
    const logService = createFakeLogService();

    const missing = await validateModeResources(MODE_IDS.LABERINTO, {
      caches,
      logService,
      catalog: [{ id: 'trex', image: 'dinosaurs/trex.svg' }],
      dinosaurs: ['trex'],
    });

    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain('/scripts/mazeGame.js');
  });

  test('propagates getModeManifest\'s error for an unknown mode id', async () => {
    await expect(validateModeResources('not-a-real-mode', { caches: createFakeCaches([]) })).rejects.toThrow(
      /unknown mode id/i,
    );
  });

  test('TRIOFSND-318: records a structured RESOURCE_NOT_CACHED diagnostics error per missing resource, never the URL', async () => {
    const caches = createFakeCaches(['/scripts/main.js', '/i18n/es.json', '/assets/sounds/correct.wav']);
    const diagnosticsService = createFakeDiagnostics();

    await validateModeResources(MODE_IDS.QUIZ, {
      manifest: FIXTURE_MANIFEST,
      caches,
      logService: createFakeLogService(),
      diagnostics: diagnosticsService,
    });

    expect(diagnosticsService.recordError).toHaveBeenCalledTimes(2);
    expect(diagnosticsService.recordError).toHaveBeenCalledWith(MODE_IDS.QUIZ, 'resource', 'RESOURCE_NOT_CACHED');
  });

  test('TRIOFSND-318: records nothing when every declared resource is cached', async () => {
    const caches = createFakeCaches([
      '/scripts/main.js',
      '/scripts/questionScreen.js',
      '/i18n/es.json',
      '/assets/images/mascot.svg',
      '/assets/sounds/correct.wav',
    ]);
    const diagnosticsService = createFakeDiagnostics();

    await validateModeResources(MODE_IDS.QUIZ, {
      manifest: FIXTURE_MANIFEST,
      caches,
      logService: createFakeLogService(),
      diagnostics: diagnosticsService,
    });

    expect(diagnosticsService.recordError).not.toHaveBeenCalled();
  });
});
