const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(process.cwd(), 'public', 'service-worker.js');

let swContent;

describe('Service Worker Configuration', () => {
  beforeAll(() => {
    swContent = fs.readFileSync(SW_PATH, 'utf-8');
  });

  test('service-worker.js exists in public directory', () => {
    expect(fs.existsSync(SW_PATH)).toBe(true);
  });

  test('service worker registers an install event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
  });

  test('service worker registers an activate event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
  });

  test('service worker registers a fetch event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('service worker caches assets on install', () => {
    expect(swContent).toMatch(/caches\.open/);
    expect(swContent).toMatch(/cache\.addAll/);
  });

  test('service worker defines a cache name/version', () => {
    expect(swContent).toMatch(/CACHE_NAME|CACHE|cacheName/i);
  });

  test('service worker cleans old caches on activate', () => {
    expect(swContent).toMatch(/caches\.keys/);
    expect(swContent).toMatch(/caches\.delete/);
  });

  test('service worker implements a caching strategy (cache-first or network-first)', () => {
    const hasCacheFirst = /caches\.match/.test(swContent);
    const hasNetworkFirst = /fetch\s*\(/.test(swContent);
    expect(hasCacheFirst || hasNetworkFirst).toBe(true);
  });

  test('service worker handles fetch failures gracefully', () => {
    expect(swContent).toMatch(/catch|fallback|offline/i);
  });

  test('service worker uses skipWaiting for faster activation', () => {
    expect(swContent).toMatch(/skipWaiting/);
  });

  test('service worker uses clients.claim for immediate control', () => {
    expect(swContent).toMatch(/clients\.claim/);
  });
});
