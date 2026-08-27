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
 *     (one card illustration per mode, PRD "Selector ilustrado de modos").
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

const MODE_IDS = MODES_CATALOG.map((mode) => mode.id);

function readIndexScriptSrcs() {
  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  return Array.from(indexHtml.matchAll(/<script\s+src="([^"]+)"/g)).map((match) => match[1]);
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
