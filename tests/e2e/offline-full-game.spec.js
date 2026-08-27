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
const QUESTION_SCREEN = '.question-screen';
const QUESTION_PROMPT = '.question-screen__prompt';
const QUESTION_OPTION = '.question-screen__option';
const QUESTION_IMAGE = '.question-screen__image';
const QUESTION_LEVEL = '.question-screen__level';
const FUN_FACT_BOX = '.question-screen__fun-fact-box:not(.question-screen__extra-fun-fact-box)';
const FUN_FACT_TEXT = '.question-screen__fun-fact-box:not(.question-screen__extra-fun-fact-box) .question-screen__fun-fact';
const NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
const PLAY_AGAIN_BUTTON = '.results-screen__play-again-button';
const QUESTIONS_PER_GAME = 10;
const MIN_ADVANCE_DELAY_MS = 4000;

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

/**
 * '¡Jugar!' -> age gate -> illustrated mode selector -> Quiz's first level
 * (TRIOFSND-193/TRIOFSND-232): every real playthrough goes through these two
 * extra screens before a question ever renders.
 */
async function startQuiz(page, ageBand) {
  await expect(page.locator(HOME_PLAY_BUTTON)).toBeVisible();
  await page.locator(HOME_PLAY_BUTTON).click();
  await page.locator(`.age-gate-screen__option--${ageBand}`).click();
  await page.locator('.mode-selector-screen__card--available[data-mode-id="quiz"]').click();
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

    await startQuiz(page, 'seven');

    await playFullGame(page);

    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await expect(page.getByRole('heading', { name: '¡Resultados!' })).toBeVisible();

    // "Volver a jugar" (AC-9): a fresh game starts, still fully offline. Ages
    // 6-7 are always age-restricted to level 1 (gameFlow.js), so this button
    // keeps its generic "Volver a jugar" label rather than "Ir al nivel N".
    await page.locator(PLAY_AGAIN_BUTTON).click();
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await expect(page.locator(RESULTS_SCREEN)).toHaveCount(0);

    expect(failedRequests).toEqual([]);
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

    await startQuiz(page, 'seven');
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('TRIOFSND-266: contenido de los niveles 6-10 jugable offline (banco ampliado + imágenes)', () => {
  test('una partida en cadena hasta el nivel 6 muestra pregunta, dato curioso, imagen realista y su fallback local, todo sin red', async ({
    page,
    context,
  }) => {
    test.setTimeout(300_000);

    await page.goto('/');
    await waitForPrecache(page);

    // Ground truth fetched once, still online, straight from the same local
    // files the service worker precached — used only to know which option is
    // correct (so the in-browser session can level up for real) and to
    // resolve each dato_curioso's i18n key, never to bypass the offline UI.
    const questionBank = await page.evaluate(() => fetch('/data/questions.json').then((response) => response.json()));
    const funFacts = await page.evaluate(() =>
      fetch('/i18n/es.json').then((response) => response.json().then((strings) => strings.funFacts))
    );

    const level6To10Questions = questionBank.filter((question) => question.level >= 6 && question.level <= 10);
    expect(level6To10Questions).toHaveLength(150);

    await context.setOffline(true);
    const failedRequests = [];
    page.on('requestfailed', (request) => failedRequests.push(request.url()));

    await page.reload();

    // Skip the child-facing wall-clock wait on "Siguiente" (a plain
    // setTimeout in questionScreen.js) so a 5-level chain to unlock level 6
    // runs in seconds instead of minutes, without touching product code.
    await page.clock.install();

    await startQuiz(page, 'eight-plus');

    /** Clicks the given option, waits out the fast-forwarded "Siguiente" delay, then advances. */
    async function answerAndAdvance(optionIndex) {
      await page.locator(QUESTION_OPTION).nth(optionIndex).click();
      await page.clock.fastForward(MIN_ADVANCE_DELAY_MS + 100);
      const nextButton = page.locator(NEXT_BUTTON);
      await expect(nextButton).toBeEnabled({ timeout: 6_000 });
      await nextButton.click();
    }

    /** Resolves the question on screen from a bank (by its globally unique prompt text) and answers it correctly. */
    async function answerCurrentQuestionCorrectly(bank) {
      await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
      const promptText = (await page.locator(QUESTION_PROMPT).textContent()).trim();
      const question = bank.find((candidate) => candidate.question === promptText);
      expect(question, `question bank has no entry for prompt "${promptText}"`).toBeTruthy();

      await answerAndAdvance(question.correctAnswerIndex);
      return question;
    }

    // Levels 1-5: answer every question correctly (>=6/10 unlocks the next
    // level, gameFlow.js's LEVEL_UP_MIN_CORRECT) to reach level 6 for real,
    // through the same UI a player uses — no test-only shortcut or hook.
    for (let level = 1; level <= 5; level += 1) {
      for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
        await answerCurrentQuestionCorrectly(questionBank);
      }
      await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
      await page.locator(PLAY_AGAIN_BUTTON).click();
    }

    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await expect(page.locator(QUESTION_LEVEL)).toContainText('6');

    // Level 6: the first question also proves the local fallback swap works
    // fully offline (simulating the realistic image failing to load); every
    // question proves the prompt, options, dato_curioso and realistic image
    // all render from cache alone.
    for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
      await expect(page.locator(QUESTION_SCREEN)).toBeVisible();

      const promptText = (await page.locator(QUESTION_PROMPT).textContent()).trim();
      const question = level6To10Questions.find((candidate) => candidate.question === promptText);
      expect(question, `level 6-10 bank has no entry for prompt "${promptText}"`).toBeTruthy();
      expect(await page.locator(QUESTION_OPTION).count()).toBe(question.options.length);

      const image = page.locator(QUESTION_IMAGE);
      await expect(image).toHaveJSProperty('src', new URL('/assets/images/' + question.imageRealistic, page.url()).href);
      await expect
        .poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0), {
          message: 'waiting for the realistic image to finish loading from the offline cache',
          timeout: 10_000,
        })
        .toBe(true);

      if (index === 0) {
        // Simulate the realistic image failing to load (TRIOFSND-194): the
        // fallback swap must still resolve to a locally cached asset, never
        // a network request, while fully offline.
        await image.evaluate((el) => el.dispatchEvent(new Event('error')));
        await expect(image).toHaveJSProperty(
          'src',
          new URL('/assets/images/' + question.imageFallback, page.url()).href
        );
        await expect
          .poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0), {
            message: 'waiting for the local fallback image to finish loading from the offline cache',
            timeout: 10_000,
          })
          .toBe(true);
      }

      await page.locator(QUESTION_OPTION).nth(question.correctAnswerIndex).click();

      const funFactKey = question.dato_curioso.split('.')[1];
      await expect(page.locator(FUN_FACT_BOX)).not.toHaveAttribute('hidden');
      await expect(page.locator(FUN_FACT_TEXT)).toHaveText(funFacts[funFactKey]);

      const nextButton = page.locator(NEXT_BUTTON);
      await page.clock.fastForward(MIN_ADVANCE_DELAY_MS + 100);
      await expect(nextButton).toBeEnabled({ timeout: 6_000 });
      await nextButton.click();
    }

    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await expect(page.getByRole('heading', { name: '¡Resultados!' })).toBeVisible();

    expect(failedRequests).toEqual([]);
  });
});
