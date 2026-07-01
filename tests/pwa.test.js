const fetch = require('node-fetch');

describe('PWA Setup', () => {
  it('App should be installable (manifest.json should have a maskable icon)', async () => {
    const response = await fetch('http://localhost:3000/manifest.json');
    const manifest = await response.json();

    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const hasMaskableIcon = manifest.icons.some(icon => 
      icon.purpose && icon.purpose.includes('maskable')
    );

    expect(hasMaskableIcon).toBe(true);
  });
});