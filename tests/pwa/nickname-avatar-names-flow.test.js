'use strict';

/**
 * The nickname step's avatar picker (public/scripts/nicknameScreen.js) gives
 * each dinosaur option an accessible name built from the i18n
 * `dinosaurNames` map (e.g. "Elegir a Tyrannosaurus Rex como tu avatar"),
 * never the bare id ("trex"). `renderNicknameScreen` resolves
 * `dinosaurNames` two ways: from `options.dinosaurNames` if the caller
 * passes it, or -- only as a Jest/Node convenience -- via
 * `require('../../src/i18n')`. A real browser has no `require`, so that
 * fallback is unavailable there; `public/scripts/main.js` MUST fetch
 * `dinosaurNames` itself (`loadHomeResources`) and thread it through
 * `renderNicknameStep` into the screen, or the accessible names silently
 * degrade to raw ids outside of tests.
 *
 * This spec defeats the require() fallback (by stripping `dinosaurNames`
 * from the mocked `src/i18n` resource) so it genuinely exercises whether
 * `main.js`'s own fetch-and-thread path supplies the names -- unlike
 * src/screens/NicknameScreen.test.js's avatar picker suite, which always
 * passes `dinosaurNames` directly into `renderNicknameScreen` and so never
 * sees this gap.
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const {
  home: homeStrings,
  ageGate: ageGateStrings,
  nicknameRequest: nicknameStrings,
  dinosaurNames,
} = require('../../public/i18n/es.json');

jest.mock('../../src/i18n', () => {
  const real = jest.requireActual('../../src/i18n');
  return {
    ...real,
    getStrings: (locale) => {
      const { dinosaurNames: _omitted, ...rest } = real.getStrings(locale);
      return rest;
    },
  };
});

describe('nickname step avatar names, resolved through main.js (not injected directly into the screen)', () => {
  let container;
  let addEventListenerSpy;

  beforeAll(() => {
    const originalAddEventListener = window.addEventListener.bind(window);
    addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'load' || type === 'hashchange') {
        return undefined;
      }
      return originalAddEventListener(type, listener, options);
    });
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
  });

  beforeEach(() => {
    delete window.DinoQuiz;
    jest.resetModules();
    window.localStorage.clear();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    window.localStorage.clear();
  });

  test('an avatar option\'s accessible name uses the localized dinosaur name fetched by main.js, not the raw id', async () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const fetchFn = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          home: homeStrings,
          ageGate: ageGateStrings,
          nicknameRequest: nicknameStrings,
          dinosaurNames,
        }),
    });

    await renderHome(document, renderers.renderHomeScreen, fetchFn);

    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    expect(getByRole(container, 'heading', { name: nicknameStrings.screenTitle })).toBeInTheDocument();

    const trexOption = container.querySelector('[data-avatar-id="trex"]');
    expect(trexOption).toHaveAttribute(
      'aria-label',
      nicknameStrings.avatarPicker.optionAriaLabelFormat.replace('{dinosaur}', dinosaurNames.trex)
    );
  });
});
