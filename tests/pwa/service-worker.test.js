const fs = require('fs');
const path = require('path');

const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('Service Worker Configuration', () => {
  let browser;
  let page;
  let swContent;

  beforeAll(async () => {
    expect(fs.existsSync(SW_PATH)).toBe(true);
    swContent = fs.readFileSync(SW_PATH, 'utf8');

    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('service worker file exists and is non-empty', () => {
    expect(swContent.length).toBeGreaterThan(0);
  });

  test('service worker registers an install event', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
  });

  test('service worker registers an activate event', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
  });

  test('service worker registers a fetch event', () => {
    expect(swContent).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
  });

  test('service worker caches assets on install', () => {
    expect(swContent).toMatch(/caches\.open/);
    expect(swContent).toMatch(/addAll/);
  });

  test('service worker handles cache cleanup on activate', () => {
    expect(swContent).toMatch(/caches\.keys/);
  });

  test('service worker is registered in the app', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const hasSW = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
    expect(hasSW).toBe(true);
  });

  test('service worker controls the page after activation', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const controlled = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      return !!navigator.serviceWorker.controller;
    });
    expect(controlled).toBe(true);
  });
});
