const fs = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-53: Service Worker Configuration', () => {
  let swContent;
  let indexHtml;

  beforeAll(() => {
    expect(fs.existsSync(SW_PATH)).toBe(true);
    swContent = fs.readFileSync(SW_PATH, 'utf-8');
    indexHtml = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf-8') : '';
  });

  test('service-worker.js file exists', () => {
    expect(swContent).toBeDefined();
    expect(swContent.length).toBeGreaterThan(0);
  });

  test('service worker registers install event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
  });

  test('service worker registers activate event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
  });

  test('service worker registers fetch event listener', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('service worker caches assets on install', () => {
    expect(swContent).toMatch(/caches\.open/);
    expect(swContent).toMatch(/CACHE_NAME|cacheName|cache_name/i);
  });

  test('service worker has a predefined cache list or pre-cache mechanism', () => {
    const hasUrlsToCache = swContent.match(/urlsToCache|precache|urls_to_cache|ASSETS_TO_CACHE|ASSETS/i);
    expect(hasUrlsToCache).not.toBeNull();
  });

  test('service worker cleans old caches on activate', () => {
    expect(swContent).toMatch(/caches\.keys/);
    expect(swContent).toMatch(/caches\.delete/);
  });

  test('service worker implements cache-first or stale-while-revalidate strategy', () => {
    const hasCacheFirst = /caches\.match/.test(swContent);
    const hasStaleWhileRevalidate = /stale.?while.?revalidate/i.test(swContent);
    const hasNetworkFirst = /fetch\s*\(.*\)\.then.*caches\.put/s.test(swContent);
    expect(hasCacheFirst || hasStaleWhileRevalidate || hasNetworkFirst).toBe(true);
  });

  test('service worker handles offline fallback', () => {
    const hasFallback = /fallback|offline/i.test(swContent);
    expect(hasFallback).toBe(true);
  });

  test('service worker precaches index.html and core assets', () => {
    expect(swContent).toContain('/index.html');
    expect(swContent).toContain('/styles/main.css');
    expect(swContent).toContain('/scripts/main.js');
    expect(swContent).toContain('/offline.html');
  });

  test('service worker returns offline.html for failed HTML navigation requests', () => {
    expect(swContent).toContain('/offline.html');
    expect(swContent).toMatch(/text\/html/);
  });

  test('service worker calls skipWaiting on install', () => {
    expect(swContent).toMatch(/skipWaiting/);
  });

  test('index.html registers the service worker', () => {
    expect(indexHtml).toMatch(/serviceWorker\.register|navigator\.serviceWorker/i);
  });

  test('service worker registration uses correct path', () => {
    expect(indexHtml).toMatch(/register\s*\(\s*['"]\/service-worker\.js['"]/);
  });

  test('service worker registration has error handling', () => {
    expect(indexHtml).toMatch(/\.catch|\.then.*err|console\.error|console\.log.*err/i);
  });

  test('service worker registration is guarded by feature detection', () => {
    expect(indexHtml).toMatch(/['"]serviceWorker['"]\s+in\s+navigator/);
  });
});
