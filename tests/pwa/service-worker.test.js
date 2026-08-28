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

  test('precaches the three timeline period illustrations (TRIOFSND-295)', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    ['triasico', 'jurasico', 'cretacico'].forEach((period) => {
      expect(PRECACHE_URLS).toContain(`/assets/images/periods/${period}.svg`);
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

describe('TRIOFSND-268: Oído Jurásico sounds and copy precached for offline play', () => {
  const OIDO_JURASICO_DIR = path.resolve(__dirname, '../../public/assets/sounds/oido-jurasico');

  function listOidoJurasicoAudioUrls() {
    return fs
      .readdirSync(OIDO_JURASICO_DIR)
      .filter((file) => file.endsWith('.wav'))
      .sort()
      .map((file) => `/assets/sounds/oido-jurasico/${file}`);
  }

  test('every Oído Jurásico creature sound file is listed in PRECACHE_URLS', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const audioUrls = listOidoJurasicoAudioUrls();

    expect(audioUrls.length).toBeGreaterThan(0);
    audioUrls.forEach((url) => {
      expect(PRECACHE_URLS).toContain(url);
    });
  });

  test('the i18n copy introducing Oído Jurásico ships inside the already-precached i18n/es.json', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    // eslint-disable-next-line global-require
    const es = require('../../public/i18n/es.json');

    expect(PRECACHE_URLS).toContain('/i18n/es.json');
    expect(es.oidoJurasico).toBeDefined();
    expect(es.oidoJurasico.imaginedSoundNotice).toBeDefined();
  });

  test('a clean install makes every Oído Jurásico resource available from cache once the network is disabled', async () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    const oidoJurasicoResources = [...listOidoJurasicoAudioUrls(), '/i18n/es.json'];

    // A fresh device: no pre-existing cache entries ("instalación limpia").
    const store = new Map();
    const fakeCache = {
      addAll: async (urls) => {
        await Promise.all(
          urls.map(async (url) => {
            const response = await self.fetch(url);
            if (!response || !response.ok) {
              throw new Error(`precache failed for ${url}`);
            }
            store.set(url, response);
          })
        );
      },
    };
    self.caches = {
      open: async () => fakeCache,
      match: async (url) => store.get(url),
      keys: async () => [],
      delete: async () => true,
    };
    self.skipWaiting = jest.fn();
    // Stands in for the one-time online fetch a real install performs; every
    // assertion after this point must be satisfied purely from `store`.
    self.fetch = jest.fn(async (url) => ({ ok: true, url, clone: () => ({ url }) }));

    try {
      const installEvent = new Event('install');
      let installPromise = Promise.resolve();
      installEvent.waitUntil = (promise) => {
        installPromise = promise;
      };
      self.dispatchEvent(installEvent);
      await installPromise;

      expect(self.fetch).toHaveBeenCalledTimes(PRECACHE_URLS.length);

      // The device goes fully offline: any further fetch must fail loudly,
      // so the lookups below can only succeed if install-time caching worked.
      self.fetch = jest.fn(async () => {
        throw new Error('network disabled');
      });

      const cachedResults = await Promise.all(oidoJurasicoResources.map((url) => self.caches.match(url)));
      cachedResults.forEach((cached) => {
        expect(cached).toBeDefined();
      });
      expect(self.fetch).not.toHaveBeenCalled();
    } finally {
      delete self.caches;
      delete self.skipWaiting;
      delete self.fetch;
    }
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
