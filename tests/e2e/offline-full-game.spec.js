'use strict';

const { test, expect } = require('@playwright/test');

/**
 * TRIOFSND-111: real-browser coverage of the PRD's "sin conexión" scenario.
 * tests/pwa/offline-full-game.test.js (jsdom) already proves the question
 * bank and game engine never call fetch() and can run a whole game with a
 * stubbed offline navigator, but jsdom doesn't execute service workers or a
 * real network stack — it can't prove the *installed PWA* survives an
 * actually offline/throttled device. These specs do: a real Chromium
 * instance loads the app once online (so the service worker precaches the
 * shell and the local question bank), then the browser context is put
 * offline/throttled and a full game is played through it.
 */

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
// Class selector, not a role/text lookup (TRIOFSND-207): once a level is
// unlocked this button's label becomes "Ir al nivel N" instead of the
// generic "Volver a jugar" (see resultsScreen.js's resolvePlayAgainButtonLabel),
// so matching by its stable class covers every level outcome.
const PLAY_AGAIN_BUTTON = '.results-screen__play-again-button';
const QUESTIONS_PER_GAME = 10;

/** Inicio -> edad -> selector de modos -> Quiz (TRIOFSND-193/232): every '¡Jugar!' tap goes through this before a game starts. */
async function startQuizFromHome(page) {
  await page.locator(HOME_PLAY_BUTTON).click();
  await page.locator(AGE_GATE_OPTION).click();
  await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
}

/** Waits until the service worker has finished precaching the local question bank. */
async function waitForPrecache(page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => caches.match('/data/questions.json').then((match) => Boolean(match))), {
      message: 'waiting for the service worker to precache /data/questions.json',
      timeout: 20_000,
    })
    .toBe(true);
}

/** Plays through every question on screen (any option — the point is completing the flow, not the score). */
async function playFullGame(page) {
  for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await page.locator(QUESTION_OPTION).first().click();

    const nextButton = page.locator(NEXT_BUTTON);
    await expect(nextButton).toBeEnabled({ timeout: 6_000 });
    await nextButton.click();
  }
}

test.describe('TRIOFSND-111: partida completa con el dispositivo sin conexión', () => {
  test('Inicio -> Quiz (10 preguntas) -> Resultados -> Volver a jugar funciona 100% offline', async ({
    page,
    context,
  }) => {
    test.slow();

    await page.goto('/');
    await waitForPrecache(page);

    await context.setOffline(true);

    // Prove the device is genuinely offline (not just "trusting" navigator.onLine,
    // which some Chromium builds don't update on setOffline): a request for
    // something the service worker never cached must fail to reach the network.
    const networkGenuinelyDown = await page.evaluate(async () => {
      try {
        await fetch(`/data/questions.json?uncached-probe=${Math.random()}`);
        return false;
      } catch (error) {
        return true;
      }
    });
    expect(networkGenuinelyDown).toBe(true);

    const failedRequests = [];
    page.on('requestfailed', (request) => failedRequests.push(request.url()));

    await page.reload();

    await expect(page.locator(HOME_PLAY_BUTTON)).toBeVisible();
    // TRIOFSND-232: the age gate hands off to the illustrated mode selector
    // before any mode actually starts -- both must be navigated offline too.
    await startQuizFromHome(page);

    await playFullGame(page);

    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await expect(page.getByRole('heading', { name: '¡Resultados!' })).toBeVisible();

    // "Volver a jugar" / "Ir al nivel N" (AC-9): a fresh round starts, still fully offline.
    await page.locator(PLAY_AGAIN_BUTTON).click();
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await expect(page.locator(RESULTS_SCREEN)).toHaveCount(0);

    // Per-dinosaur illustrations (public/assets/images/dinosaurs/*) are a
    // separate, not-yet-sourced content gap (PRD content_constraints requires
    // licensed art) — they 404 online too, and a broken <img> never blocks
    // the quiz's JS flow. Every OTHER request (data, i18n, scripts, styles,
    // navigation) must still resolve from the service worker's cache.
    const unexpectedFailures = failedRequests.filter(
      (url) => !url.includes('/assets/images/dinosaurs/')
    );
    expect(unexpectedFailures).toEqual([]);
  });

  test('con la red muy lenta (throttling) la app arranca desde caché y deja empezar a jugar', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await waitForPrecache(page);

    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });

    await page.reload();

    await expect(page.locator(HOME_PLAY_BUTTON)).toBeVisible({ timeout: 20_000 });
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(AGE_GATE_OPTION)).toBeVisible({ timeout: 20_000 });
    await page.locator(AGE_GATE_OPTION).click();
    await expect(page.locator(MODE_SELECTOR_QUIZ_CARD)).toBeVisible({ timeout: 20_000 });
    await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible({ timeout: 20_000 });
  });
});
