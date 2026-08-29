'use strict';

/**
 * TRIOFSND-326: completeness gate for public/service-worker.js's
 * PRECACHE_URLS across the eight DinoQuiz game modes (PRD "Nuevos Modos de
 * Juego" -- constraint "Todo recurso nuevo debe añadirse a PRECACHE_URLS y
 * cada cambio de caché debe incrementar SW_VERSION").
 *
 * Rather than hand-listing per-mode assets (which would drift the moment a
 * mode's screen ships and duplicate knowledge already encoded elsewhere),
 * this test walks the same sources the app itself uses to decide what a
 * mode needs:
 *   - modes: public/scripts/modesCatalog.js's MODES_CATALOG (the ids the PRD
 *     commits to, in order).
 *   - images: public/scripts/modeSelectorScreen.js's MODE_ILLUSTRATION_SRCS
 *     (one card illustration per mode, PRD "Selector ilustrado de modos"),
 *     plus *every* image file on disk under public/assets/images/ (walked
 *     recursively). Nothing is excluded: the creature art in dinosaurs/,
 *     fallback/ and realistic/ is reused by several modes (the quiz shows the
 *     cartoon/realistic drawings, Parejas jurásicas pairs them, Sombra derives
 *     silhouettes from them -- see each folder's CREDITS.md), and mode-specific
 *     art such as public/assets/images/cards/back.svg (the Parejas card back)
 *     lives here too, so all of it must be precached to work offline. Asserting
 *     the *whole* tree -- rather than allow-listing "shared" directories to
 *     skip -- means a future PR that drops a referenced asset from
 *     PRECACHE_URLS (e.g. dinosaurs/trex.svg) fails this gate even if it
 *     refreshes the snapshot and bumps SW_VERSION.
 *   - i18n: public/i18n/es.json's `modes.<id>` entries (PRD constraint "todo
 *     texto debe proceder de public/i18n/") -- checks the *file* is
 *     precached and that every mode actually has copy backing it.
 *   - audio: soundService.js's SOUND_SRC and audio.js's SOUND_SOURCES, the
 *     shared feedback sounds every mode plays through feedbackComponent.js
 *     (PRD "Contrato técnico ... común para los modos").
 *   - scripts: every <script src> public/index.html loads -- with no
 *     bundler every mode's engine/screen ships as one of these tags, so this
 *     is the authoritative "what code a mode needs" list.
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
const INDEX_HTML_PATH = path.resolve(__dirname, '../../public/index.html');
const ES_JSON_PATH = path.resolve(__dirname, '../../public/i18n/es.json');
const SNAPSHOT_PATH = path.resolve(__dirname, 'fixtures/precache-snapshot.json');

// eslint-disable-next-line global-require
const { PRECACHE_URLS, SW_VERSION } = require(SW_PATH);
// eslint-disable-next-line global-require
const { MODES_CATALOG } = require('../../public/scripts/modesCatalog');
// eslint-disable-next-line global-require
const { MODE_ILLUSTRATION_SRCS } = require('../../public/scripts/modeSelectorScreen');
// eslint-disable-next-line global-require
const { SOUND_SRC } = require('../../public/scripts/soundService');
// eslint-disable-next-line global-require
const { SOUND_SOURCES } = require('../../public/scripts/audio');

const IMAGES_DIR = path.resolve(__dirname, '../../public/assets/images');

const MODE_IDS = MODES_CATALOG.map((mode) => mode.id);

function readIndexScriptSrcs() {
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  return Array.from(indexHtml.matchAll(/<script\s+src="([^"]+)"/g)).map((match) => match[1]);
}

// Walk *every* image file under public/assets/images/ (recursively), skipping
// only the per-folder CREDITS.md attribution files. Nothing is allow-listed
// out: the creature art (dinosaurs/, fallback/, realistic/) is referenced by
// several modes and must be precached to work offline, just like the
// mode-specific art (cards/) and the top-level mascot.
function readAllImageAssets(dir = IMAGES_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return readAllImageAssets(absolute);
    }
    if (!entry.isFile() || entry.name === 'CREDITS.md') {
      return [];
    }
    const relative = path.relative(IMAGES_DIR, absolute).split(path.sep).join('/');
    return [`/assets/images/${relative}`];
  });
}

// Completeness is computed independently of any snapshot/version state: given a
// precache list it returns the image assets referenced on disk that the list
// fails to declare. Because it reads nothing from the snapshot fixture or
// SW_VERSION, refreshing the snapshot or bumping the version can never hide a
// missing asset -- exactly the escape hatch the reviewer flagged.
function missingImageAssets(precacheList) {
  const precached = new Set(precacheList);
  return readAllImageAssets().filter((src) => !precached.has(src));
}

describe('TRIOFSND-326: precache completeness for the eight game modes', () => {
  test('the catalog commits to exactly the eight PRD modes', () => {
    expect(MODE_IDS).toEqual([
      'quiz',
      'laberinto',
      'sombra',
      'oidoJurasico',
      'parejas',
      'clasifica',
      'ordenaPorTamano',
      'lineaDelTiempo',
    ]);
  });

  test('every mode has a selector illustration and it is precached', () => {
    MODE_IDS.forEach((modeId) => {
      const src = MODE_ILLUSTRATION_SRCS[modeId];
      expect(typeof src).toBe('string');
      expect(PRECACHE_URLS).toContain(src);
    });
  });

  test('every image asset referenced by the modes is precached (shared creature art included)', () => {
    const imageAssets = readAllImageAssets();
    // Sanity-check the walk reaches both the shared creature art (reused by
    // Quiz/Parejas/Sombra) and the mode-specific card back, so removing any of
    // them from PRECACHE_URLS would fail this test rather than slip through.
    expect(imageAssets).toContain('/assets/images/dinosaurs/trex.svg');
    expect(imageAssets).toContain('/assets/images/fallback/generic.svg');
    expect(imageAssets).toContain('/assets/images/realistic/trex.jpg');
    expect(imageAssets).toContain('/assets/images/cards/back.svg');
    // No directory (dinosaurs/, fallback/, realistic/, modes/) is allow-listed
    // out as "shared": every image on disk must be declared in PRECACHE_URLS.
    expect(missingImageAssets(PRECACHE_URLS)).toEqual([]);
  });

  // Regression for the reviewer's exact escape hatch: dropping a shared creature
  // image from PRECACHE_URLS must fail completeness even if the snapshot is
  // refreshed to the mutated list and SW_VERSION is bumped. The completeness
  // check is independent of both, so neither can approve the incomplete list.
  test('removing a referenced shared image from PRECACHE_URLS fails completeness even with a refreshed snapshot and bumped SW_VERSION', () => {
    const SHARED_IMAGE = '/assets/images/dinosaurs/trex.svg';
    // It is genuinely referenced today and precached in the approved state.
    expect(readAllImageAssets()).toContain(SHARED_IMAGE);
    expect(PRECACHE_URLS).toContain(SHARED_IMAGE);

    // A future PR drops it from the precache list...
    const mutatedPrecache = PRECACHE_URLS.filter((url) => url !== SHARED_IMAGE);
    // ...and tries to launder the change past the version gate by re-recording
    // the snapshot and bumping SW_VERSION. None of that touches completeness:
    const mutatedSnapshot = { swVersion: 'v999', precacheUrls: [...mutatedPrecache].sort() };
    void mutatedSnapshot; // the completeness computation never reads it

    expect(missingImageAssets(mutatedPrecache)).toContain(SHARED_IMAGE);
  });

  test('the i18n bundle is precached and carries copy for every mode', () => {
    expect(PRECACHE_URLS).toContain('/i18n/es.json');

    const es = JSON.parse(fs.readFileSync(ES_JSON_PATH, 'utf-8'));
    MODE_IDS.forEach((modeId) => {
      expect(es.modes && es.modes[modeId]).toBeTruthy();
    });
  });

  test('every shared feedback sound the modes play is precached', () => {
    const sounds = new Set([...Object.values(SOUND_SRC), ...Object.values(SOUND_SOURCES)]);
    expect(sounds.size).toBeGreaterThan(0);
    sounds.forEach((src) => {
      expect(PRECACHE_URLS).toContain(src);
    });
  });

  test('every script the app shell loads (shared engine + implemented mode screens) is precached', () => {
    const scriptSrcs = readIndexScriptSrcs();
    expect(scriptSrcs.length).toBeGreaterThan(0);
    scriptSrcs.forEach((src) => {
      expect(PRECACHE_URLS).toContain(src);
    });
  });

  test('every precached URL exists on disk under public/', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    PRECACHE_URLS.forEach((url) => {
      const relative = url === '/' ? 'index.html' : url.replace(/^\//, '');
      expect(fs.existsSync(path.join(publicDir, relative))).toBe(true);
    });
  });
});

describe('TRIOFSND-326: SW_VERSION bump gate', () => {
  let snapshot;

  beforeAll(() => {
    expect(fs.existsSync(SNAPSHOT_PATH)).toBe(true);
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  });

  function versionOrdinal(version) {
    const match = /^v(\d+)$/.exec(version);
    expect(match).not.toBeNull();
    return Number(match[1]);
  }

  test('PRECACHE_URLS matches the last known snapshot, or SW_VERSION was bumped', () => {
    const currentUrls = [...PRECACHE_URLS].sort();
    const snapshotUrls = [...snapshot.precacheUrls].sort();
    const listChanged = JSON.stringify(currentUrls) !== JSON.stringify(snapshotUrls);

    if (!listChanged) {
      // Nothing added/removed since the snapshot: the version is free to
      // stay put (or move ahead for unrelated reasons), but it may never
      // fall behind the last known-good one.
      expect(versionOrdinal(SW_VERSION)).toBeGreaterThanOrEqual(versionOrdinal(snapshot.swVersion));
      return;
    }

    // The precache list changed since the snapshot was recorded: per the
    // PRD constraint ("cada cambio de caché debe incrementar SW_VERSION")
    // SW_VERSION must have moved strictly forward, and
    // tests/pwa/fixtures/precache-snapshot.json must be refreshed in the
    // same change to record the new baseline for future comparisons.
    expect(versionOrdinal(SW_VERSION)).toBeGreaterThan(versionOrdinal(snapshot.swVersion));
  });
});
