const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: 'new' });
  page = await browser.newPage();
});

afterAll(async () => {
  if (browser) await browser.close();
});

describe('TRIOFSND-53: PWA Manifest', () => {
  let manifest;

  beforeAll(async () => {
    const response = await page.goto(`${BASE_URL}/manifest.json`, {
      waitUntil: 'networkidle0',
    });
    expect(response.ok()).toBe(true);
    manifest = await response.json();
  });

  test('manifest is served with correct content type', async () => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/manifest+json');
  });

  test('manifest has a valid name', () => {
    expect(manifest.name).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
  });

  test('manifest has a valid short_name', () => {
    expect(manifest.short_name).toBeDefined();
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  test('manifest has a valid start_url', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
    expect(manifest.start_url.length).toBeGreaterThan(0);
  });

  test('manifest has a valid display mode', () => {
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    expect(manifest.display).toBeDefined();
    expect(validDisplayModes).toContain(manifest.display);
  });

  test('manifest has a valid background_color', () => {
    expect(manifest.background_color).toBeDefined();
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has a valid theme_color', () => {
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has at least two icons (192px and 512px)', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('manifest icons have valid type (image/png)', () => {
    manifest.icons.forEach((icon) => {
      expect(icon.type).toBeDefined();
      expect(icon.type).toBe('image/png');
    });
  });

  test('manifest icons have valid src paths', () => {
    manifest.icons.forEach((icon) => {
      expect(icon.src).toBeDefined();
      expect(typeof icon.src).toBe('string');
      expect(icon.src.length).toBeGreaterThan(0);
    });
  });

  test('manifest icons are accessible', async () => {
    for (const icon of manifest.icons) {
      const iconUrl = icon.src.startsWith('http')
        ? icon.src
        : `${BASE_URL}${icon.src.startsWith('/') ? '' : '/'}${icon.src}`;
      const response = await page.goto(iconUrl);
      expect(response.ok()).toBe(true);
    }
  });

  test('manifest has a maskable icon', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  test('manifest has orientation set', () => {
    const validOrientations = [
      'any',
      'natural',
      'landscape',
      'portrait',
      'portrait-primary',
      'portrait-secondary',
      'landscape-primary',
      'landscape-secondary',
    ];
    expect(manifest.orientation).toBeDefined();
    expect(validOrientations).toContain(manifest.orientation);
  });

  test('manifest link tag is present in HTML head', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const linkTag = await page.$eval(
      'link[rel="manifest"]',
      (el) => el.getAttribute('href')
    );
    expect(linkTag).toBeDefined();
    expect(linkTag).not.toBeNull();
  });

  test('theme-color meta tag is present in HTML head', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const themeColor = await page.$eval(
      'meta[name="theme-color"]',
      (el) => el.getAttribute('content')
    );
    expect(themeColor).toBeDefined();
    expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
