import { test, expect } from '@playwright/test';

test('App is installable with maskable icon in manifest', async ({ page }) => {
  await page.goto('/');
  
  const manifestUrl = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.href : null;
  });
  
  expect(manifestUrl).not.toBeNull();
  
  const response = await page.goto(manifestUrl);
  const manifest = await response.json();
  
  expect(manifest.icons).toBeDefined();
  expect(manifest.icons.length).toBeGreaterThan(0);
  
  const hasMaskableIcon = manifest.icons.some(icon => 
    icon.purpose && icon.purpose.includes('maskable')
  );
  
  expect(hasMaskableIcon).toBe(true);
});
