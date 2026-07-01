const fs = require('fs');
const path = require('path');

describe('PWA Manifest', () => {
  let manifest;

  beforeAll(() => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(content);
  });

  test('should have an icons array', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should include at least one maskable icon for installability', () => {
    const hasMaskable = manifest.icons.some(icon => 
      icon.purpose && icon.purpose.includes('maskable')
    );
    
    expect(hasMaskable).toBe(true);
  });
});