import { test, expect } from '@playwright/test';

test('Home screen TTI is under 2 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  
  // Wait for network idle as a proxy for Time to Interactive (TTI)
  await page.waitForLoadState('networkidle');
  
  // Wait for main content to be visible
  await page.waitForSelector('main, #root, #app');
  
  const tti = Date.now() - start;
  
  console.log(`Measured TTI: ${tti}ms`);
  expect(tti).toBeLessThan(2000);
});
