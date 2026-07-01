const fs = require('fs');
const path = require('path');

describe('PWA Installability', () => {
  let manifest;

  beforeAll(() => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');
    const fileContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(fileContent);
  });

  test('manifest.json contains at least one maskable icon', () => {
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    
    const maskableIcons = manifest.icons.filter(icon => 
      icon.purpose && icon.purpose.includes('maskable')
    );
    
    expect(maskableIcons.length).toBeGreaterThan(0);
  });
});
