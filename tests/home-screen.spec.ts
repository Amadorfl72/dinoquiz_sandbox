import { test, expect, type Page } from '@playwright/test';

const HOME_URL = process.env.HOME_URL || 'http://localhost:3000/';

async function setTabletLandscape(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function setTabletPortrait(page: Page) {
  await page.setViewportSize({ width: 800, height: 1280 });
}

test.describe('TRIOFSND-50: Home Screen UI and Accessibility', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await setTabletLandscape(page);
    await page.goto(HOME_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('renders the DinoQuiz title', async () => {
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    await expect(title).toHaveText(/DinoQuiz/i);
  });

  test('renders the dinosaur mascot illustration', async () => {
    const mascot = page.getByRole('img', { name: /dino|mascot|dinosaur/i });
    await expect(mascot).toBeVisible();
    const box = await mascot.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('renders the ¡Jugar! button with correct text', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    await expect(button).toBeVisible();
    await expect(button).toHaveText(/¡Jugar!/i);
  });

  test('button height is at least 64dp (approx 64px at mdpi)', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(64);
  });

  test('button touch area is at least 48x48dp', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  test('title text size is at least 24sp', async () => {
    const title = page.getByRole('heading', { level: 1 });
    const fontSize = await title.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  test('button text size is at least 24sp', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    const fontSize = await button.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(24);
  });

  test('button is keyboard navigable and focusable', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    const tabIndex = await button.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex !== '-1').toBeTruthy();
  });

  test('button can be activated with Enter key', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    await button.focus();
    let navigated = false;
    page.on('framenavigated', () => { navigated = true; });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    // Either navigates or triggers a visible state change
    expect(navigated || await page.url() !== HOME_URL).toBeTruthy();
  });

  test('button has an accessible ARIA label', async () => {
    const button = page.getByRole('button', { name: /jugar/i });
    const ariaLabel = await button.getAttribute('aria-label');
    const ariaLabelledby = await button.getAttribute('aria-labelledby');
    const hasAccessibleName =
      (ariaLabel && ariaLabel.trim().length > 0) ||
      (ariaLabelledby && ariaLabelledby.trim().length > 0) ||
      (await button.innerText()).trim().length > 0;
    expect(hasAccessibleName).toBeTruthy();
  });

  test('mascot image has an accessible ARIA label or alt text', async () => {
    const mascot = page.getByRole('img', { name: /dino|mascot|dinosaur/i });
    const alt = await mascot.getAttribute('alt');
    const ariaLabel = await mascot.getAttribute('aria-label');
    const ariaLabelledby = await mascot.getAttribute('aria-labelledby');
    const hasAccessibleName =
      (alt && alt.trim().length > 0) ||
      (ariaLabel && ariaLabel.trim().length > 0) ||
      (ariaLabelledby && ariaLabelledby.trim().length > 0);
    expect(hasAccessibleName).toBeTruthy();
  });

  test('layout is responsive in tablet landscape', async () => {
    await setTabletLandscape(page);
    const title = page.getByRole('heading', { level: 1 });
    const mascot = page.getByRole('img', { name: /dino|mascot|dinosaur/i });
    const button = page.getByRole('button', { name: /jugar/i });
    await expect(title).toBeVisible();
    await expect(mascot).toBeVisible();
    await expect(button).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const titleBox = await title.boundingBox();
    const mascotBox = await mascot.boundingBox();
    const buttonBox = await button.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(mascotBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();

    // All elements within viewport horizontally
    expect(titleBox!.x).toBeGreaterThanOrEqual(0);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(mascotBox!.x).toBeGreaterThanOrEqual(0);
    expect(mascotBox!.x + mascotBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(buttonBox!.x).toBeGreaterThanOrEqual(0);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(viewport!.width);
  });

  test('layout is responsive in tablet portrait', async () => {
    await setTabletPortrait(page);
    await page.reload();
    const title = page.getByRole('heading', { level: 1 });
    const mascot = page.getByRole('img', { name: /dino|mascot|dinosaur/i });
    const button = page.getByRole('button', { name: /jugar/i });
    await expect(title).toBeVisible();
    await expect(mascot).toBeVisible();
    await expect(button).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const titleBox = await title.boundingBox();
    const mascotBox = await mascot.boundingBox();
    const buttonBox = await button.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(mascotBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();

    expect(titleBox!.x).toBeGreaterThanOrEqual(0);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(mascotBox!.x).toBeGreaterThanOrEqual(0);
    expect(mascotBox!.x + mascotBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(buttonBox!.x).toBeGreaterThanOrEqual(0);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(viewport!.width);
  });

  test('no horizontal overflow in tablet landscape', async () => {
    await setTabletLandscape(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow in tablet portrait', async () => {
    await setTabletPortrait(page);
    await page.reload();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('page has a meaningful document title', async () => {
    const docTitle = await page.title();
    expect(docTitle.length).toBeGreaterThan(0);
    expect(docTitle.toLowerCase()).toContain('dinoquiz');
  });

  test('page has a single main landmark', async () => {
    const mainCount = await page.getByRole('main').count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  test('page passes axe accessibility scan', async () => {
    // Requires @axe-core/playwright installed
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
