'use strict';

/**
 * Global mute/unmute button (PRD "controles globales", AC-11, AC-13, AC-14).
 *
 * A single speaker-icon button with two distinct visual states (outlined
 * "sound on" vs filled "sound off", see src/theme/muteToggleColors.js) and an
 * aria-label that names the action a tap will perform -- "Silenciar sonido"
 * while sound is on, "Activar sonido" while muted -- so screen readers never
 * announce a bare "button" with no state.
 *
 * State is read from and persisted through the shared `dinoQuizStorage`
 * service so mute survives reloads (AC-11) and stays in sync if it changes
 * in another tab. `storage.snapshot()` renders the current state
 * synchronously (defaulting to unmuted) so the button never flashes the
 * wrong icon while `storage.init()` resolves.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');
const { dinoQuizStorage } = require('../services/storage');

function createSpeakerIcon(hidden) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('mute-toggle__icon');
  svg.hidden = hidden;
  return svg;
}

function createIconOn() {
  const svg = createSpeakerIcon(false);
  svg.classList.add('mute-toggle__icon--on');
  svg.innerHTML =
    '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />' +
    '<path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />' +
    '<path d="M19 6a9 9 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />';
  return svg;
}

function createIconOff() {
  const svg = createSpeakerIcon(true);
  svg.classList.add('mute-toggle__icon--off');
  svg.innerHTML =
    '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />' +
    '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />';
  return svg;
}

function renderMuteToggle(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { appShell: strings } = getStrings(locale);
  const storage = options.storage || dinoQuizStorage;

  container.innerHTML = '';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute-toggle';

  const iconOn = createIconOn();
  const iconOff = createIconOff();
  button.appendChild(iconOn);
  button.appendChild(iconOff);

  function applyState(muted) {
    button.classList.toggle('mute-toggle--muted', muted);
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? strings.muteButton.unmute : strings.muteButton.mute);
    iconOn.hidden = muted;
    iconOff.hidden = !muted;
  }

  applyState(storage.snapshot().muted);

  storage.init().then(() => {
    applyState(storage.snapshot().muted);
  });

  button.addEventListener('click', async () => {
    const muted = await storage.toggleMute();
    applyState(muted);
  });

  container.appendChild(button);

  return { root: button, button };
}

module.exports = { renderMuteToggle };
