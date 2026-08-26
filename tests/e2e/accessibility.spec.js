'use strict';

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * TRIOFSND-137: automated accessibility audit (axe-core) of the 4 main
 * screens in the Inicio -> Quiz -> Resultados flow, plus the privacy policy
 * screen linked from Inicio (PRD mvp_scope: "Accesibilidad básica: contraste
 * WCAG AA... y compatibilidad con lectores de pantalla" + "Política de
 * privacidad accesible desde la pantalla de inicio").
 *
 * jsdom (jest.config.js) can't run this: axe's color-contrast rule needs a
 * real layout/paint engine to read computed colors, which jsdom doesn't
 * provide (same reasoning as tests/e2e/offline-full-game.spec.js for the
 * service worker). A real Chromium instance against the static app shell
 * (tests/e2e/server.js) is required.
 *
 * Each screen is checked against the WCAG 2.0/2.1 A+AA rule sets, which
 * cover the three things this story asks for: color contrast
 * (`color-contrast`), ARIA roles/attributes (`aria-*`, `button-name`,
 * `aria-allowed-attr`...), and labels/alt text (`image-alt`, `label`,
 * `link-name`...). A screen fails the test if axe reports ANY violation at
 * these tags -- see README "Auditoría de accesibilidad automática" for how
 * to read/re-run this locally and what to do if it goes red.
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const AGE_GATE_OPTION = '.age-gate-screen__option';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const RESULTS_SCREEN = '.results-screen';
const PRIVACY_POLICY_SCREEN = '.privacy-policy-screen';
const PRIVACY_POLICY_LINK_NAME = 'Política de privacidad completa';

async function auditScreen(page, screenName) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(summary, `${screenName}: axe violations (wcag2a/wcag2aa/wcag21a/wcag21aa)`).toEqual([]);
}

/** Picks any age band so the flow reaches the question screen (age gate is not one of the 4 audited screens). */
async function skipAgeGateIfPresent(page) {
  const ageGateOption = page.locator(AGE_GATE_OPTION).first();
  if (await ageGateOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await ageGateOption.click();
  }
}

test.describe('TRIOFSND-137: auditoría de accesibilidad automática (axe-core)', () => {
  test('Inicio no tiene violaciones de contraste, roles ARIA ni labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(HOME_PLAY_BUTTON)).toBeVisible();
    await auditScreen(page, 'Inicio');
  });

  test('Quiz (pregunta) no tiene violaciones de contraste, roles ARIA ni labels', async ({ page }) => {
    await page.goto('/');
    await page.locator(HOME_PLAY_BUTTON).click();
    await skipAgeGateIfPresent(page);
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await auditScreen(page, 'Quiz');
  });

  test('Resultados no tiene violaciones de contraste, roles ARIA ni labels', async ({ page }) => {
    await page.goto('/');
    await page.locator(HOME_PLAY_BUTTON).click();
    await skipAgeGateIfPresent(page);

    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    while (await page.locator(RESULTS_SCREEN).count() === 0) {
      await page.locator(QUESTION_OPTION).first().click();
      const nextButton = page.locator('.question-screen__next-button');
      await expect(nextButton).toBeEnabled({ timeout: 6_000 });
      await nextButton.click();
    }

    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await auditScreen(page, 'Resultados');
  });

  test('Política de privacidad no tiene violaciones de contraste, roles ARIA ni labels', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: PRIVACY_POLICY_LINK_NAME }).click();
    await expect(page.locator(PRIVACY_POLICY_SCREEN)).toBeVisible();
    await auditScreen(page, 'Política de privacidad');
  });
});
