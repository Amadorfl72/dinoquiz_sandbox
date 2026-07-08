'use strict';

/**
 * Home ("Inicio") screen: title, the mascot illustration, the '¡Jugar!'
 * entry point and a discreet, optional notice for parents about local-only
 * progress. All copy comes from the i18n resource (see src/i18n) — no
 * hardcoded strings here, per AC-15.
 *
 * The mascot is a small, hand-authored SVG precached with the app shell
 * (see public/service-worker.js) so it paints with the rest of the screen
 * on a cold, offline load instead of waiting on a separate runtime-cached
 * fetch — this is what keeps first render under the 2s budget.
 *
 * The notice uses `role="note"` (ancillary content, not part of the main
 * reading/interaction flow) so assistive tech can reach it without a child
 * needing to interact with it first — it is never focused programmatically
 * and never sits between the title and the play button in tab order.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');

const MASCOT_IMAGE_SRC = '/assets/images/mascot.svg';
const MASCOT_IMAGE_SIZE = 320;

function renderHomeScreen(container, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { home: strings } = getStrings(locale);

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'home-screen';

  const title = document.createElement('h1');
  title.className = 'home-screen__title';
  title.textContent = strings.title;

  const mascot = document.createElement('img');
  mascot.className = 'home-screen__mascot';
  mascot.src = MASCOT_IMAGE_SRC;
  mascot.alt = strings.mascotAlt;
  mascot.width = MASCOT_IMAGE_SIZE;
  mascot.height = MASCOT_IMAGE_SIZE;
  mascot.decoding = 'async';
  mascot.setAttribute('fetchpriority', 'high');

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'home-screen__play-button';
  playButton.textContent = strings.playButton;

  const parentalNotice = document.createElement('p');
  parentalNotice.className = 'home-screen__parental-notice';
  parentalNotice.setAttribute('role', 'note');
  parentalNotice.setAttribute('aria-label', strings.parentalNotice.label);
  parentalNotice.textContent = strings.parentalNotice.message;

  root.appendChild(title);
  root.appendChild(mascot);
  root.appendChild(playButton);
  root.appendChild(parentalNotice);
  container.appendChild(root);

  return { root, title, mascot, playButton, parentalNotice };
}

module.exports = { renderHomeScreen, MASCOT_IMAGE_SRC };
