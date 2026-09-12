'use strict';

const { test, expect } = require('@playwright/test');

/**
 * Real-browser coverage for "Siguiente inmediato, orden accesible y avance
 * único": tests/pwa/question-screen.test.js and tests/pwa/game-flow.test.js
 * (jsdom) already prove this at the unit level with fake timers, but jsdom
 * can't measure real paint/actionability timing or a genuine Tab-driven
 * focus order in a real layout engine. These specs drive an actual Chromium
 * instance against the static app shell (tests/e2e/server.js) to prove the
 * same behaviour end-to-end: a single tap reveals feedback, dato curioso and
 * an enabled "Siguiente" in one update (<=500ms tolerance, never an
 * implementation delay), "Siguiente" precedes the dato curioso in DOM/focus
 * order, answers lock after the first tap, and "Siguiente" advances exactly
 * one question at a time even under rapid/duplicate clicks.
 */

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const HOME_MUTE_BUTTON = '.home-screen__mute-button';
const NICKNAME_GUEST_BUTTON = '.nickname-screen__guest-button';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_PROMPT = '.question-screen__prompt';
const QUESTION_OPTION = '.question-screen__option';
const QUESTION_PROGRESS = '.question-screen__progress';
const NEXT_BUTTON = '.question-screen__next-button';
// `.question-screen__extra-fun-fact-box` (the rewarded-ad extra fact) also
// carries the base class, so exclude it -- the free dato curioso is the one
// under test here.
const FUN_FACT_BOX = '.question-screen__fun-fact-box:not(.question-screen__extra-fun-fact-box)';
const RESULTS_SCREEN = '.results-screen';

const NEXT_BUTTON_TOLERANCE_MS = 500;

/**
 * Clicks `optionLocator` and resolves once "Siguiente" is visible+enabled,
 * returning the elapsed wall-clock time. Uses a single `waitForFunction`
 * round-trip (rather than chained `expect(locator)...` calls, each its own
 * IPC round-trip) so the measurement reflects the app's real state-update
 * latency, not Playwright's own polling overhead.
 */
async function answerAndMeasureNextButtonLatency(page, optionLocator) {
  const start = Date.now();
  await optionLocator.click();
  await page.waitForFunction((selector) => {
    const button = document.querySelector(selector);
    return Boolean(button) && !button.hidden && !button.disabled;
  }, NEXT_BUTTON);
  return Date.now() - start;
}

/** Inicio -> apodo -> edad -> selector de modos -> Quiz (mirrors offline-full-game.spec.js). */
async function startQuizFromHome(page) {
  await page.locator(HOME_PLAY_BUTTON).click();
  await page.locator(NICKNAME_GUEST_BUTTON).click();
  await page.locator(AGE_GATE_OPTION).click();
  await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
  await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
}

/**
 * Looks up the currently displayed question's `correctAnswerIndex` from the
 * app's own in-memory bank (`window.DinoQuiz.questions`, populated at
 * bootstrap from /data/questions.json) by matching the visible prompt text
 * -- unique across the whole bank -- so tests can deterministically pick a
 * correct or an incorrect option instead of guessing.
 */
async function getCorrectOptionIndex(page) {
  const promptText = await page.locator(QUESTION_PROMPT).textContent();
  return page.evaluate((question) => {
    const bank = (window.DinoQuiz && window.DinoQuiz.questions) || [];
    const match = bank.find((entry) => entry.question === question);
    if (!match) {
      throw new Error('question-flow.spec.js: could not find "' + question + '" in window.DinoQuiz.questions');
    }
    return match.correctAnswerIndex;
  }, promptText);
}

test.describe('"Siguiente" inmediato y orden accesible', () => {
  test('respuesta correcta: feedback, dato curioso y "Siguiente" habilitado y accionable en <=500ms', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    const elapsed = await answerAndMeasureNextButtonLatency(page, page.locator(QUESTION_OPTION).nth(correctIndex));

    expect(elapsed).toBeLessThanOrEqual(NEXT_BUTTON_TOLERANCE_MS);
    // `trial: true` runs Playwright's actionability checks (visible, stable,
    // receives pointer events, enabled) without performing the click, so it
    // also proves no celebration/animation overlay intercepts the button --
    // checked after the latency measurement so it never inflates it.
    await page.locator(NEXT_BUTTON).click({ trial: true });
    await expect(page.locator(FUN_FACT_BOX)).toBeVisible();
  });

  test('respuesta incorrecta: feedback, dato curioso y "Siguiente" habilitado y accionable en <=500ms', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    const optionsCount = await page.locator(QUESTION_OPTION).count();
    const wrongIndex = Array.from({ length: optionsCount }, (_unused, i) => i).find((i) => i !== correctIndex);

    const elapsed = await answerAndMeasureNextButtonLatency(page, page.locator(QUESTION_OPTION).nth(wrongIndex));

    expect(elapsed).toBeLessThanOrEqual(NEXT_BUTTON_TOLERANCE_MS);
    await page.locator(NEXT_BUTTON).click({ trial: true });
    await expect(page.locator(FUN_FACT_BOX)).toBeVisible();
  });

  test('"Siguiente" precede al dato curioso tanto en el DOM como en el orden de tabulación', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    await page.locator(QUESTION_OPTION).nth(correctIndex).click();
    await expect(page.locator(NEXT_BUTTON)).toBeEnabled();

    const nextPrecedesFunFact = await page.evaluate(
      ({ nextSelector, funFactSelector }) => {
        const nextButton = document.querySelector(nextSelector);
        const funFactBox = document.querySelector(funFactSelector);
        // eslint-disable-next-line no-bitwise
        return Boolean(nextButton.compareDocumentPosition(funFactBox) & Node.DOCUMENT_POSITION_FOLLOWING);
      },
      { nextSelector: NEXT_BUTTON, funFactSelector: FUN_FACT_BOX }
    );
    expect(nextPrecedesFunFact).toBe(true);

    // Only the disabled options and the fun-fact box have no focusable
    // descendants, so Tab from the last focused control (the tapped option)
    // must land straight on "Siguiente" — proving DOM/focus order, not just
    // a CSS visual reorder.
    await page.keyboard.press('Tab');
    await expect(page.locator(NEXT_BUTTON)).toBeFocused();
  });

  test('tras responder, todas las opciones quedan bloqueadas y un segundo toque no cambia nada', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    await page.locator(QUESTION_OPTION).nth(correctIndex).click();
    await expect(page.locator(NEXT_BUTTON)).toBeEnabled();

    const options = page.locator(QUESTION_OPTION);
    const optionsCount = await options.count();
    for (let i = 0; i < optionsCount; i += 1) {
      await expect(options.nth(i)).toBeDisabled();
    }

    const feedbackBefore = await page.locator('.question-screen__feedback').textContent();
    const scoreBefore = await page.locator('.question-screen__score').textContent();

    // Disabled buttons ignore pointer events; force the click purely to
    // prove state doesn't change even if a stray event reached the handler.
    const otherIndex = (correctIndex + 1) % optionsCount;
    await options.nth(otherIndex).click({ force: true }).catch(() => {});

    await expect(page.locator('.question-screen__feedback')).toHaveText(feedbackBefore);
    await expect(page.locator('.question-screen__score')).toHaveText(scoreBefore);
  });
});

test.describe('Avance único y bloqueo de resultados', () => {
  test('pulsar "Siguiente" una vez avanza exactamente de la pregunta N a la N+1', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    await expect(page.locator(QUESTION_PROGRESS)).toHaveText('1 de 10');

    const correctIndex = await getCorrectOptionIndex(page);
    await page.locator(QUESTION_OPTION).nth(correctIndex).click();
    await expect(page.locator(NEXT_BUTTON)).toBeEnabled();
    await page.locator(NEXT_BUTTON).click();

    await expect(page.locator(QUESTION_PROGRESS)).toHaveText('2 de 10');
  });

  test('clics rápidos y repetidos sobre "Siguiente" no saltan preguntas ni duplican el avance', async ({ page }) => {
    await page.goto('/');
    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    await page.locator(QUESTION_OPTION).nth(correctIndex).click();
    await expect(page.locator(NEXT_BUTTON)).toBeEnabled();

    // Two synchronous clicks on the SAME element in the same tick -- the
    // second fires on the now-detached button from this question's render
    // (its listener is still attached), mirroring a genuine double-tap
    // during the transition rather than Playwright re-querying a fresh
    // "Siguiente" for the next question.
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      button.click();
      button.click();
    }, NEXT_BUTTON);

    await expect(page.locator(QUESTION_PROGRESS)).toHaveText('2 de 10');
    await expect(page.locator(RESULTS_SCREEN)).toHaveCount(0);
  });

  test('responder la décima pregunta no abre Resultados automáticamente; sólo pulsar "Siguiente" lo hace', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/');
    await startQuizFromHome(page);

    for (let question = 1; question < 10; question += 1) {
      await expect(page.locator(QUESTION_PROGRESS)).toHaveText(`${question} de 10`);
      await page.locator(QUESTION_OPTION).first().click();
      await expect(page.locator(NEXT_BUTTON)).toBeEnabled();
      await page.locator(NEXT_BUTTON).click();
    }

    await expect(page.locator(QUESTION_PROGRESS)).toHaveText('10 de 10');
    await page.locator(QUESTION_OPTION).first().click();
    await expect(page.locator(NEXT_BUTTON)).toBeEnabled();

    // Responder la 10ª pregunta no debe, por sí solo, abrir Resultados.
    await expect(page.locator(RESULTS_SCREEN)).toHaveCount(0);
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();

    await page.locator(NEXT_BUTTON).click();
    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
  });
});

test.describe('Orden visual en los tamaños representativos de la suite', () => {
  // Representative breakpoints for the PRD's "tablet-first... adaptación
  // funcional a móvil y escritorio": tablet landscape matches the app's own
  // `(min-width: 900px) and (orientation: landscape)` media query in
  // main.css, tablet portrait is the same device rotated, mobile and desktop
  // bound the range below/above it.
  const VIEWPORTS = [
    { label: 'móvil', width: 375, height: 667 },
    { label: 'tablet vertical', width: 768, height: 1024 },
    { label: 'tablet horizontal', width: 1024, height: 768 },
    { label: 'escritorio', width: 1440, height: 900 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`"Siguiente" aparece visualmente encima del dato curioso en ${viewport.label} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await startQuizFromHome(page);

      const correctIndex = await getCorrectOptionIndex(page);
      await page.locator(QUESTION_OPTION).nth(correctIndex).click();
      await expect(page.locator(NEXT_BUTTON)).toBeEnabled();
      await expect(page.locator(FUN_FACT_BOX)).toBeVisible();

      const nextButtonBox = await page.locator(NEXT_BUTTON).boundingBox();
      const funFactBox = await page.locator(FUN_FACT_BOX).boundingBox();

      expect(nextButtonBox).not.toBeNull();
      expect(funFactBox).not.toBeNull();
      // "Encima" = its bottom edge sits at or above the dato curioso's top
      // edge -- a real layout-engine measurement, so a CSS `order`/
      // `column-reverse`/absolute-positioning trick that visually flipped
      // the DOM order would fail this even though the earlier DOM/tab-order
      // assertion only inspects markup, not paint.
      expect(nextButtonBox.y + nextButtonBox.height).toBeLessThanOrEqual(funFactBox.y);
    });
  }
});

test.describe('Comportamiento idéntico con reduced-motion y audio silenciado', () => {
  test.use({ reducedMotion: 'reduce' });

  test('con prefers-reduced-motion activo y el audio silenciado, "Siguiente" sigue disponible en <=500ms', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator(HOME_MUTE_BUTTON).click();
    await expect(page.locator(HOME_MUTE_BUTTON)).toHaveAttribute('aria-pressed', 'true');

    await startQuizFromHome(page);

    const correctIndex = await getCorrectOptionIndex(page);
    const elapsed = await answerAndMeasureNextButtonLatency(page, page.locator(QUESTION_OPTION).nth(correctIndex));

    expect(elapsed).toBeLessThanOrEqual(NEXT_BUTTON_TOLERANCE_MS);
    await page.locator(NEXT_BUTTON).click({ trial: true });
  });
});
