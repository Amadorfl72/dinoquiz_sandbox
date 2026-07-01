const { test, expect } = require('@playwright/test');

test.describe('TRIOFSND-7: Offline First Load Fallback', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('displays friendly message on first load when offline', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate offline by cutting network before first navigation
    await context.setOffline(true);

    // Ensure no cached state from previous loads
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Conéctate la primera vez para descargar el juego')).toBeVisible();

    // Ensure no technical error is surfaced to the user
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/Error|Exception|TypeError|undefined/i);

    await context.close();
  });

  test('does not display the message on first load when online', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await context.setOffline(false);
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Conéctate la primera vez para descargar el juego')).toHaveCount(0);

    await context.close();
  });

  test('does not display the message on subsequent loads when offline', async ({ browser }) => {
    // First load online to cache the game / mark as loaded before
    const context = await browser.newContext();
    const page = await context.newPage();

    await context.setOffline(false);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Reload while offline
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Conéctate la primera vez para descargar el juego')).toHaveCount(0);

    await context.close();
  });

  test('recovers gracefully when connection is restored after seeing the message', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await context.setOffline(true);
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('text=Conéctate la primera vez para descargar el juego')).toBeVisible();

    // Restore connection and reload
    await context.setOffline(false);
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.locator('text=Conéctate la primera vez para descargar el juego')).toHaveCount(0);

    await context.close();
  });
});
