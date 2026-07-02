const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '../../public/manifest.json');
const INDEX_PATH = path.resolve(__dirname, '../../public/index.html');

describe('TRIOFSND-53: PWA Manifest Configuration', () => {
  let manifest;
  let indexHtml;

  beforeAll(() => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    indexHtml = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, 'utf-8') : '';
  });

  test('manifest.json exists and is valid JSON', () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  test('manifest has required name field', () => {
    expect(manifest.name).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
  });

  test('manifest has required short_name field', () => {
    expect(manifest.short_name).toBeDefined();
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  test('manifest has start_url field', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
    expect(manifest.start_url.length).toBeGreaterThan(0);
  });

  test('manifest has display mode set to standalone or fullscreen', () => {
    expect(manifest.display).toBeDefined();
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
  });

  test('manifest has background_color field', () => {
    expect(manifest.background_color).toBeDefined();
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has theme_color field', () => {
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has at least two icons (192px and 512px)', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const has192 = manifest.icons.some(icon => icon.sizes === '192x192');
    const has512 = manifest.icons.some(icon => icon.sizes === '512x512');
    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });

  test('all manifest icons have required properties', () => {
    manifest.icons.forEach((icon, idx) => {
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBeDefined();
      expect(['image/png', 'image/svg+xml', 'image/webp']).toContain(icon.type);
    });
  });

  test('index.html references the manifest', () => {
    expect(indexHtml).toContain('rel="manifest"');
    expect(indexHtml).toMatch(/rel=["']manifest["']\s+href=["'][^"]*manifest\.json["']/i);
  });

  test('index.html has theme-color meta tag matching manifest', () => {
    expect(indexHtml).toContain('name="theme-color"');
    const metaMatch = indexHtml.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
    expect(metaMatch).not.toBeNull();
    expect(metaMatch[1]).toBe(manifest.theme_color);
  });
});
