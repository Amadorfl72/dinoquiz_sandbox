const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '../../public/manifest.json');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-110: PWA manifest', () => {
  let manifest;
  let indexHtml;

  beforeAll(() => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
  });

  test('has required name and short_name', () => {
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  test('has a start_url', () => {
    expect(typeof manifest.start_url).toBe('string');
    expect(manifest.start_url.length).toBeGreaterThan(0);
  });

  test('opens in standalone display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  test('has valid background_color and theme_color', () => {
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('has at least 192x192 and 512x512 icons', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const has192 = manifest.icons.some((icon) => icon.sizes === '192x192');
    const has512 = manifest.icons.some((icon) => icon.sizes === '512x512');
    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });

  test('every icon has src, sizes and a supported type', () => {
    manifest.icons.forEach((icon) => {
      expect(typeof icon.src).toBe('string');
      expect(icon.src.length).toBeGreaterThan(0);
      expect(typeof icon.sizes).toBe('string');
      expect(['image/png', 'image/svg+xml', 'image/webp']).toContain(icon.type);
    });
  });

  test('every icon file referenced by the manifest exists', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    manifest.icons.forEach((icon) => {
      const iconPath = path.join(publicDir, icon.src);
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });

  test('index.html links the manifest', () => {
    expect(indexHtml).toMatch(/<link[^>]+rel=["']manifest["'][^>]+href=["']\/manifest\.json["']/i);
  });

  test('index.html theme-color meta matches the manifest', () => {
    const metaMatch = indexHtml.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
    expect(metaMatch).not.toBeNull();
    expect(metaMatch[1]).toBe(manifest.theme_color);
  });
});
