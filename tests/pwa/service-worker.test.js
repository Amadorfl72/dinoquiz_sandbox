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
