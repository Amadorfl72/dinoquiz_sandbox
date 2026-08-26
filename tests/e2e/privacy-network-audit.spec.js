'use strict';

const { test, expect } = require('@playwright/test');

/**
 * TRIOFSND-119: dynamic counterpart to tests/privacy-audit/*.test.js.
 *
 * The jest-based audit proves no shipped source file *contains* a
 * third-party/ad/tracking domain; this spec proves the running app never
 * actually *calls* one, by recording every network request a real Chromium
 * instance issues while playing a full game (Inicio -> selección de edad ->
 * 10 preguntas -> Resultados -> Volver a jugar) and asserting each one's
 * origin is the app's own origin. DinoQuiz ships with no backend
 * (CONVENTIONS.md), so "same-origin only" is the whole contract.
 */

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
const QUESTIONS_PER_GAME = 10;

async function playFullGame(page) {
  for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await page.locator(QUESTION_OPTION).first().click();

    const nextButton = page.locator(NEXT_BUTTON);
    await expect(nextButton).toBeEnabled({ timeout: 6_000 });
    await nextButton.click();
  }
}

test.describe('TRIOFSND-119: auditoría de red -- ninguna llamada sale del propio origen', () => {
  test('una partida completa (Inicio -> edad -> 10 preguntas -> Resultados -> Volver a jugar) no genera ni una sola petición de red a un tercero', async ({
    page,
  }) => {
    test.slow();

    const requestedUrls = [];
    page.on('request', (request) => requestedUrls.push(request.url()));

    await page.goto('/');

    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(AGE_GATE_OPTION).click();

    await playFullGame(page);
    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();

    await page.getByRole('button', { name: 'Volver a jugar' }).click();
    await playFullGame(page);
    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();

    const appOrigin = new URL(page.url()).origin;
    const thirdPartyRequests = requestedUrls.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) {
        return false;
      }
      return new URL(url).origin !== appOrigin;
    });

    expect(thirdPartyRequests).toEqual([]);
  });
});
