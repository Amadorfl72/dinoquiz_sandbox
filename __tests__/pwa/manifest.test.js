const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(process.cwd(), 'public', 'manifest.json');
const INDEX_PATH = path.resolve(process.cwd(), 'public', 'index.html');

let manifest;
let indexHtml;

describe('PWA Manifest Configuration', () => {
  beforeAll(() => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  });

  test('manifest.json exists and is valid JSON', () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
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

  test('manifest has a valid display mode', () => {
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    expect(manifest.display).toBeDefined();
    expect(validDisplayModes).toContain(manifest.display);
  });

  test('manifest has a valid start_url', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
    expect(manifest.start_url.length).toBeGreaterThan(0);
  });

  test('manifest has a valid background_color', () => {
    expect(manifest.background_color).toBeDefined();
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has a valid theme_color', () => {
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('manifest has at least one icon entry', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest includes a 192x192 icon', () => {
    const icon192 = manifest.icons.find(
      (icon) => icon.sizes === '192x192' || icon.sizes.includes('192x192')
    );
    expect(icon192).toBeDefined();
    expect(icon192.src).toBeDefined();
    expect(icon192.type).toMatch(/^image\//);
  });

  test('manifest includes a 512x512 icon', () => {
    const icon512 = manifest.icons.find(
      (icon) => icon.sizes === '512x512' || icon.sizes.includes('512x512')
    );
    expect(icon512).toBeDefined();
    expect(icon512.src).toBeDefined();
    expect(icon512.type).toMatch(/^image\//);
  });

  test('manifest icons have purpose property with maskable or any', () => {
    const validPurposes = ['any', 'maskable', 'any maskable'];
    manifest.icons.forEach((icon) => {
      if (icon.purpose) {
        const purposes = icon.purpose.split(' ');
        purposes.forEach((p) => {
          expect(validPurposes).toContain(p);
        });
      }
    });
  });

  test('manifest icons reference existing files', () => {
    manifest.icons.forEach((icon) => {
      const iconPath = path.resolve(process.cwd(), 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });

  test('index.html links to the manifest', () => {
    expect(indexHtml).toContain('rel="manifest"');
    expect(indexHtml).toContain('manifest.json');
  });

  test('index.html includes theme-color meta tag matching manifest', () => {
    expect(indexHtml).toContain('name="theme-color"');
    const metaMatch = indexHtml.match(/<meta\s+name="theme-color"\s+content="(#[0-9a-fA-F]{6})"/);
    expect(metaMatch).not.toBeNull();
    if (metaMatch) {
      expect(metaMatch[1].toLowerCase()).toBe(manifest.theme_color.toLowerCase());
    }
  });
});
