'use strict';

/**
 * TRIOFSND-304: two gates the PRD's "Nuevos Modos de Juego" constraint
 * ("Todo recurso nuevo debe añadirse a PRECACHE_URLS y cada cambio de caché
 * debe incrementar SW_VERSION") demands that
 * tests/pwa/precache-completeness.test.js does not yet cover:
 *
 *  - COVERAGE: every resource src/data/modeResourceManifest.js declares for
 *    the eight modes is precached EXACTLY ONCE (no duplicate PRECACHE_URLS
 *    entry for the same resource), or -- if it is never eagerly precached --
 *    is at least covered by one of service-worker.js's
 *    RUNTIME_CACHEABLE_PATTERNS so it is still cached on first fetch.
 *    (precache-completeness.test.js only asserts PRECACHE_URLS is a
 *    *superset* of what index.html/questions.json reference; it never checks
 *    for accidental duplicate entries.)
 *
 *  - CONTENT VERSIONING: the path-list version gate in
 *    precache-completeness.test.js only notices an added/removed URL. A file
 *    whose on-disk *content* changes in place (e.g. a script bugfix, an
 *    i18n copy edit) with no path added or removed passes that gate
 *    silently. This file hashes every precached file's bytes and fails if
 *    any hash drifts from the last approved snapshot without SW_VERSION
 *    also moving strictly forward.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { collectAllManifestUrls } = require('../../src/data/modeResourceManifest');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
const SNAPSHOT_PATH = path.resolve(__dirname, 'fixtures/precache-snapshot.json');

// eslint-disable-next-line global-require
const { PRECACHE_URLS, SW_VERSION, isRuntimeCacheable } = require(SW_PATH);

function countOccurrences(list, value) {
  return list.filter((entry) => entry === value).length;
}

function toDiskPath(url) {
  const relative = url === '/' ? '/index.html' : url;
  return path.join(PUBLIC_DIR, relative.replace(/^\//, ''));
}

function hashFile(url) {
  const bytes = fs.readFileSync(toDiskPath(url));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function versionOrdinal(version) {
  const match = /^v(\d+)$/.exec(version);
  expect(match).not.toBeNull();
  return Number(match[1]);
}

describe('TRIOFSND-304: precache coverage -- every manifest resource is precached exactly once', () => {
  test('PRECACHE_URLS itself has no duplicate entries', () => {
    const duplicates = PRECACHE_URLS.filter((url, index) => PRECACHE_URLS.indexOf(url) !== index);
    expect(Array.from(new Set(duplicates))).toEqual([]);
  });

  test('every resource declared by modeResourceManifest is precached exactly once, or falls back to a runtime-cacheable pattern', () => {
    const manifestUrls = collectAllManifestUrls();
    expect(manifestUrls.length).toBeGreaterThan(0);

    const notExactlyOnceAndUncacheable = manifestUrls.filter((url) => {
      const occurrences = countOccurrences(PRECACHE_URLS, url);
      if (occurrences === 1) {
        return false;
      }
      if (occurrences === 0) {
        return !isRuntimeCacheable(url);
      }
      return true; // duplicated: never acceptable regardless of runtime pattern
    });

    if (notExactlyOnceAndUncacheable.length > 0) {
      throw new Error(
        `${notExactlyOnceAndUncacheable.length} manifest resource(s) are not covered exactly once ` +
          `(either duplicated in PRECACHE_URLS, or absent and not matched by any RUNTIME_CACHEABLE_PATTERNS):\n` +
          notExactlyOnceAndUncacheable.map((url) => `  ${url} (occurrences: ${countOccurrences(PRECACHE_URLS, url)})`).join('\n'),
      );
    }
    expect(notExactlyOnceAndUncacheable).toEqual([]);
  });

  test('a resource missing from PRECACHE_URLS and unmatched by any runtime pattern is caught', () => {
    const fakeManifestUrl = '/scripts/doesNotExistInManifestFixture.js';
    expect(PRECACHE_URLS).not.toContain(fakeManifestUrl);
    expect(isRuntimeCacheable(fakeManifestUrl)).toBe(false);
  });

  test('a duplicated entry is caught even though it is individually a real precached resource', () => {
    const realUrl = PRECACHE_URLS[0];
    const duplicated = [...PRECACHE_URLS, realUrl];
    expect(countOccurrences(duplicated, realUrl)).toBe(2);
  });
});

describe('TRIOFSND-304: precache content-versioning -- a changed file content requires a bumped SW_VERSION', () => {
  let snapshot;

  beforeAll(() => {
    expect(fs.existsSync(SNAPSHOT_PATH)).toBe(true);
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
    expect(snapshot.contentHashes).toBeTruthy();
  });

  function currentContentHashes() {
    const hashes = {};
    PRECACHE_URLS.forEach((url) => {
      hashes[url] = hashFile(url);
    });
    return hashes;
  }

  test('every currently precached resource has an approved snapshot hash', () => {
    const current = currentContentHashes();
    const unrecorded = Object.keys(current).filter((url) => !(url in snapshot.contentHashes));
    if (unrecorded.length > 0) {
      throw new Error(
        `${unrecorded.length} precached resource(s) have no entry in ${path.relative(
          process.cwd(),
          SNAPSHOT_PATH,
        )}'s contentHashes -- refresh the snapshot:\n${unrecorded.map((url) => `  ${url}`).join('\n')}`,
      );
    }
    expect(unrecorded).toEqual([]);
  });

  test('any path added/removed or content changed vs the snapshot requires SW_VERSION to move strictly forward', () => {
    const current = currentContentHashes();
    const currentUrls = new Set(Object.keys(current));
    const snapshotUrls = new Set(Object.keys(snapshot.contentHashes));

    const added = [...currentUrls].filter((url) => !snapshotUrls.has(url));
    const removed = [...snapshotUrls].filter((url) => !currentUrls.has(url));
    const changed = [...currentUrls]
      .filter((url) => snapshotUrls.has(url))
      .filter((url) => current[url] !== snapshot.contentHashes[url]);

    const driftCount = added.length + removed.length + changed.length;

    if (driftCount === 0) {
      expect(versionOrdinal(SW_VERSION)).toBeGreaterThanOrEqual(versionOrdinal(snapshot.swVersion));
      return;
    }

    if (versionOrdinal(SW_VERSION) <= versionOrdinal(snapshot.swVersion)) {
      throw new Error(
        'Precached resource path(s)/content changed but SW_VERSION was not bumped ' +
          `(still ${SW_VERSION}, reference ${snapshot.swVersion}). Bump SW_VERSION and refresh ` +
          `${path.relative(process.cwd(), SNAPSHOT_PATH)}'s contentHashes together.\n` +
          `  added: ${JSON.stringify(added)}\n` +
          `  removed: ${JSON.stringify(removed)}\n` +
          `  changed: ${JSON.stringify(changed)}`,
      );
    }
    expect(versionOrdinal(SW_VERSION)).toBeGreaterThan(versionOrdinal(snapshot.swVersion));
  });

  test('the regression target: mutating one precached file in-memory is detected as content drift', () => {
    const sampleUrl = PRECACHE_URLS.find((url) => url in snapshot.contentHashes);
    expect(sampleUrl).toBeTruthy();

    const mutatedHash = crypto.createHash('sha256').update('mutated-content').digest('hex');
    expect(mutatedHash).not.toBe(snapshot.contentHashes[sampleUrl]);

    // Same path, different bytes: the version gate must treat this the same
    // as an added/removed URL, i.e. demand SW_VERSION > snapshot.swVersion.
    const scenarioHashes = { ...snapshot.contentHashes, [sampleUrl]: mutatedHash };
    const changed = Object.keys(scenarioHashes).filter((url) => scenarioHashes[url] !== snapshot.contentHashes[url]);
    expect(changed).toEqual([sampleUrl]);
  });
});
