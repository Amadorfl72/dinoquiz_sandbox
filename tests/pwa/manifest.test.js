const fs = require('fs');
const path = require('path');

describe('TRIOFSND-53: PWA Installability - Manifest', () => {
  let manifest;

  beforeAll(() => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  });

  test('manifest.json should exist and be valid JSON', () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  test('manifest should contain a name or short_name', () => {
    expect(manifest.name || manifest.short_name).toBeTruthy();
  });

  test('manifest should contain a start_url', () => {
    expect(manifest.start_url).toBeTruthy();
    expect(typeof manifest.start_url).toBe('string');
  });

  test('manifest should contain display property', () => {
    expect(['fullscreen', 'standalone', 'minimal-ui', 'browser']).toContain(manifest.display);
  });

  test('manifest should contain an icons array', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest should include at least one icon with purpose containing maskable', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  test('maskable icon should have valid sizes and src', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    maskableIcons.forEach((icon) => {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBeTruthy();
    });
  });

  test('maskable icon should have at least a 192x192 and 512x512 size variant', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    const sizes = maskableIcons.flatMap((icon) =>
      icon.sizes.split(' ').map((s) => s.trim())
    );
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('maskable icon file should exist on disk', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    maskableIcons.forEach((icon) => {
      const iconPath = path.resolve(__dirname, '../../public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});
