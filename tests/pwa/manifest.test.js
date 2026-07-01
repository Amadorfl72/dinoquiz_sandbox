const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '../../public/manifest.json');

describe('PWA Manifest Configuration', () => {
  let manifest;

  beforeAll(() => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  });

  test('manifest has a valid name', () => {
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
  });

  test('manifest has a valid short_name', () => {
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  test('manifest has a valid start_url', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
  });

  test('manifest has a valid display mode', () => {
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    expect(validDisplayModes).toContain(manifest.display);
  });

  test('manifest has a valid background_color', () => {
    expect(manifest.background_color).toMatch(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  });

  test('manifest has a valid theme_color', () => {
    expect(manifest.theme_color).toMatch(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
  });

  test('manifest has at least one icon with 192px and 512px sizes', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('manifest icons have valid type', () => {
    manifest.icons.forEach((icon) => {
      expect(icon.type).toBeDefined();
      expect(icon.type).toMatch(/^image\//);
    });
  });

  test('manifest icons have purpose including maskable for 512px', () => {
    const icon512 = manifest.icons.find((icon) => icon.sizes === '512x512');
    expect(icon512).toBeDefined();
    if (icon512.purpose) {
      const purposes = icon512.purpose.split(' ');
      expect(purposes).toContain('any');
      expect(purposes).toContain('maskable');
    }
  });

  test('manifest icon files exist on disk', () => {
    manifest.icons.forEach((icon) => {
      const iconPath = path.resolve(__dirname, '../../public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});
