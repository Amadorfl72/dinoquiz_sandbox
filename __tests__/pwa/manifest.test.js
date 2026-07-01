const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'manifest.json');

let manifest;

describe('PWA Manifest Configuration', () => {
  beforeAll(() => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    manifest = JSON.parse(raw);
  });

  test('manifest.json exists in public directory', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
  });

  test('manifest is valid JSON', () => {
    expect(typeof manifest).toBe('object');
    expect(manifest).not.toBeNull();
  });

  test('manifest has a valid name property', () => {
    expect(manifest.name).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
  });

  test('manifest has a valid short_name property', () => {
    expect(manifest.short_name).toBeDefined();
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  test('manifest has a valid start_url', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
    expect(manifest.start_url).toMatch(/^\//);
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

  test('manifest has at least two icons with required sizes', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('manifest includes a 192x192 icon', () => {
    const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
    expect(icon192).toBeDefined();
    expect(icon192.src).toBeDefined();
    expect(icon192.type).toMatch(/^image\//);
  });

  test('manifest includes a 512x512 icon', () => {
    const icon512 = manifest.icons.find(icon => icon.sizes === '512x512');
    expect(icon512).toBeDefined();
    expect(icon512.src).toBeDefined();
    expect(icon512.type).toMatch(/^image\//);
  });

  test('manifest icons have purpose property', () => {
    manifest.icons.forEach(icon => {
      expect(icon.purpose).toBeDefined();
      const validPurposes = ['any', 'maskable', 'any maskable'];
      expect(validPurposes).toContain(icon.purpose);
    });
  });

  test('manifest has an orientation property', () => {
    expect(manifest.orientation).toBeDefined();
    const validOrientations = ['any', 'natural', 'landscape', 'portrait', 'portrait-primary', 'portrait-secondary', 'landscape-primary', 'landscape-secondary'];
    expect(validOrientations).toContain(manifest.orientation);
  });

  test('manifest icon files exist on disk', () => {
    manifest.icons.forEach(icon => {
      const iconPath = path.join(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});
