/**
 * @jest-environment node
 */
'use strict';

const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const server = require('./server');
const { QUESTIONS_PER_GAME } = require('../../src/game/gameFlow');

/**
 * TRIOFSND-137: automated accessibility audit (axe-core) of the 4 main
 * screens in the Inicio -> Quiz -> Resultados flow, plus the privacy policy
 * screen linked from Inicio (PRD mvp_scope: "Accesibilidad básica: contraste
 * WCAG AA... y compatibilidad con lectores de pantalla" + "Política de
 * privacidad accesible desde la pantalla de inicio").
 *
 * This runs as a Jest test (not only as a standalone Playwright spec) so
 * `npx jest --ci` -- what the CI pipeline (.github/workflows/trioforge-tests.yml)
 * actually runs -- exercises the audit and fails the build on a contrast,
 * ARIA role, or label/alt-text regression, instead of only on manual
 * `npm run test:a11y`. jsdom (the default `testEnvironment` in
 * jest.config.js) can't run this: axe's color-contrast rule needs a real
 * layout/paint engine to read computed colors, so this file overrides to the
 * `node` environment and drives a real Chromium instance (via
 * `@playwright/test`'s `chromium`, launched directly rather than through the
 * Playwright test runner) against the static app shell (tests/e2e/server.js).
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
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const QUESTION_NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
const PRIVACY_POLICY_SCREEN = '.privacy-policy-screen';
const PRIVACY_POLICY_LINK_NAME = 'Política de privacidad completa';

const NAVIGATION_TIMEOUT_MS = 15_000;

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

/**
 * Picks any age band, then the Quiz card on the mode selector that follows it
 * (TRIOFSND-232), so the flow reaches the question screen -- neither the age
 * gate nor the mode selector is one of the 4 audited screens here.
 */
async function skipAgeGateIfPresent(page) {
  const ageGateOption = page.locator(AGE_GATE_OPTION).first();
  if (await ageGateOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await ageGateOption.click();
  }

  const quizModeCard = page.locator(MODE_SELECTOR_QUIZ_CARD);
  if (await quizModeCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await quizModeCard.click();
  }
}

describe('TRIOFSND-137: auditoría de accesibilidad automática (axe-core)', () => {
  let baseURL;
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    await new Promise((resolve) => server.listen(0, resolve));
    baseURL = `http://localhost:${server.address().port}`;
    browser = await chromium.launch();
  }, NAVIGATION_TIMEOUT_MS);

  afterAll(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterEach(async () => {
    await context.close();
  });

  test('Inicio no tiene violaciones de contraste, roles ARIA ni labels', async () => {
    await page.goto(baseURL);
    await expect(page.locator(HOME_PLAY_BUTTON)).toBeVisible();
    await auditScreen(page, 'Inicio');
  }, NAVIGATION_TIMEOUT_MS);

  test('Quiz (pregunta) no tiene violaciones de contraste, roles ARIA ni labels', async () => {
    await page.goto(baseURL);
    await page.locator(HOME_PLAY_BUTTON).click();
    await skipAgeGateIfPresent(page);
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await auditScreen(page, 'Quiz');
  }, NAVIGATION_TIMEOUT_MS);

  test('Resultados no tiene violaciones de contraste, roles ARIA ni labels', async () => {
    await page.goto(baseURL);
    await page.locator(HOME_PLAY_BUTTON).click();
    await skipAgeGateIfPresent(page);

    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    while ((await page.locator(RESULTS_SCREEN).count()) === 0) {
      await page.locator(QUESTION_OPTION).first().click();
      const nextButton = page.locator(QUESTION_NEXT_BUTTON);
      await expect(nextButton).toBeEnabled({ timeout: 6_000 });
      await nextButton.click();
    }

    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await auditScreen(page, 'Resultados');
  }, QUESTIONS_PER_GAME * 6_000 + NAVIGATION_TIMEOUT_MS);

  test('Política de privacidad no tiene violaciones de contraste, roles ARIA ni labels', async () => {
    await page.goto(baseURL);
    await page.getByRole('button', { name: PRIVACY_POLICY_LINK_NAME }).click();
    await expect(page.locator(PRIVACY_POLICY_SCREEN)).toBeVisible();
    await auditScreen(page, 'Política de privacidad');
  }, NAVIGATION_TIMEOUT_MS);
});
