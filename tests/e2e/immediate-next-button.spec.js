'use strict';

const { test, expect } = require('@playwright/test');
const { getStrings, DEFAULT_LOCALE } = require('../../src/i18n');

/**
 * Cobertura E2E de "Eliminar tiempo de espera al responder pregunta": tras la
 * primera respuesta a una pregunta (acierto o fallo), "Siguiente" debe
 * aparecer visible y habilitado en la MISMA actualización que el feedback
 * (public/scripts/questionScreen.js's handleSelect, AC-6), debe preceder al
 * recuadro del dato curioso tanto en el DOM como en el orden de foco por
 * teclado, y debe producir exactamente una transición al pulsarlo -- todo
 * ello sin depender de sonido, animación, celebración ni red (también sin
 * conexión).
 *
 * "Sin espera perceptible" se hace objetivo con un timeout explícito de 500ms
 * en la primera comprobación tras el clic -- nunca `waitForTimeout`, sondeo
 * manual ni un timeout de varios segundos.
 */

const strings = getStrings(DEFAULT_LOCALE).question;
const IMMEDIATE_TIMEOUT_MS = 500;

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const NICKNAME_GUEST_BUTTON = '.nickname-screen__guest-button';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_PROMPT = '.question-screen__prompt';
const QUESTION_SCORE = '.question-screen__score';
const QUESTION_PROGRESS = '.question-screen__progress';
const QUESTION_FEEDBACK = '.question-screen__feedback';
const NEXT_BUTTON = '.question-screen__next-button';
// The rewarded-ad "extra dato curioso" box (TRIOFSND-86) shares the same
// base class -- excluding it keeps this locator pointed at the one dato
// curioso box every answer always reveals, not the optional ad-gated one.
const FUN_FACT_BOX = '.question-screen__fun-fact-box:not(.question-screen__extra-fun-fact-box)';
const FUN_FACT_TEXT = `${FUN_FACT_BOX} .question-screen__fun-fact`;

/** Inicio -> apodo (invitado) -> edad -> selector de modos -> Quiz, then waits for the first active question, never on a timeout. */
async function startQuizFromHome(page) {
  await page.goto('/');
  await page.locator(HOME_PLAY_BUTTON).click();
  // A nickname already saved on this device skips straight to the age gate
  // (main.js's renderNicknameStep); a fresh context always sees this screen.
  await page.locator(NICKNAME_GUEST_BUTTON).click();
  await page.locator(AGE_GATE_OPTION).click();
  await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
  await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
}

/**
 * Waits until the service worker has finished precaching the local question
 * bank (same intent as offline-full-game.spec.js's helper of the same name,
 * kept local to this file rather than shared -- see that file's own copy).
 * `navigator.serviceWorker.ready` only resolves once a worker actually
 * activates; bounding the wait to 20s (matching the precache poll below)
 * turns an install failure into a fast, explicit assertion failure instead
 * of an indefinite hang.
 */
async function waitForPrecache(page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker));
  const activated = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 20_000)),
    ])
  );
  expect(activated, 'the service worker never activated (navigator.serviceWorker.ready did not resolve) -- installation likely failed').toBe(
    true
  );
  await expect
    .poll(() => page.evaluate(() => caches.match('/data/questions.json').then((match) => Boolean(match))), {
      message: 'waiting for the service worker to precache /data/questions.json',
      timeout: 20_000,
    })
    .toBe(true);
}

/**
 * Determines which visible option is correct/incorrect without depending on
 * question order or on any single question's wording: the currently
 * rendered prompt is matched against `window.DinoQuiz.questions` -- the same
 * play-ready bank (with `correctAnswerIndex`) the app itself loaded at
 * bootstrap and that questionScreen.js renders from.
 */
async function resolveActiveQuestion(page) {
  const promptText = await page.locator(QUESTION_PROMPT).textContent();
  const question = await page.evaluate((text) => {
    const bank = (window.DinoQuiz && window.DinoQuiz.questions) || [];
    return bank.find((entry) => entry.question === text) || null;
  }, promptText);

  if (!question) {
    throw new Error(`No matching entry in window.DinoQuiz.questions for the rendered prompt "${promptText}"`);
  }
  return question;
}

function optionLocator(page, optionText) {
  return page.getByRole('group', { name: strings.optionsGroupLabel }).getByRole('button', { name: optionText, exact: true });
}

function nextButtonLocator(page) {
  return page.getByRole('button', { name: strings.nextButton, exact: true });
}

function expectedIncorrectFeedback(correctAnswerText) {
  return `${strings.feedback.incorrect} ${strings.correctAnswerAnnouncementFormat.replace('{answer}', correctAnswerText)}`;
}

/**
 * Clicks the given option exactly once and, as the FIRST check afterwards,
 * asserts "Siguiente" is visible and enabled within IMMEDIATE_TIMEOUT_MS --
 * no `waitForTimeout`, no polling, no multi-second timeout.
 */
async function answerAndAssertNextImmediate(page, optionText) {
  await optionLocator(page, optionText).click();
  const next = nextButtonLocator(page);
  await expect(next).toBeVisible({ timeout: IMMEDIATE_TIMEOUT_MS });
  await expect(next).toBeEnabled({ timeout: IMMEDIATE_TIMEOUT_MS });
  return next;
}

['no-preference', 'reduce'].forEach((reducedMotion) => {
  test.describe(`"Siguiente" inmediato (prefers-reduced-motion: ${reducedMotion})`, () => {
    test.use({ reducedMotion });

    test('respuesta correcta: "Siguiente" disponible sin espera, con feedback positivo y dato curioso', async ({ page }) => {
      await startQuizFromHome(page);
      const question = await resolveActiveQuestion(page);
      const correctOptionText = question.options[question.correctAnswerIndex];

      await answerAndAssertNextImmediate(page, correctOptionText);

      await expect(page.locator(QUESTION_FEEDBACK)).toHaveText(strings.feedback.correct);
      await expect(page.locator(FUN_FACT_BOX)).toBeVisible();
      await expect(page.locator(FUN_FACT_TEXT)).toHaveText(question.funFact);
    });

    test('respuesta incorrecta: "Siguiente" disponible sin espera, con feedback neutral y la respuesta correcta identificada', async ({
      page,
    }) => {
      await startQuizFromHome(page);
      const question = await resolveActiveQuestion(page);
      const incorrectIndex = question.correctAnswerIndex === 0 ? 1 : 0;
      const incorrectOptionText = question.options[incorrectIndex];
      const correctOptionText = question.options[question.correctAnswerIndex];

      await answerAndAssertNextImmediate(page, incorrectOptionText);

      await expect(page.locator(QUESTION_FEEDBACK)).toHaveText(expectedIncorrectFeedback(correctOptionText));
      await expect(page.locator(FUN_FACT_BOX)).toBeVisible();
      await expect(page.locator(FUN_FACT_TEXT)).toHaveText(question.funFact);
    });
  });
});

test.describe('Orden estructural y accesible de "Siguiente" frente al dato curioso', () => {
  test('"Siguiente" precede al recuadro del dato curioso en el DOM (posición relativa de nodos)', async ({ page }) => {
    await startQuizFromHome(page);
    const question = await resolveActiveQuestion(page);
    await answerAndAssertNextImmediate(page, question.options[question.correctAnswerIndex]);

    const nextPrecedesFunFact = await page.evaluate(() => {
      const next = document.querySelector('.question-screen__next-button');
      const funFactBox = document.querySelector('.question-screen__fun-fact-box:not(.question-screen__extra-fun-fact-box)');
      // eslint-disable-next-line no-bitwise
      return Boolean(next.compareDocumentPosition(funFactBox) & Node.DOCUMENT_POSITION_FOLLOWING);
    });

    expect(nextPrecedesFunFact).toBe(true);
  });

  test('el foco de teclado alcanza "Siguiente" antes que cualquier control del dato curioso', async ({ page }) => {
    await startQuizFromHome(page);
    const question = await resolveActiveQuestion(page);
    await answerAndAssertNextImmediate(page, question.options[question.correctAnswerIndex]);

    // Controlled starting point inside the feedback state: the visible
    // feedback paragraph gets a programmatic (tabindex="-1", not part of the
    // sequential Tab order) focus so the very next Tab press starts from a
    // known point within the just-rendered feedback, instead of from
    // wherever focus happened to land after the click.
    await page.evaluate(() => {
      const feedback = document.querySelector('.question-screen__feedback');
      feedback.setAttribute('tabindex', '-1');
      feedback.focus();
    });

    await page.keyboard.press('Tab');

    // The dato curioso box carries no focusable control of its own (plain
    // heading + paragraph) and cannot be reordered ahead of "Siguiente" via
    // tabindex/CSS without this assertion catching it: the very next stop
    // after the feedback anchor must be "Siguiente" itself.
    await expect(nextButtonLocator(page)).toBeFocused();
  });
});

test.describe('Exactamente una transición al pulsar "Siguiente"', () => {
  test('pulsar "Siguiente" una vez avanza de la pregunta 1 a la 2 sin duplicar puntuación', async ({ page }) => {
    await startQuizFromHome(page);
    const progress = page.locator(QUESTION_PROGRESS);
    await expect(progress).toHaveText('1 de 10');

    const question = await resolveActiveQuestion(page);
    const next = await answerAndAssertNextImmediate(page, question.options[question.correctAnswerIndex]);

    const scoreAfterAnswer = await page.locator(QUESTION_SCORE).textContent();

    await next.click();

    await expect(progress).toHaveText('2 de 10');
    await expect(page.locator(QUESTION_SCORE)).toHaveText(scoreAfterAnswer);
  });
});

test.describe('Idempotencia: una opción ya respondida no puede volver a activarse', () => {
  test('reintentar una opción tras responder no cambia la puntuación, el feedback ni la respuesta registrada', async ({ page }) => {
    await startQuizFromHome(page);
    const question = await resolveActiveQuestion(page);
    const correctOptionText = question.options[question.correctAnswerIndex];
    const incorrectIndex = question.correctAnswerIndex === 0 ? 1 : 0;
    const incorrectOptionText = question.options[incorrectIndex];

    const chosenOption = optionLocator(page, correctOptionText);
    await answerAndAssertNextImmediate(page, correctOptionText);

    const scoreBefore = await page.locator(QUESTION_SCORE).textContent();
    const feedbackBefore = await page.locator(QUESTION_FEEDBACK).textContent();
    const chosenClassBefore = await chosenOption.getAttribute('class');

    // The options are `disabled` once answered (questionScreen.js), and a
    // disabled <button> never dispatches a click event per the HTML spec --
    // calling the native DOM click() directly proves that browser-enforced
    // block without bypassing Playwright's actionability checks (no
    // `force: true`, no swallowed exceptions).
    await chosenOption.evaluate((el) => el.click());
    await optionLocator(page, incorrectOptionText).evaluate((el) => el.click());

    expect(await page.locator(QUESTION_SCORE).textContent()).toBe(scoreBefore);
    expect(await page.locator(QUESTION_FEEDBACK).textContent()).toBe(feedbackBefore);
    expect(await chosenOption.getAttribute('class')).toBe(chosenClassBefore);
  });
});

test.describe('Caso offline: "Siguiente" inmediato sin conexión', () => {
  test('offline: "Siguiente" disponible en <=500ms tras responder, con feedback y dato curioso, y el avance funciona sin red', async ({
    page,
    context,
  }) => {
    test.slow();

    // Loaded once online first (PRD "carga/instalación inicial de la PWA"):
    // the service worker finishes precaching the question bank and a first
    // active question is reached, all while the network is still up.
    await startQuizFromHome(page);
    await waitForPrecache(page);

    const question = await resolveActiveQuestion(page);
    const progress = page.locator(QUESTION_PROGRESS);
    await expect(progress).toHaveText('1 de 10');

    try {
      // Offline is switched on AFTER an active question is reached and
      // BEFORE the answer under test is selected.
      await context.setOffline(true);

      const next = await answerAndAssertNextImmediate(page, question.options[question.correctAnswerIndex]);

      await expect(page.locator(QUESTION_FEEDBACK)).toHaveText(strings.feedback.correct);
      await expect(page.locator(FUN_FACT_BOX)).toBeVisible();
      await expect(page.locator(FUN_FACT_TEXT)).toHaveText(question.funFact);

      // Still offline: a single tap on "Siguiente" advances exactly once.
      await next.click();
      await expect(progress).toHaveText('2 de 10');
    } finally {
      await context.setOffline(false);
    }
  });
});
