'use strict';

/**
 * TRIOFSND-326: completeness gate for public/service-worker.js's
 * PRECACHE_URLS across the eight DinoQuiz game modes (PRD "Nuevos Modos de
 * Juego" -- constraint "Todo recurso nuevo debe añadirse a PRECACHE_URLS y
 * cada cambio de caché debe incrementar SW_VERSION").
 *
 * DESIGN: the expected universe is derived from the *runtime references* the
 * eight launch flows resolve -- NOT by "walking a directory minus a set of
 * excluded folders". A previous version allow-listed `dinosaurs/`, `fallback/`
 * and `realistic/` out via a `SHARED_IMAGE_DIRS` set, so shared creature art
 * that Quiz/Parejas/Sombra genuinely reference could be dropped from
 * PRECACHE_URLS (and laundered past the version gate by refreshing the
 * snapshot + bumping SW_VERSION) without failing. This file has NO
 * `SHARED_IMAGE_DIRS` and NO equivalent per-folder / "shared" / "fallback" /
 * "realistic" exclusion. The *only* exclusions are non-local, non-precacheable
 * protocols (http(s):, protocol-relative //, data:, blob:, mailto:, tel:),
 * each documented inline in `toPublicUrl()`.
 *
 * Reference sources (every entry keeps provenance so a failure can point at a
 * file/flow that needs the asset):
 *   - scripts / styles / manifest / icon: the `<script src>` and `<link>` graph
 *     in public/index.html. With no bundler, every runtime module a mode needs
 *     ships as one of these tags, so index.html is the authoritative code list.
 *   - creature art (Quiz, Parejas, Sombra, Timeline...): public/data/questions.json's
 *     `image` / `imageRealistic` / `imageFallback` fields, each prefixed with the
 *     canonical IMAGE_BASE_PATH ('/assets/images/', questionScreen.js:176). This
 *     is exactly how dinosaurs/*.svg, realistic/*.jpg and fallback/*.svg enter
 *     the universe -- from references, not a directory walk, and with no
 *     directory excluded.
 *   - selector illustrations, mascot, feedback sounds, i18n bundle, and any
 *     other statically-embedded asset URL: an anchored literal sweep across the
 *     entry scripts + CSS + index.html (see collectAssetLiterals).
 *   - i18n files: one per supported locale, taken from the canonical loader
 *     src/i18n/index.js (currently only 'es'); NOT from listing public/i18n/ on
 *     disk, which would wrongly demand locales that are not runtime-supported.
 *
 * Two gates are kept strictly independent:
 *   - COMPLETENESS (referencedLocalAssets − PRECACHE_URLS must be empty). Reads
 *     nothing from the versioning fixture or SW_VERSION, so no snapshot refresh
 *     or version bump can hide a missing referenced asset.
 *   - VERSIONING (current PRECACHE set vs the last approved fixture pair; a
 *     changed set demands a strictly bumped SW_VERSION). Reads nothing that
 *     feeds completeness, so an updated fixture can never turn an incomplete
 *     list into a "valid" one.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
const INDEX_HTML_PATH = path.resolve(__dirname, '../../public/index.html');
const ES_JSON_PATH = path.resolve(__dirname, '../../public/i18n/es.json');
const SNAPSHOT_PATH = path.resolve(__dirname, 'fixtures/precache-snapshot.json');

// The live source of truth: never re-declare a second copy of PRECACHE_URLS.
// eslint-disable-next-line global-require
const { PRECACHE_URLS, SW_VERSION } = require(SW_PATH);
// The canonical mode list and locale loader (single sources of truth), used to
// scope the sweep and the sanity assertions -- not to hand-list assets.
// eslint-disable-next-line global-require
const { MODES_CATALOG } = require('../../public/scripts/modesCatalog');
// eslint-disable-next-line global-require
const i18nLoader = require('../../src/i18n/index.js');

const MODE_IDS = MODES_CATALOG.map((mode) => mode.id);

// Canonical base path the screens prepend to a creature's stored image field
// (public/scripts/questionScreen.js:176 `IMAGE_BASE_PATH = '/assets/images/'`),
// mirrored here so data-driven art enters the universe exactly as the app
// builds it at runtime -- by reference, not by directory walk.
const IMAGE_BASE_PATH = '/assets/images/';

// ---------------------------------------------------------------------------
// Normalization: a single deterministic rule applied identically to discovered
// references and to PRECACHE_URLS entries, so a filesystem path is never
// compared directly against a public URL.
// ---------------------------------------------------------------------------

/**
 * Normalizes an asset reference into a canonical public URL ("/dir/file.ext"),
 * or returns null for references that are not local precacheable resources.
 *
 * @param {string} ref       the raw reference (an href/src/url()/string literal)
 * @param {string} fromFile  public-relative posix path of the file that
 *                           contains `ref` (used to resolve relative refs)
 */
function toPublicUrl(ref, fromFile) {
  if (typeof ref !== 'string') {
    return null;
  }
  const trimmed = ref.trim();
  if (trimmed === '') {
    return null;
  }

  // --- The ONLY permitted exclusions: non-local / non-precacheable resources.
  // Each category is a resource the service worker cannot precache from the
  // repo, so it can never be part of the expected local universe. There is NO
  // exclusion by folder, visual type, "shared"/"reused" status, fallback or
  // realistic nature -- those are all in scope when referenced.
  //   - absolute URLs with a scheme: http:, https:, data:, blob:, mailto:, tel:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }
  //   - protocol-relative URLs (e.g. //cdn.example.com/x.js): remote, not local
  if (trimmed.startsWith('//')) {
    return null;
  }

  // Drop fragments and query strings before any resolution/comparison.
  const withoutHash = trimmed.split('#')[0];
  const clean = withoutHash.split('?')[0];
  if (clean === '') {
    return null;
  }

  // Resolve relative references against the containing file's directory (covers
  // CSS `url(...)` and any relative import); absolute refs are taken as-is.
  let resolved;
  if (clean.startsWith('/')) {
    resolved = clean;
  } else {
    const baseDir = path.posix.dirname(fromFile || '');
    resolved = path.posix.resolve('/', baseDir, clean);
  }

  // Strip a leading filesystem `public/` prefix if one slipped in, so a repo
  // path under public/ maps to the same public URL as the browser would fetch.
  resolved = resolved.replace(/^\/public\//, '/');
  resolved = resolved.replace(/^public\//, '/');

  // Collapse `\` to `/` and guarantee a single leading slash.
  resolved = resolved.split('\\').join('/');
  if (!resolved.startsWith('/')) {
    resolved = `/${resolved}`;
  }
  resolved = resolved.replace(/\/{2,}/g, '/');
  return resolved;
}

// ---------------------------------------------------------------------------
// Reference discovery: each extractor records provenance in a Map<url, Set>.
// Discovery is reference-based -- a referenced file that is absent on disk
// stays in the universe and produces a diagnostic instead of vanishing.
// ---------------------------------------------------------------------------

function readPublicFile(relPath) {
  return fs.readFileSync(path.join(PUBLIC_DIR, relPath), 'utf-8');
}

function addRef(map, url, provenance) {
  if (!url) {
    return;
  }
  if (!map.has(url)) {
    map.set(url, new Set());
  }
  map.get(url).add(provenance);
}

// Anchored literal sweep: only matches an asset URL that directly follows a
// string/backtick/paren delimiter, so require() paths like
// `require('../../src/data/questionBank')` are never mis-read as `/data/...`
// public URLs. Matches /(assets|icons|styles|scripts|i18n|data)/…​.ext .
const ASSET_LITERAL_RE = /["'`(](\/(?:assets|icons|styles|scripts|i18n|data)\/[A-Za-z0-9_.\-/]+\.[A-Za-z0-9]+)/g;

function collectAssetLiterals(refs, relFile) {
  let text;
  try {
    text = readPublicFile(relFile);
  } catch (error) {
    // A referenced source that cannot be read is an actionable external defect,
    // not something to silently skip.
    addRef(refs, `UNPARSEABLE:${relFile}`, `unreadable source: ${relFile} (${error.message})`);
    return;
  }
  for (const match of text.matchAll(ASSET_LITERAL_RE)) {
    addRef(refs, toPublicUrl(match[1], relFile), relFile);
  }
}

/**
 * Builds the full expected universe of local precacheable assets referenced by
 * the selector, the common flows and the eight modes. Returns a Map from
 * normalized public URL to a Set of provenance strings.
 *
 * Sentinel keys prefixed `UNPARSEABLE:` flag sources that could not be parsed;
 * callers surface them as a distinct diagnostic category.
 */
function collectReferencedAssets() {
  const refs = new Map();

  // 1. index.html <script src> + <link href> graph (scripts, css, manifest, icon).
  let indexHtml;
  try {
    indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  } catch (error) {
    addRef(refs, 'UNPARSEABLE:index.html', `unreadable index.html (${error.message})`);
    indexHtml = '';
  }
  for (const match of indexHtml.matchAll(/<script\s+[^>]*\bsrc="([^"]+)"/g)) {
    addRef(refs, toPublicUrl(match[1], 'index.html'), 'index.html <script src>');
  }
  for (const match of indexHtml.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)) {
    addRef(refs, toPublicUrl(match[1], 'index.html'), 'index.html <link href>');
  }

  // 2. Anchored asset-literal sweep across index.html, the served stylesheet and
  //    every entry script. Catches selector illustrations (modeSelectorScreen),
  //    the mascot (homeScreen), feedback sounds (soundService/audio), the i18n
  //    bundle and the questions data document wherever they appear as literals.
  const scriptFiles = Array.from(indexHtml.matchAll(/<script\s+[^>]*\bsrc="\/([^"]+)"/g)).map(
    (match) => match[1],
  );
  const sweepFiles = ['index.html', 'styles/main.css', ...scriptFiles];
  for (const relFile of sweepFiles) {
    collectAssetLiterals(refs, relFile);
  }

  // 3. i18n files for every locale the canonical loader supports (currently only
  //    'es'). Derived from src/i18n/index.js, never from listing public/i18n/.
  for (const locale of i18nLoader.SUPPORTED_LOCALES) {
    addRef(refs, toPublicUrl(`/i18n/${locale}.json`, 'i18n'), `src/i18n loader locale "${locale}"`);
  }

  // 4. Creature art from the question bank consumed by the modes. Every
  //    `image`/`imageRealistic`/`imageFallback` field is prefixed with the
  //    canonical IMAGE_BASE_PATH -- the same construction questionScreen.js
  //    performs at runtime. This is how dinosaurs/, realistic/ and fallback/
  //    art enters the universe: by reference, with NO directory excluded.
  let questions;
  try {
    questions = JSON.parse(readPublicFile('data/questions.json'));
  } catch (error) {
    addRef(refs, 'UNPARSEABLE:data/questions.json', `unparseable questions.json (${error.message})`);
    questions = {};
  }
  for (const key of Object.keys(questions)) {
    const question = questions[key];
    if (!question || typeof question !== 'object') {
      continue;
    }
    ['image', 'imageRealistic', 'imageFallback'].forEach((field) => {
      const value = question[field];
      if (typeof value === 'string' && value !== '') {
        addRef(
          refs,
          toPublicUrl(IMAGE_BASE_PATH + value, 'data/questions.json'),
          `data/questions.json[${key}].${field}`,
        );
      }
    });
  }

  return refs;
}

// ---------------------------------------------------------------------------
// Completeness computation -- pure, and independent of the snapshot/version.
// Given ANY precache list it returns categorized diagnostics; it reads neither
// the fixture nor SW_VERSION, so refreshing the snapshot or bumping the version
// can never make a missing referenced asset disappear from this result.
// ---------------------------------------------------------------------------

function computeCompleteness(precacheList) {
  const refs = collectReferencedAssets();
  const precacheSet = new Set(
    precacheList
      .map((url) => toPublicUrl(url, 'precache'))
      .filter((url) => url !== null),
  );

  const unparseable = [];
  const missingFromPrecache = [];
  const referencedButAbsentOnDisk = [];

  for (const [url, provenance] of refs) {
    const sources = Array.from(provenance).sort();
    if (url.startsWith('UNPARSEABLE:')) {
      unparseable.push({ source: url.slice('UNPARSEABLE:'.length), provenance: sources });
      continue;
    }
    if (!precacheSet.has(url)) {
      missingFromPrecache.push({ url, provenance: sources });
    }
    // Existence is a separate, distinct diagnostic: a referenced local file
    // absent on disk is an external defect, surfaced -- not silenced.
    const relOnDisk = url === '/' ? 'index.html' : url.replace(/^\//, '');
    if (!fs.existsSync(path.join(PUBLIC_DIR, relOnDisk))) {
      referencedButAbsentOnDisk.push({ url, provenance: sources });
    }
  }

  missingFromPrecache.sort((a, b) => a.url.localeCompare(b.url));
  referencedButAbsentOnDisk.sort((a, b) => a.url.localeCompare(b.url));
  return { missingFromPrecache, referencedButAbsentOnDisk, unparseable };
}

function formatDiagnostics(entries) {
  return entries
    .map((entry) => `  ${entry.url} -- referenced by e.g. ${entry.provenance[0]}`)
    .join('\n');
}

// ---------------------------------------------------------------------------

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

  test('every referenced source parses (unparseable sources are an external defect)', () => {
    const { unparseable } = computeCompleteness(PRECACHE_URLS);
    expect(unparseable).toEqual([]);
  });

  test('the reference universe reaches shared creature art in dinosaurs/, fallback/ and realistic/', () => {
    // Prove the discovery is not blind to shared/reused/fallback/realistic art:
    // these are referenced by the modes (via questions.json) and MUST be in the
    // derived universe -- no directory is allow-listed out.
    const referenced = new Set(collectReferencedAssets().keys());
    expect(referenced.has('/assets/images/dinosaurs/trex.svg')).toBe(true);
    expect(referenced.has('/assets/images/fallback/trex.svg')).toBe(true);
    expect(referenced.has('/assets/images/realistic/trex.jpg')).toBe(true);
    expect(referenced.has('/assets/images/modes/quiz.svg')).toBe(true);
  });

  test('every local asset referenced by the eight modes and their common flows is declared in PRECACHE_URLS', () => {
    const { missingFromPrecache } = computeCompleteness(PRECACHE_URLS);
    if (missingFromPrecache.length > 0) {
      // Actionable diagnostic: normalized public URL + a referencing file/flow.
      throw new Error(
        `${missingFromPrecache.length} referenced local asset(s) are not in PRECACHE_URLS:\n${formatDiagnostics(
          missingFromPrecache,
        )}`,
      );
    }
    expect(missingFromPrecache).toEqual([]);
  });

  test('every referenced local asset exists on disk under public/ (broken references are an external defect)', () => {
    const { referencedButAbsentOnDisk } = computeCompleteness(PRECACHE_URLS);
    if (referencedButAbsentOnDisk.length > 0) {
      throw new Error(
        `${referencedButAbsentOnDisk.length} referenced local asset(s) are missing on disk:\n${formatDiagnostics(
          referencedButAbsentOnDisk,
        )}`,
      );
    }
    expect(referencedButAbsentOnDisk).toEqual([]);
  });

  test('shared art keeps enough provenance to prove it is a required shared resource', () => {
    // trex.svg is referenced by many question entries -- provenance must retain
    // more than one referencing flow so a reviewer can see it is shared, not a
    // stray single-use asset that could be dropped.
    const refs = collectReferencedAssets();
    const provenance = refs.get('/assets/images/dinosaurs/trex.svg');
    expect(provenance).toBeDefined();
    expect(provenance.size).toBeGreaterThan(1);
  });
});

describe('TRIOFSND-326: completeness is independent of the snapshot and SW_VERSION', () => {
  // Mandatory regression for the reviewer's exact escape hatch. Removing a
  // still-referenced shared image from an IN-MEMORY copy of PRECACHE_URLS must
  // be reported as missing -- even if, in the same scenario, SW_VERSION is
  // bumped and the historical reference is repointed at the incomplete list.
  const SHARED_IMAGE = '/assets/images/dinosaurs/trex.svg';

  test('the regression target is genuinely referenced and precached in the approved baseline', () => {
    const refs = collectReferencedAssets();
    expect(refs.has(SHARED_IMAGE)).toBe(true); // still referenced via questions.json
    expect(PRECACHE_URLS.map((u) => toPublicUrl(u, 'precache'))).toContain(SHARED_IMAGE);
  });

  test('dropping a referenced shared image fails completeness even with a bumped version and refreshed reference', () => {
    // A future PR drops the shared image from the precache list...
    const mutatedPrecache = PRECACHE_URLS.filter(
      (url) => toPublicUrl(url, 'precache') !== SHARED_IMAGE,
    );
    // ...and tries to launder it past the version gate by bumping SW_VERSION and
    // re-recording the historical reference to match the mutated (incomplete)
    // list. None of that is visible to the completeness computation:
    const scenarioSwVersion = 'v999';
    const scenarioReference = { swVersion: scenarioSwVersion, precacheUrls: [...mutatedPrecache].sort() };
    void scenarioSwVersion; // completeness never reads a version
    void scenarioReference; // completeness never reads a reference/snapshot

    const { missingFromPrecache } = computeCompleteness(mutatedPrecache);
    const missingUrls = missingFromPrecache.map((entry) => entry.url);
    expect(missingUrls).toContain(SHARED_IMAGE);
    // Provenance is preserved so the failure names a referencing flow.
    const entry = missingFromPrecache.find((item) => item.url === SHARED_IMAGE);
    expect(entry.provenance.length).toBeGreaterThan(0);
  });

  test('the regression writes nothing to service-worker.js or product files', () => {
    // The real precache list is untouched by the in-memory mutation above.
    expect(PRECACHE_URLS.map((u) => toPublicUrl(u, 'precache'))).toContain(SHARED_IMAGE);
    const swOnDisk = fs.readFileSync(SW_PATH, 'utf-8');
    expect(swOnDisk).toContain("'/assets/images/dinosaurs/trex.svg'");
  });
});

describe('TRIOFSND-326: supporting sanity checks', () => {
  test('the i18n bundle is precached and carries copy for every mode', () => {
    expect(PRECACHE_URLS).toContain('/i18n/es.json');
    const es = JSON.parse(fs.readFileSync(ES_JSON_PATH, 'utf-8'));
    MODE_IDS.forEach((modeId) => {
      expect(es.modes && es.modes[modeId]).toBeTruthy();
    });
  });

  test('every script the app shell loads is precached', () => {
    const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
    const scriptSrcs = Array.from(indexHtml.matchAll(/<script\s+[^>]*\bsrc="([^"]+)"/g)).map(
      (match) => match[1],
    );
    expect(scriptSrcs.length).toBeGreaterThan(0);
    scriptSrcs.forEach((src) => {
      expect(PRECACHE_URLS).toContain(src);
    });
  });
});

describe('TRIOFSND-326: SW_VERSION bump gate (independent of completeness)', () => {
  let snapshot;

  beforeAll(() => {
    // This gate -- and ONLY this gate -- reads the historical reference. The
    // completeness computation above never opens this fixture.
    expect(fs.existsSync(SNAPSHOT_PATH)).toBe(true);
    snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
  });

  function versionOrdinal(version) {
    const match = /^v(\d+)$/.exec(version);
    expect(match).not.toBeNull();
    return Number(match[1]);
  }

  // Compare as sorted, normalized sets so the result never depends on the
  // incidental order of entries.
  function normalizedSorted(list) {
    return Array.from(
      new Set(list.map((url) => toPublicUrl(url, 'precache')).filter((url) => url !== null)),
    ).sort();
  }

  test('a changed PRECACHE_URLS requires a strictly bumped SW_VERSION', () => {
    const currentUrls = normalizedSorted(PRECACHE_URLS);
    const snapshotUrls = normalizedSorted(snapshot.precacheUrls);
    const listChanged = JSON.stringify(currentUrls) !== JSON.stringify(snapshotUrls);

    if (!listChanged) {
      // No add/remove since the reference: the version may stay put, but must
      // never fall behind the last known-good one.
      expect(versionOrdinal(SW_VERSION)).toBeGreaterThanOrEqual(versionOrdinal(snapshot.swVersion));
      return;
    }

    // The precache list changed vs the approved reference: per the PRD
    // constraint ("cada cambio de caché debe incrementar SW_VERSION"),
    // SW_VERSION must have moved strictly forward, and
    // tests/pwa/fixtures/precache-snapshot.json must be refreshed in the same
    // change. There is no auto-update mode that silences a missing bump.
    if (versionOrdinal(SW_VERSION) <= versionOrdinal(snapshot.swVersion)) {
      throw new Error(
        `PRECACHE_URLS changed but SW_VERSION was not bumped (still ${SW_VERSION}, reference ${snapshot.swVersion}). ` +
          'Bump SW_VERSION and refresh tests/pwa/fixtures/precache-snapshot.json together.',
      );
    }
    expect(versionOrdinal(SW_VERSION)).toBeGreaterThan(versionOrdinal(snapshot.swVersion));
  });

  test('the versioning gate simulation stays independent of completeness', () => {
    // A drifted reference + bumped version passes the version gate on its own,
    // without prejudging completeness (which is asserted separately above).
    const driftedReference = ['/index.html'];
    const currentUrls = normalizedSorted(PRECACHE_URLS);
    const changed = JSON.stringify(currentUrls) !== JSON.stringify(normalizedSorted(driftedReference));
    expect(changed).toBe(true);
    // A strictly greater version clears the version gate for this drift...
    expect(versionOrdinal(SW_VERSION)).toBeGreaterThan(versionOrdinal('v0'));
    // ...yet completeness is computed from references alone and is unaffected.
    const { missingFromPrecache } = computeCompleteness(PRECACHE_URLS);
    expect(missingFromPrecache).toEqual([]);
  });
});
