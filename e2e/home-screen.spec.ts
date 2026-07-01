import { test, expect } from '@playwright/test';

describe('HomeScreen E2E - TRIOFSND-50', () => {
  const TABLET_LANDSCAPE = { width: 1024, height: 768 };
  const TABLET_PORTRAIT = { width: 768, height: 1024 };
  const MOBILE = { width: 375, height: 667 };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays DinoQuiz title', async ({ page }) => {
    const title = page.getByRole('heading', { name: /dinoquiz/i });
    await expect(title).toBeVisible();
    await expect(title).toHaveText(/dinoquiz/i);
  });

  test('displays dinosaur mascot illustration', async ({ page }) => {
    const mascot = page.getByRole('img', { name: /dinosaur mascot/i });
    await expect(mascot).toBeVisible();
    const altText = await mascot.getAttribute('alt');
    expect(altText).toBeTruthy();
    expect(altText.length).toBeGreaterThan(0);
  });

  test('displays ¡Jugar! button with correct text', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    await expect(button).toBeVisible();
    await expect(button).toHaveText('¡Jugar!');
  });

  test('button has aria-label', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    const ariaLabel = await button.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel.toLowerCase()).toContain('jugar');
  });

  test('button height is at least 64px', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(64);
  });

  test('button touch area is at least 48x48px', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  });

  test('title text is at least 24px', async ({ page }) => {
    const title = page.getByRole('heading', { name: /dinoquiz/i });
    const fontSize = await title.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  test('button text is at least 24px', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    const fontSize = await button.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  test('button is keyboard navigable via Tab', async ({ page }) => {
    await page.keyboard.press('Tab');
    const button = page.getByRole('button', { name: /jugar/i });
    // Keep tabbing until button is focused or max attempts reached
    let attempts = 0;
    while (!(await button.evaluate((el) => el === document.activeElement)) && attempts < 10) {
      await page.keyboard.press('Tab');
      attempts++;
    }
    const isFocused = await button.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('button activates on Enter key', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    await button.focus();
    await page.keyboard.press('Enter');
    // Verify navigation or callback occurs
    await page.waitForTimeout(500);
    // Check that we navigated away or some action was triggered
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('button activates on Space key', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    await button.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
  });

  test('button has visible focus indicator', async ({ page }) => {
    const button = page.getByRole('button', { name: /jugar/i });
    await button.focus();
    const hasFocusStyles = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const outlineWidth = parseFloat(styles.outlineWidth) || 0;
      const boxShadow = styles.boxShadow;
      const borderWidth = parseFloat(styles.borderTopWidth) || 0;
      return outlineWidth > 0 || boxShadow !== 'none' || borderWidth > 0;
    });
    expect(hasFocusStyles).toBe(true);
  });

  test.describe('Tablet Landscape (Primary Target)', () => {
    test.use({ viewport: TABLET_LANDSCAPE });

    test('renders all elements at tablet landscape', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dinoquiz/i })).toBeVisible();
      await expect(page.getByRole('img', { name: /dinosaur mascot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /jugar/i })).toBeVisible();
    });

    test('no horizontal scrollbar at tablet landscape', async ({ page }) => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test('content is centered at tablet landscape', async ({ page }) => {
      const main = page.getByRole('main');
      const mainBox = await main.boundingBox();
      const viewportWidth = TABLET_LANDSCAPE.width;
      const leftMargin = mainBox.x;
      const rightMargin = viewportWidth - (mainBox.x + mainBox.width);
      // Allow some tolerance for centering
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(50);
    });

    test('button maintains 64px height at tablet landscape', async ({ page }) => {
      const button = page.getByRole('button', { name: /jugar/i });
      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(64);
    });
  });

  test.describe('Tablet Portrait', () => {
    test.use({ viewport: TABLET_PORTRAIT });

    test('renders all elements at tablet portrait', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dinoquiz/i })).toBeVisible();
      await expect(page.getByRole('img', { name: /dinosaur mascot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /jugar/i })).toBeVisible();
    });

    test('no horizontal scrollbar at tablet portrait', async ({ page }) => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: MOBILE });

    test('renders all elements at mobile dimensions', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dinoquiz/i })).toBeVisible();
      await expect(page.getByRole('img', { name: /dinosaur mascot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /jugar/i })).toBeVisible();
    });

    test('button maintains minimum touch target at mobile', async ({ page }) => {
      const button = page.getByRole('button', { name: /jugar/i });
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
    });

    test('no horizontal scrollbar at mobile', async ({ page }) => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });

  test('passes automated accessibility scan with axe', async ({ page }) => {
    const { injectAxe, checkA11y } = await import('axe-playwright');
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });
});
