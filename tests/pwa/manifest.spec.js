const { test, expect } = require('@playwright/test');

test.describe('PWA Manifest Configuration', () => {
  test('should have a valid manifest linked in the HTML', async ({ page }) => {
    await page.goto('/');
    const manifestLink = await page.$('link[rel="manifest"]');
    expect(manifestLink).not.toBeNull();
    
    const href = await manifestLink.getAttribute('href');
    const response = await page.goto(href);
    expect(response.ok()).toBeTruthy();
    
    const manifest = await response.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons.some(icon => icon.sizes.includes('192'))).toBeTruthy();
    expect(manifest.icons.some(icon => icon.sizes.includes('512'))).toBeTruthy();
  });
});