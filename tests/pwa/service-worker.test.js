const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('TRIOFSND-53: PWA Service Worker Registration', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  test('service worker should be registered', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    expect(swRegistered).toBe(true);
  }, 30000);

  test('service worker should control the home page', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const controlled = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      return !!navigator.serviceWorker.controller;
    });

    expect(controlled).toBe(true);
  }, 30000);

  test('manifest link should be present in HTML head', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.href : null;
    });

    expect(manifestLink).toBeTruthy();
    expect(manifestLink).toContain('manifest');
  }, 30000);

  test('apple-touch-icon link should be present for iOS installability', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const appleTouchIcon = await page.evaluate(() => {
      const link = document.querySelector('link[rel="apple-touch-icon"]');
      return link ? link.href : null;
    });

    expect(appleTouchIcon).toBeTruthy();
  }, 30000);

  test('theme-color meta tag should be present', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta ? meta.content : null;
    });

    expect(themeColor).toBeTruthy();
  }, 30000);
});
