/**
 * @jest-environment node
 */
'use strict';

const { chromium, expect } = require('@playwright/test');
const server = require('./server');
const { home: homeStrings } = require('../../public/i18n/es.json');

/**
 * Dynamic, cross-cutting counterpart to tests/pwa/nickname-flow.test.js's
 * "el nombre nunca aparece en un recordEvent/..." test: that jsdom test
 * proves the app-level `storage`/`fetch` mocks it hands `renderHome` never
 * receive the nickname, but it can't see anything the *real* browser stack
 * does underneath — an actual `fetch`/`XMLHttpRequest` call, a
 * `navigator.sendBeacon`, a `console.error`, or an uncaught exception whose
 * message happens to interpolate the value. This spec drives a real
 * Chromium instance (same tests/e2e/server.js static server as
 * tests/e2e/accessibility.test.js) with `fetch`/`XMLHttpRequest`/
 * `sendBeacon`/`console.*`/`window.onerror`/`unhandledrejection` all
 * monkey-patched to record every argument they're called with, plus
 * Playwright's own `request`/`console`/`pageerror` listeners as an
 * independent, non-JS-patchable capture -- then plays through every
 * nickname-touching surface (request screen, full game, Hall of Fame,
 * Inicio's edit/delete panel, and a simulated `localStorage` failure) and
 * asserts the nickname value the test typed never shows up in ANY of it
 * (PRD G7: "proteger la privacidad infantil evitando... tracking
 * individual").
 */

const HOME_PLAY_BUTTON = '.home-screen__play-button';
const NICKNAME_SCREEN = '.nickname-screen';
const NICKNAME_INPUT = '.nickname-screen__input';
const NICKNAME_CONTINUE_BUTTON = '.nickname-screen__continue-button';
const AGE_GATE_SCREEN = '.age-gate-screen';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
const RESULTS_HALL_OF_FAME_BUTTON = '.results-screen__hall-of-fame-button';
const RESULTS_EXIT_BUTTON = '.results-screen__exit-button';
const HOME_SCREEN = '.home-screen';
const HOME_NICKNAME_BUTTON_NAME = homeStrings.globalControls.nicknameButton;
const HOME_NICKNAME_PANEL = '#home-screen-nickname-panel';
const HOME_NICKNAME_INPUT = '.home-screen__nickname-input';
const HOME_NICKNAME_SAVE_BUTTON = '.home-screen__nickname-save-button';
const HOME_NICKNAME_DELETE_BUTTON = '.home-screen__nickname-delete-button';
const HOME_NICKNAME_DELETE_CONFIRM_BUTTON = '.home-screen__nickname-delete-confirm-button';
const HALL_OF_FAME_SCREEN = '.hall-of-fame-screen';
const HALL_OF_FAME_DELETE_BUTTON = '.hall-of-fame-screen__delete-button';
const HALL_OF_FAME_DELETE_CONFIRM_BUTTON = '.hall-of-fame-screen__delete-confirm-button';
const HALL_OF_FAME_BACK_BUTTON = '.hall-of-fame-screen__back-button';

const QUESTIONS_PER_GAME = 10;
const NAVIGATION_TIMEOUT_MS = 15_000;

/**
 * Patches every JS-level outbound/error surface DinoQuiz could ever use to
 * leak a value off-device -- `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`,
 * `console.*`, `window.onerror` and unhandled promise rejections -- to also
 * push a serialized copy of their arguments onto `window.__outboundCapture`,
 * without changing their real behaviour. Installed via `addInitScript` so it
 * runs before ANY app script on every navigation/reload in the page.
 */
async function installOutboundCapture(page) {
  await page.addInitScript(() => {
    window.__outboundCapture = [];

    function record(source, payload) {
      var serialized;
      try {
        serialized = JSON.stringify(payload);
      } catch (error) {
        serialized = String(payload);
      }
      window.__outboundCapture.push(source + ':' + serialized);
    }

    if (window.fetch) {
      var originalFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        var isRequestObject = typeof Request !== 'undefined' && input instanceof Request;
        var url = typeof input === 'string' ? input : input && input.url;
        var body = init && 'body' in init ? init.body : undefined;

        if (isRequestObject && body === undefined) {
          // A `Request` instance carries its own body internally (not on
          // `init`) -- clone it before the real fetch consumes the stream so
          // both the recorder and the actual request can read it.
          input
            .clone()
            .text()
            .then(function (text) {
              record('fetch', { url: url, body: text });
            })
            .catch(function () {
              record('fetch', { url: url, body: '<unreadable Request body>' });
            });
          return originalFetch(input, init);
        }

        record('fetch', { url: url, body: body });
        return originalFetch(input, init);
      };
    }

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__capturedUrl = url;
      return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      record('xhr', { url: this.__capturedUrl, body: body });
      return originalSend.apply(this, arguments);
    };

    if (navigator.sendBeacon) {
      var originalBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        record('beacon', { url: url, data: data });
        return originalBeacon(url, data);
      };
    }

    window.addEventListener('error', function (event) {
      record('window-error', {
        message: event.message,
        filename: event.filename,
        stack: event.error && event.error.stack,
      });
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      record('unhandledrejection', {
        reason: reason && (reason.stack || reason.message) || String(reason),
      });
    });

    ['log', 'warn', 'error', 'info', 'debug'].forEach(function (method) {
      var original = console[method].bind(console);
      console[method] = function () {
        record('console-' + method, Array.prototype.slice.call(arguments));
        return original.apply(console, arguments);
      };
    });
  });
}

/**
 * Independent, non-JS-patchable capture at the Playwright/browser-process
 * level: real network requests (url + POST body, if any), console messages
 * and uncaught page exceptions. Kept separate from `__outboundCapture` above
 * so a bug in the monkey-patching itself can't silently blind the audit.
 */
function installProcessLevelCapture(page) {
  const requests = [];
  const consoleMessages = [];
  const pageErrors = [];

  page.on('request', (request) => {
    requests.push(`${request.url()}::${request.postData() || ''}`);
  });
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('pageerror', (error) => pageErrors.push(String((error && error.stack) || error)));

  return { requests, consoleMessages, pageErrors };
}

async function readOutboundCapture(page) {
  return page.evaluate(() => window.__outboundCapture || []);
}

/** Asserts `secret` appears in none of the given string arrays, reporting which surface failed. */
function assertNoLeakAcrossSurfaces(secret, surfaces) {
  for (const [name, entries] of Object.entries(surfaces)) {
    const joined = entries.join('\n');
    expect(joined, `"${secret}" leaked into ${name}`).not.toContain(secret);
  }
}

async function playFullGame(page) {
  for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await page.locator(QUESTION_OPTION).first().click();
    const nextButton = page.locator(NEXT_BUTTON);
    await expect(nextButton).toBeEnabled({ timeout: 6_000 });
    await nextButton.click();
  }
}

describe('auditoría dinámica de red/eventos/beacons/errores -- el apodo nunca sale del dispositivo', () => {
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

  test(
    'un apodo guardado, jugado, cambiado, borrado individualmente y borrado del Hall of Fame no aparece en ninguna petición/consola/error/beacon capturados',
    async () => {
      const NICKNAME_A = 'AuditoriaRexAlfa1';
      const NICKNAME_B = 'AuditoriaRexBeta2';

      await installOutboundCapture(page);
      const processCapture = installProcessLevelCapture(page);

      await page.goto(baseURL);

      // Guardar el apodo desde la pantalla de solicitud, jugar una partida
      // completa y consultar/borrar el Hall of Fame -- todas las vías por
      // las que el valor podría filtrarse a analítica/errores.
      await page.locator(HOME_PLAY_BUTTON).click();
      await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();
      await page.locator(NICKNAME_INPUT).fill(NICKNAME_A);
      await page.locator(NICKNAME_CONTINUE_BUTTON).click();
      await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();
      await page.locator(AGE_GATE_OPTION).click();
      await page.locator(MODE_SELECTOR_QUIZ_CARD).click();

      await playFullGame(page);
      await expect(page.locator(RESULTS_SCREEN)).toBeVisible();

      await page.locator(RESULTS_HALL_OF_FAME_BUTTON).click();
      await expect(page.locator(HALL_OF_FAME_SCREEN)).toBeVisible();
      await page.locator(HALL_OF_FAME_DELETE_BUTTON).click();
      await page.locator(HALL_OF_FAME_DELETE_CONFIRM_BUTTON).click();
      await page.locator(HALL_OF_FAME_BACK_BUTTON).click();

      await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
      await page.locator(RESULTS_EXIT_BUTTON).click();
      await expect(page.locator(HOME_SCREEN)).toBeVisible();

      // Cambiar y luego borrar individualmente el apodo desde el panel de Inicio.
      await page.getByRole('button', { name: HOME_NICKNAME_BUTTON_NAME }).click();
      await expect(page.locator(HOME_NICKNAME_PANEL)).toBeVisible();
      await page.locator(HOME_NICKNAME_INPUT).fill(NICKNAME_B);
      await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();
      await page.locator(HOME_NICKNAME_DELETE_BUTTON).click();
      await page.locator(HOME_NICKNAME_DELETE_CONFIRM_BUTTON).click();

      const outboundCapture = await readOutboundCapture(page);

      const surfaces = {
        'peticiones de red (url + cuerpo)': processCapture.requests,
        'mensajes de consola (nivel navegador)': processCapture.consoleMessages,
        'errores de página no capturados': processCapture.pageErrors,
        'fetch/XHR/sendBeacon/console/window.onerror interceptados en JS': outboundCapture,
      };

      assertNoLeakAcrossSurfaces(NICKNAME_A, surfaces);
      assertNoLeakAcrossSurfaces(NICKNAME_B, surfaces);
    },
    QUESTIONS_PER_GAME * 6_000 + NAVIGATION_TIMEOUT_MS * 2
  );

  test(
    'un fallo de almacenamiento local al guardar el apodo tampoco filtra su valor',
    async () => {
      const NICKNAME_FAIL = 'RexFalloStorage';

      // Simula un `localStorage.setItem` que lanza (p.ej. cuota superada)
      // antes de que cargue cualquier script de la app -- mismo mecanismo
      // que src/services/nicknameService.test.js usa a nivel unitario, aquí
      // aplicado en un navegador real de punta a punta.
      await page.addInitScript(() => {
        var proto = Object.getPrototypeOf(window.localStorage);
        var originalSetItem = proto.setItem;
        Object.defineProperty(proto, 'setItem', {
          configurable: true,
          value: function (key, value) {
            if (String(key).indexOf('dinoquiz:nickname') !== -1) {
              throw new Error('QuotaExceededError (simulado)');
            }
            return originalSetItem.call(this, key, value);
          },
        });
      });
      await installOutboundCapture(page);
      const processCapture = installProcessLevelCapture(page);

      await page.goto(baseURL);
      await page.locator(HOME_PLAY_BUTTON).click();
      await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();
      await page.locator(NICKNAME_INPUT).fill(NICKNAME_FAIL);
      await page.locator(NICKNAME_CONTINUE_BUTTON).click();

      // La persistencia falla en silencio (nicknameService.js's contract):
      // el flujo debe seguir avanzando al age gate en vez de bloquearse.
      await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();

      const outboundCapture = await readOutboundCapture(page);
      const surfaces = {
        'peticiones de red (url + cuerpo)': processCapture.requests,
        'mensajes de consola (nivel navegador)': processCapture.consoleMessages,
        'errores de página no capturados': processCapture.pageErrors,
        'fetch/XHR/sendBeacon/console/window.onerror interceptados en JS': outboundCapture,
      };

      assertNoLeakAcrossSurfaces(NICKNAME_FAIL, surfaces);
    },
    NAVIGATION_TIMEOUT_MS
  );

  test(
    'el capturador de fetch detecta el cuerpo de una fuga incluso cuando se pasa como objeto Request',
    async () => {
      const LEAKED_VALUE = 'NOMBRE_PRIVADO';

      // Regresión dirigida: `fetch(new Request(url, { body }))` guarda el
      // payload dentro del propio objeto `Request` en vez de en `init.body`,
      // así que un capturador que solo lea `init.body` vería `undefined` y
      // dejaría pasar una fuga real. Esta prueba no depende del flujo de la
      // app -- ejercita `installOutboundCapture` directamente para probar
      // que el propio arnés de auditoría detecta este patrón.
      await installOutboundCapture(page);
      await page.goto(baseURL);

      await page.evaluate(async (value) => {
        try {
          await fetch(new Request('/leak-attempt', { method: 'POST', body: value }));
        } catch (error) {
          // El endpoint no existe (404) o la red del test la rechaza -- lo
          // único relevante aquí es que el capturador vea el cuerpo antes de
          // que la petición real se resuelva o falle.
        }
      }, LEAKED_VALUE);

      // El cuerpo de un `Request` se lee de forma asíncrona (clonando el
      // stream), así que se espera brevemente a que `record()` lo procese.
      await expect
        .poll(async () => (await readOutboundCapture(page)).join('\n'), { timeout: 2_000 })
        .toContain(LEAKED_VALUE);
    },
    NAVIGATION_TIMEOUT_MS
  );
});
