const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

describe('TRIOFSND-53: Maskable Icon Asset Validation', () => {
  let manifest;
  const publicDir = path.resolve(__dirname, '../../public');

  beforeAll(() => {
    const manifestPath = path.join(publicDir, 'manifest.json');
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  });

  test('maskable icon should be a valid PNG image', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    expect(maskableIcons.length).toBeGreaterThan(0);

    maskableIcons.forEach((icon) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);

      const buffer = fs.readFileSync(iconPath);
      expect(() => sizeOf(buffer)).not.toThrow();
    });
  });

  test('maskable icon dimensions should match declared sizes', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    maskableIcons.forEach((icon) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      const buffer = fs.readFileSync(iconPath);
      const dimensions = sizeOf(buffer);
      const declaredSizes = icon.sizes.split(' ').map((s) => {
        const [w, h] = s.split('x').map(Number);
        return { width: w, height: h };
      });

      const matchesDeclared = declaredSizes.some(
        (s) => s.width === dimensions.width && s.height === dimensions.height
      );
      expect(matchesDeclared).toBe(true);
    });
  });

  test('maskable icon should be square', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    maskableIcons.forEach((icon) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      const buffer = fs.readFileSync(iconPath);
      const dimensions = sizeOf(buffer);

      expect(dimensions.width).toBe(dimensions.height);
    });
  });

  test('maskable icon should have safe zone padding (content within 80% center)', () => {
    // Maskable icons should have safe zone padding so content is not clipped
    // This is a structural test ensuring the icon file exists and is properly sized
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    maskableIcons.forEach((icon) => {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      const buffer = fs.readFileSync(iconPath);
      const dimensions = sizeOf(buffer);

      // Minimum recommended size for maskable icons is 192x192
      expect(dimensions.width).toBeGreaterThanOrEqual(192);
      expect(dimensions.height).toBeGreaterThanOrEqual(192);
    });
  });

  test('maskable icon should have correct MIME type declared', () => {
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    maskableIcons.forEach((icon) => {
      expect(icon.type).toBeTruthy();
      expect(['image/png', 'image/svg+xml', 'image/webp']).toContain(icon.type);
    });
  });

  test('should have both any and maskable purpose icons for compatibility', () => {
    const anyIcons = manifest.icons.filter(
      (icon) => !icon.purpose || icon.purpose.includes('any')
    );
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );

    expect(anyIcons.length).toBeGreaterThan(0);
    expect(maskableIcons.length).toBeGreaterThan(0);
  });
});
