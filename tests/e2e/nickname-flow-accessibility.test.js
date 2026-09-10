/**
 * @jest-environment node
 */
'use strict';

const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const server = require('./server');
const {
  home: homeStrings,
  hallOfFame: hallOfFameStrings,
  nicknameSettings: nicknameSettingsStrings,
  nicknameRequest: nicknameRequestStrings,
} = require('../../public/i18n/es.json');

/**
 * End-to-end + accessibility coverage of the nickname ("apodo") feature in
 * a real Chromium instance (same tests/e2e/server.js static server and
 * chromium.launch() pattern as tests/e2e/accessibility.test.js), covering
 * every scenario the jsdom-based tests/pwa/nickname-flow.test.js and
 * public/scripts/homeScreen.test.js don't: guest play, a saved apodo being
 * reused across a real page reload, changing/deleting it individually from
 * Inicio, deleting the whole Hall of Fame (the "borrado general" -- distinct
 * from the individual apodo delete), a simulated `localStorage` failure, the
 * 20-character limit's exact boundary, and the request screen/Inicio panel
 * operated purely by keyboard.
 *
 * The axe-core scans (WCAG 2.0/2.1 A+AA, same tag set as
 * tests/e2e/accessibility.test.js) extend that suite's coverage to two
 * screens/states it never exercises: the nickname request screen itself
 * (that suite always skips past it via the guest button) and Inicio's
 * apodo edit/delete panel while open.
 */

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const NAVIGATION_TIMEOUT_MS = 15_000;
const QUESTIONS_PER_GAME = 10;

const HOME_SCREEN = '.home-screen';
const HOME_PLAY_BUTTON = '.home-screen__play-button';
const HOME_NICKNAME_BUTTON_NAME = homeStrings.globalControls.nicknameButton;
const HOME_HALL_OF_FAME_BUTTON_NAME = hallOfFameStrings.title;
const HOME_NICKNAME_PANEL = '#home-screen-nickname-panel';
const HOME_NICKNAME_CURRENT = '.home-screen__nickname-current';
const HOME_NICKNAME_INPUT = '.home-screen__nickname-input';
const HOME_NICKNAME_ERROR = '.home-screen__nickname-error';
const HOME_NICKNAME_SAVE_BUTTON = '.home-screen__nickname-save-button';
const HOME_NICKNAME_DELETE_BUTTON = '.home-screen__nickname-delete-button';
const HOME_NICKNAME_DELETE_CONFIRM = '.home-screen__nickname-delete-confirm';
const HOME_NICKNAME_DELETE_CONFIRM_BUTTON = '.home-screen__nickname-delete-confirm-button';
const HOME_NICKNAME_DELETE_CANCEL_BUTTON = '.home-screen__nickname-delete-cancel-button';
const HOME_NICKNAME_STATUS = '.home-screen__nickname-status';
const HOME_PANEL_CLOSE_BUTTON_IN_NICKNAME_PANEL = `${HOME_NICKNAME_PANEL} .home-screen__panel-close-button`;

const NICKNAME_SCREEN = '.nickname-screen';
const NICKNAME_TITLE = '.nickname-screen__title';
const NICKNAME_INPUT = '.nickname-screen__input';
const NICKNAME_ERROR = '.nickname-screen__error';
const NICKNAME_CONTINUE_BUTTON = '.nickname-screen__continue-button';
const NICKNAME_GUEST_BUTTON = '.nickname-screen__guest-button';

const AGE_GATE_SCREEN = '.age-gate-screen';
const AGE_GATE_OPTION = '.age-gate-screen__option--eight-plus';
const MODE_SELECTOR_QUIZ_CARD = '.mode-selector-screen__card[data-mode-id="quiz"]';
const QUESTION_SCREEN = '.question-screen';
const QUESTION_OPTION = '.question-screen__option';
const NEXT_BUTTON = '.question-screen__next-button';
const RESULTS_SCREEN = '.results-screen';
const RESULTS_EXIT_BUTTON = '.results-screen__exit-button';

const HALL_OF_FAME_SCREEN = '.hall-of-fame-screen';
const HALL_OF_FAME_ROW = '.hall-of-fame-screen__row';
const HALL_OF_FAME_EMPTY = '.hall-of-fame-screen__empty';
const HALL_OF_FAME_DELETE_BUTTON = '.hall-of-fame-screen__delete-button';
const HALL_OF_FAME_DELETE_CONFIRM_BUTTON = '.hall-of-fame-screen__delete-confirm-button';
const HALL_OF_FAME_BACK_BUTTON = '.hall-of-fame-screen__back-button';

/** Renders the same `{nickname}`-interpolated string homeScreen.js's nickname panel shows for a saved apodo. */
function currentNicknameText(nickname) {
  return nicknameSettingsStrings.currentNicknameFormat.replace('{nickname}', nickname);
}

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

async function playFullGame(page) {
  for (let index = 0; index < QUESTIONS_PER_GAME; index += 1) {
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();
    await page.locator(QUESTION_OPTION).first().click();
    const nextButton = page.locator(NEXT_BUTTON);
    await expect(nextButton).toBeEnabled({ timeout: 6_000 });
    await nextButton.click();
  }
}

async function openHomeNicknamePanel(page) {
  await page.getByRole('button', { name: HOME_NICKNAME_BUTTON_NAME }).click();
  await expect(page.locator(HOME_NICKNAME_PANEL)).toBeVisible();
}

describe('flujo del apodo -- extremo a extremo y accesibilidad', () => {
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
    await page.goto(baseURL);
  });

  afterEach(async () => {
    await context.close();
  });

  test('invitado: "Jugar como invitado" salta la pantalla de solicitud y no guarda ningún apodo', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();

    await page.locator(NICKNAME_GUEST_BUTTON).click();
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();

    // El age gate no tiene botón "Volver" propio: una recarga limpia basta
    // para comprobar, desde Inicio, que jugar como invitado no persistió
    // ningún apodo (no solo que la pantalla de solicitud se saltó).
    await page.goto(baseURL);
    await expect(page.locator(HOME_SCREEN)).toBeVisible();
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(nicknameSettingsStrings.noNicknameSaved);
  }, NAVIGATION_TIMEOUT_MS);

  test('guardado y reutilización: un apodo guardado persiste tras recargar la página y salta la pantalla de solicitud en la siguiente partida', async () => {
    const NICKNAME = 'RexReutilizado';

    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill(NICKNAME);
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();

    // Recarga real de página (no solo un re-render en memoria): la
    // reutilización debe sobrevivir a un `localStorage` recién leído.
    await page.reload();
    await expect(page.locator(HOME_SCREEN)).toBeVisible();
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText(NICKNAME));
    await expect(page.locator(HOME_NICKNAME_INPUT)).toHaveValue(NICKNAME);
    await page.locator(HOME_PANEL_CLOSE_BUTTON_IN_NICKNAME_PANEL).click();

    // Reutilización real dentro del flujo de juego: la pantalla de
    // solicitud no vuelve a aparecer.
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();
    await expect(page.locator(NICKNAME_SCREEN)).toHaveCount(0);
  }, NAVIGATION_TIMEOUT_MS);

  test('cambio: editar el apodo guardado desde el panel de Inicio actualiza el valor persistido', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill('RexOriginal');
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await page.locator(AGE_GATE_OPTION).click();
    await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
    await expect(page.locator(QUESTION_SCREEN)).toBeVisible();

    // Vuelve a Inicio sin terminar la partida (recarga limpia, mismo efecto
    // que "Salir" en Resultados para este propósito).
    await page.goto(baseURL);
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexOriginal'));

    await page.locator(HOME_NICKNAME_INPUT).fill('RexCambiado');
    await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();

    await expect(page.locator(HOME_NICKNAME_STATUS)).toHaveText(nicknameSettingsStrings.saveSuccessMessage);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexCambiado'));

    // El cambio persiste tras recargar, no solo en memoria.
    await page.reload();
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexCambiado'));
  }, NAVIGATION_TIMEOUT_MS);

  test('borrado individual: borrar el apodo desde el panel de Inicio lo elimina y la siguiente partida vuelve a pedirlo', async () => {
    await openHomeNicknamePanel(page);
    await page.locator(HOME_NICKNAME_INPUT).fill('RexABorrar');
    await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexABorrar'));

    // Confirmación en dos pasos: el primer tap no borra nada todavía.
    await page.locator(HOME_NICKNAME_DELETE_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_DELETE_CONFIRM)).toBeVisible();
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexABorrar'));

    await page.locator(HOME_NICKNAME_DELETE_CANCEL_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_DELETE_CONFIRM)).toBeHidden();
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexABorrar'));

    await page.locator(HOME_NICKNAME_DELETE_BUTTON).click();
    await page.locator(HOME_NICKNAME_DELETE_CONFIRM_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_STATUS)).toHaveText(nicknameSettingsStrings.deleteSuccessMessage);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(nicknameSettingsStrings.noNicknameSaved);

    await page.locator(HOME_PANEL_CLOSE_BUTTON_IN_NICKNAME_PANEL).click();
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();
  }, NAVIGATION_TIMEOUT_MS);

  test('borrado general: borrar todo el Hall of Fame lo vacía sin afectar al apodo guardado actualmente', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill('RexHallOfFame');
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await page.locator(AGE_GATE_OPTION).click();
    await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
    await playFullGame(page);
    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();

    await page.locator(RESULTS_EXIT_BUTTON).click();
    await expect(page.locator(HOME_SCREEN)).toBeVisible();

    await page.getByRole('button', { name: HOME_HALL_OF_FAME_BUTTON_NAME }).click();
    await expect(page.locator(HALL_OF_FAME_SCREEN)).toBeVisible();
    await expect(page.locator(HALL_OF_FAME_ROW).first()).toBeVisible();

    await page.locator(HALL_OF_FAME_DELETE_BUTTON).click();
    await page.locator(HALL_OF_FAME_DELETE_CONFIRM_BUTTON).click();
    await expect(page.locator(HALL_OF_FAME_EMPTY)).toBeVisible();
    await expect(page.locator(HALL_OF_FAME_ROW)).toHaveCount(0);

    await page.locator(HALL_OF_FAME_BACK_BUTTON).click();
    await expect(page.locator(HOME_SCREEN)).toBeVisible();

    // El borrado general (Hall of Fame) es una superficie distinta del
    // apodo individual guardado en el dispositivo: éste sigue intacto.
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexHallOfFame'));
  }, QUESTIONS_PER_GAME * 6_000 + NAVIGATION_TIMEOUT_MS);

  test('fallo de almacenamiento local: si guardar el apodo lanza, el flujo sigue avanzando en vez de bloquearse', async () => {
    await context.close();
    context = await browser.newContext();
    page = await context.newPage();

    // Mismo mecanismo que src/services/nicknameService.test.js a nivel
    // unitario ("surfaces a throwing setItem as a false return"), aplicado
    // aquí de punta a punta en un navegador real.
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

    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto(baseURL);
    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill('RexFalloStorage');
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();

    // La app degrada en silencio (nicknameService.js's contract: nunca
    // lanza) en vez de bloquear al niño con un error, y sigue al age gate.
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();
    expect(pageErrors).toEqual([]);

    // La persistencia falló de verdad: tras recargar no hay apodo guardado,
    // pero el juego sigue siendo completamente jugable como invitado.
    await page.reload();
    await expect(page.locator(HOME_SCREEN)).toBeVisible();
    await openHomeNicknamePanel(page);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(nicknameSettingsStrings.noNicknameSaved);
  }, NAVIGATION_TIMEOUT_MS);

  test('límite de 20 caracteres: se aplica igual en la pantalla de solicitud y en el panel de Inicio (20 se acepta, 21 se rechaza)', async () => {
    const tooLong = 'a'.repeat(21);
    const exactly20 = 'b'.repeat(20);

    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill(tooLong);
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await expect(page.locator(NICKNAME_ERROR)).toBeVisible();
    await expect(page.locator(NICKNAME_ERROR)).toHaveText(nicknameRequestStrings.errors.tooLong);
    await expect(page.locator(NICKNAME_INPUT)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();
    await expect(page.locator(AGE_GATE_SCREEN)).toHaveCount(0);

    await page.locator(NICKNAME_INPUT).fill(exactly20);
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();

    // Mismo límite exacto en el panel de edición de Inicio.
    await page.goto(baseURL);
    await openHomeNicknamePanel(page);

    await page.locator(HOME_NICKNAME_INPUT).fill(tooLong);
    await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_ERROR)).toBeVisible();
    await expect(page.locator(HOME_NICKNAME_ERROR)).toHaveText(nicknameSettingsStrings.errors.tooLong);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText(exactly20));

    await page.locator(HOME_NICKNAME_INPUT).fill(exactly20.replace(/b/g, 'c'));
    await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_STATUS)).toHaveText(nicknameSettingsStrings.saveSuccessMessage);
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText(exactly20.replace(/b/g, 'c')));
  }, NAVIGATION_TIMEOUT_MS);

  test('operación completa por teclado: la pantalla de solicitud y el panel de Inicio se completan sin usar el ratón', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();

    // El encabezado recibe el foco al montar (para que un lector de
    // pantalla anuncie la nueva vista de inmediato).
    await expect(page.locator(NICKNAME_TITLE)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator(NICKNAME_INPUT)).toBeFocused();
    await page.keyboard.type('RexTeclado');

    await page.keyboard.press('Tab');
    await expect(page.locator(NICKNAME_CONTINUE_BUTTON)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(AGE_GATE_SCREEN)).toBeVisible();

    // Panel de Inicio: abrir, navegar, borrar y cerrar sin ratón.
    await page.goto(baseURL);
    await page.getByRole('button', { name: HOME_NICKNAME_BUTTON_NAME }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(HOME_NICKNAME_PANEL)).toBeVisible();
    // wireDisclosure mueve el foco al botón "Cerrar" al abrir el panel.
    await expect(page.locator(HOME_PANEL_CLOSE_BUTTON_IN_NICKNAME_PANEL)).toBeFocused();

    // Escape cierra el panel y devuelve el foco al botón que lo abrió.
    await page.keyboard.press('Escape');
    await expect(page.locator(HOME_NICKNAME_PANEL)).toBeHidden();
    await expect(page.getByRole('button', { name: HOME_NICKNAME_BUTTON_NAME })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator(HOME_NICKNAME_PANEL)).toBeVisible();
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexTeclado'));

    // El foco de apertura cae en "Cerrar" (el último control del panel en
    // orden de documento), así que alcanzar el campo de texto con teclado
    // significa retroceder con Shift+Tab a través de "Borrar apodo" y
    // "Guardar" -- exactamente el orden real, no uno idealizado.
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(HOME_NICKNAME_DELETE_BUTTON)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(HOME_NICKNAME_SAVE_BUTTON)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(HOME_NICKNAME_INPUT)).toBeFocused();
    // Selecciona todo el contenido con teclado (Ctrl+A no selecciona texto
    // en un <input> bajo Chromium/Linux headless) antes de escribir encima.
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+Home');
    await page.keyboard.type('RexTecladoPanel');
    await page.keyboard.press('Tab');
    await expect(page.locator(HOME_NICKNAME_SAVE_BUTTON)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(currentNicknameText('RexTecladoPanel'));

    await page.keyboard.press('Tab');
    await expect(page.locator(HOME_NICKNAME_DELETE_BUTTON)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(HOME_NICKNAME_DELETE_CONFIRM)).toBeVisible();
    // El foco pasa al botón "Cancelar" al abrir la confirmación.
    await expect(page.locator(HOME_NICKNAME_DELETE_CANCEL_BUTTON)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator(HOME_NICKNAME_DELETE_CONFIRM_BUTTON)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(HOME_NICKNAME_CURRENT)).toHaveText(nicknameSettingsStrings.noNicknameSaved);
  }, NAVIGATION_TIMEOUT_MS);

  test('accesibilidad automática (axe-core): la pantalla de solicitud de apodo no tiene violaciones', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await expect(page.locator(NICKNAME_SCREEN)).toBeVisible();
    await auditScreen(page, 'Pantalla de solicitud de apodo');
  }, NAVIGATION_TIMEOUT_MS);

  test('accesibilidad automática (axe-core): la pantalla de solicitud de apodo con un error de validación visible no tiene violaciones', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_INPUT).fill('a'.repeat(21));
    await page.locator(NICKNAME_CONTINUE_BUTTON).click();
    await expect(page.locator(NICKNAME_ERROR)).toBeVisible();
    await auditScreen(page, 'Pantalla de solicitud de apodo (con error)');
  }, NAVIGATION_TIMEOUT_MS);

  test('accesibilidad automática (axe-core): el panel de edición del apodo en Inicio no tiene violaciones, abierto y con la confirmación de borrado visible', async () => {
    await openHomeNicknamePanel(page);
    await page.locator(HOME_NICKNAME_INPUT).fill('RexAxe');
    await page.locator(HOME_NICKNAME_SAVE_BUTTON).click();
    await auditScreen(page, 'Panel de apodo de Inicio (abierto)');

    await page.locator(HOME_NICKNAME_DELETE_BUTTON).click();
    await expect(page.locator(HOME_NICKNAME_DELETE_CONFIRM)).toBeVisible();
    await auditScreen(page, 'Panel de apodo de Inicio (confirmación de borrado)');
  }, NAVIGATION_TIMEOUT_MS);

  test('accesibilidad automática (axe-core): el Hall of Fame no tiene violaciones, con entradas y en estado vacío tras el borrado general', async () => {
    await page.locator(HOME_PLAY_BUTTON).click();
    await page.locator(NICKNAME_GUEST_BUTTON).click();
    await page.locator(AGE_GATE_OPTION).click();
    await page.locator(MODE_SELECTOR_QUIZ_CARD).click();
    await playFullGame(page);
    await expect(page.locator(RESULTS_SCREEN)).toBeVisible();
    await page.locator(RESULTS_EXIT_BUTTON).click();
    await expect(page.locator(HOME_SCREEN)).toBeVisible();

    await page.getByRole('button', { name: HOME_HALL_OF_FAME_BUTTON_NAME }).click();
    await expect(page.locator(HALL_OF_FAME_SCREEN)).toBeVisible();
    await auditScreen(page, 'Hall of Fame (con entradas)');

    await page.locator(HALL_OF_FAME_DELETE_BUTTON).click();
    await page.locator(HALL_OF_FAME_DELETE_CONFIRM_BUTTON).click();
    await expect(page.locator(HALL_OF_FAME_EMPTY)).toBeVisible();
    await auditScreen(page, 'Hall of Fame (vacío tras borrado general)');
  }, QUESTIONS_PER_GAME * 6_000 + NAVIGATION_TIMEOUT_MS);
});
