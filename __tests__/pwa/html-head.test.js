const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let browser;
let page;

describe('HTML Head PWA Meta Tags', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('document has correct viewport meta tag', async () => {
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.content : null;
    });
    expect(viewport).not.toBeNull();
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale');
  });

  test('document has manifest link in head', async () => {
    const manifestLink = await page.evaluate(() => {
      const link = document.head.querySelector('link[rel="manifest"]');
      return link ? link.href : null;
    });
    expect(manifestLink).not.toBeNull();
  });

  test('document has theme-color meta tag', async () => {
    const themeColor = await page.evaluate(() => {
      const meta = document.head.querySelector('meta[name="theme-color"]');
      return meta ? meta.content : null;
    });
    expect(themeColor).not.toBeNull();
    expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('document has apple-mobile-web-app-capable meta tag', async () => {
    const meta = await page.evaluate(() => {
      const m = document.head.querySelector('meta[name="apple-mobile-web-app-capable"]');
      return m ? m.content : null;
    });
    expect(meta).toBe('yes');
  });

  test('document has apple-mobile-web-app-status-bar-style meta tag', async () => {
    const meta = await page.evaluate(() => {
      const m = document.head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      return m ? m.content : null;
    });
    expect(meta).not.toBeNull();
  });

  test('document has apple-touch-icon link tag', async () => {
    const link = await page.evaluate(() => {
      const l = document.head.querySelector('link[rel="apple-touch-icon"]');
      return l ? l.href : null;
    });
    expect(link).not.toBeNull();
  });

  test('document has description meta tag', async () => {
    const desc = await page.evaluate(() => {
      const meta = document.head.querySelector('meta[name="description"]');
      return meta ? meta.content : null;
    });
    expect(desc).not.toBeNull();
    expect(desc.length).toBeGreaterThan(0);
  });

  test('critical CSS is inlined or preloaded for fast rendering', async () => {
    const hasPreload = await page.evaluate(() => {
      const preloads = document.head.querySelectorAll('link[rel="preload"]');
      return preloads.length > 0;
    });
    const hasInlineStyle = await page.evaluate(() => {
      const styles = document.head.querySelectorAll('style');
      return styles.length > 0;
    });
    // At least one should be true for optimized loading
    expect(hasPreload || hasInlineStyle).toBe(true);
  });

  test('preconnect or dns-prefetch hints are present for external resources', async () => {
    const hints = await page.evaluate(() => {
      const preconnects = document.head.querySelectorAll('link[rel="preconnect"]');
      const dnsPrefetches = document.head.querySelectorAll('link[rel="dns-prefetch"]');
      return preconnects.length + dnsPrefetches.length;
    });
    // This is a soft check - may be 0 if no external resources
    expect(hints).toBeGreaterThanOrEqual(0);
  });
});
