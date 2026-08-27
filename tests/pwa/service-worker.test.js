const fs = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');

describe('TRIOFSND-110: service worker source', () => {
  let swContent;

  beforeAll(() => {
    expect(fs.existsSync(SW_PATH)).toBe(true);
    swContent = fs.readFileSync(SW_PATH, 'utf-8');
  });

  test('registers install, activate and fetch listeners', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('precaches the app shell on install and calls skipWaiting', () => {
    expect(swContent).toMatch(/caches\.open/);
    expect(swContent).toMatch(/cache\.addAll\(PRECACHE_URLS\)/);
    expect(swContent).toMatch(/skipWaiting/);
  });

  test('precache list covers the core app shell files', () => {
    ['/index.html', '/manifest.json', '/styles/main.css', '/scripts/main.js', '/offline.html'].forEach((url) => {
      expect(swContent).toContain(`'${url}'`);
    });
  });

  test('every precached URL exists in public/', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const publicDir = path.resolve(__dirname, '../../public');
    PRECACHE_URLS.forEach((url) => {
      const relative = url === '/' ? 'index.html' : url.replace(/^\//, '');
      expect(fs.existsSync(path.join(publicDir, relative))).toBe(true);
    });
  });

  test('precache list includes every <script> the app shell (public/index.html) loads', () => {
    // Regression: any script missing here fails to load once the SW serves
    // an offline session that never fetched it directly over the network
    // (e.g. ageGateScreen.js was left out, so a fully-offline "8+ años"
    // player never got their age band captured -- gameFlow.js's
    // resolveLevelOutcome then always fell back to the age-restricted path,
    // ending the game after every level's 10 questions regardless of score).
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const indexHtmlPath = path.resolve(__dirname, '../../public/index.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    const scriptSrcs = Array.from(indexHtml.matchAll(/<script\s+src="([^"]+)"/g)).map((match) => match[1]);

    expect(scriptSrcs.length).toBeGreaterThan(0);
    scriptSrcs.forEach((src) => {
      expect(PRECACHE_URLS).toContain(src);
    });
  });

  test('precaches both the drawn and realistic variant for every dinosaur (TRIOFSND-195)', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const dinosaursWithJpgRealistic = [
      'trex',
      'triceratops',
      'velociraptor',
      'estegosaurio',
      'braquiosaurio',
      'ankylosaurus',
      'pteranodon',
      // Levels 6-10 (TRIOFSND-202): seven more dinosaurs, same jpg realistic variant.
      'spinosaurus',
      'dilophosaurus',
      'pachycephalosaurus',
      'compsognathus',
      'diplodocus',
      'iguanodon',
      'parasaurolophus',
    ];

    dinosaursWithJpgRealistic.forEach((dinosaur) => {
      expect(PRECACHE_URLS).toContain(`/assets/images/dinosaurs/${dinosaur}.svg`);
      expect(PRECACHE_URLS).toContain(`/assets/images/realistic/${dinosaur}.jpg`);
    });
  });

  test('the seven original dinosaurs precache their own fallback SVG (TRIOFSND-195)', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const dinosaursWithOwnFallback = [
      'trex',
      'triceratops',
      'velociraptor',
      'estegosaurio',
      'braquiosaurio',
      'ankylosaurus',
      'pteranodon',
    ];

    dinosaursWithOwnFallback.forEach((dinosaur) => {
      expect(PRECACHE_URLS).toContain(`/assets/images/fallback/${dinosaur}.svg`);
    });
  });

  test('the levels 6-10 dinosaurs reuse the generic fallback instead of a per-dinosaur SVG', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const newDinosaurs = [
      'spinosaurus',
      'dilophosaurus',
      'pachycephalosaurus',
      'compsognathus',
      'diplodocus',
      'iguanodon',
      'parasaurolophus',
    ];

    expect(PRECACHE_URLS).toContain('/assets/images/fallback/generic.svg');
    newDinosaurs.forEach((dinosaur) => {
      expect(PRECACHE_URLS).not.toContain(`/assets/images/fallback/${dinosaur}.svg`);
    });
  });

  test('drops old caches and claims clients on activate', () => {
    expect(swContent).toMatch(/caches\s*\.\s*keys/);
    expect(swContent).toMatch(/caches\.delete/);
    expect(swContent).toMatch(/clients\.claim/);
  });

  test('serves runtime-cached assets cache-first and falls back to the offline page for navigations', () => {
    expect(swContent).toMatch(/caches\.match/);
    expect(swContent).toContain("'/offline.html'");
    expect(swContent).toMatch(/request\.mode\s*===\s*['"]navigate['"]/);
  });
});

describe('TRIOFSND-266: precache covers every level 6-10 asset actually referenced by the question bank', () => {
  // eslint-disable-next-line global-require
  const { PRECACHE_URLS } = require(SW_PATH);
  const QUESTIONS_PATH = path.resolve(__dirname, '../../public/data/questions.json');
  const IMAGE_BASE_PATH = '/assets/images/';
  const IMAGE_FIELDS = ['image', 'imageRealistic', 'imageFallback'];

  let questions;
  let level6To10Questions;

  beforeAll(() => {
    expect(fs.existsSync(QUESTIONS_PATH)).toBe(true);
    // eslint-disable-next-line global-require
    questions = require(QUESTIONS_PATH);
    level6To10Questions = questions.filter((question) => question.level >= 6 && question.level <= 10);
  });

  test('the published question bank and i18n strings are precached', () => {
    expect(PRECACHE_URLS).toContain('/data/questions.json');
    expect(PRECACHE_URLS).toContain('/i18n/es.json');
  });

  test('levels 6-10 carry exactly 150 questions (30 per level, guards against a partial bank)', () => {
    expect(level6To10Questions).toHaveLength(150);
  });

  test('every unique image/imageRealistic/imageFallback URL referenced by levels 6-10 is precached', () => {
    const referencedUrls = new Set();
    level6To10Questions.forEach((question) => {
      IMAGE_FIELDS.forEach((field) => {
        if (typeof question[field] === 'string' && question[field] !== '') {
          referencedUrls.add(IMAGE_BASE_PATH + question[field]);
        }
      });
    });

    expect(referencedUrls.size).toBeGreaterThan(0);
    referencedUrls.forEach((url) => {
      expect(PRECACHE_URLS).toContain(url);
    });
  });

  test('every URL referenced by levels 6-10 maps to a file actually shipped under public/', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    level6To10Questions.forEach((question) => {
      IMAGE_FIELDS.forEach((field) => {
        const value = question[field];
        expect(typeof value === 'string' && value !== '').toBe(true);
        const relativePath = path.join('assets/images', value);
        expect(fs.existsSync(path.join(publicDir, relativePath))).toBe(true);
      });
    });
  });
});

describe('TRIOFSND-110: isRuntimeCacheable', () => {
  // eslint-disable-next-line global-require
  const { isRuntimeCacheable } = require(SW_PATH);

  test('caches dinosaur images', () => {
    expect(isRuntimeCacheable('/assets/images/trex.png')).toBe(true);
    expect(isRuntimeCacheable('/assets/images/triceratops.webp')).toBe(true);
  });

  test('caches sound effects', () => {
    expect(isRuntimeCacheable('/assets/sounds/correct.mp3')).toBe(true);
    expect(isRuntimeCacheable('/assets/sounds/wrong.ogg')).toBe(true);
  });

  test('caches the question bank JSON', () => {
    expect(isRuntimeCacheable('/data/questions.json')).toBe(true);
  });

  test('does not runtime-cache unrelated JS or API-shaped paths', () => {
    expect(isRuntimeCacheable('/scripts/main.js')).toBe(false);
    expect(isRuntimeCacheable('/manifest.json')).toBe(false);
  });
});
