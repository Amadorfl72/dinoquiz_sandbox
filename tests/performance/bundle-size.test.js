const fs = require('fs');
const path = require('path');
const glob = require('glob');
const gzipSize = require('gzip-size');

describe('TRIOFSND-53: Bundle Size Optimization', () => {
  const buildDir = path.resolve(__dirname, '../../build');
  const distDir = path.resolve(__dirname, '../../dist');
  const targetDir = fs.existsSync(distDir) ? distDir : buildDir;

  test('build output directory should exist', () => {
    expect(fs.existsSync(targetDir)).toBe(true);
  });

  test('main JS bundle should be under 200KB gzipped', () => {
    const jsFiles = glob.sync('**/*.js', { cwd: targetDir });
    const mainBundles = jsFiles.filter(
      (f) => f.includes('main') || f.includes('index') || f.includes('app')
    );

    expect(mainBundles.length).toBeGreaterThan(0);

    mainBundles.forEach((file) => {
      const filePath = path.join(targetDir, file);
      const content = fs.readFileSync(filePath);
      const gzipped = gzipSize.sync(content);
      expect(gzipped).toBeLessThan(200 * 1024);
    });
  });

  test('total JS payload should be under 500KB gzipped', () => {
    const jsFiles = glob.sync('**/*.js', { cwd: targetDir });
    let totalGzipped = 0;

    jsFiles.forEach((file) => {
      const filePath = path.join(targetDir, file);
      const content = fs.readFileSync(filePath);
      totalGzipped += gzipSize.sync(content);
    });

    expect(totalGzipped).toBeLessThan(500 * 1024);
  });

  test('CSS bundle should be under 50KB gzipped', () => {
    const cssFiles = glob.sync('**/*.css', { cwd: targetDir });
    let totalGzipped = 0;

    cssFiles.forEach((file) => {
      const filePath = path.join(targetDir, file);
      const content = fs.readFileSync(filePath);
      totalGzipped += gzipSize.sync(content);
    });

    expect(totalGzipped).toBeLessThan(50 * 1024);
  });

  test('code splitting should be applied (multiple JS chunks)', () => {
    const jsFiles = glob.sync('**/*.js', { cwd: targetDir });
    expect(jsFiles.length).toBeGreaterThan(1);
  });
});
