'use strict';

/**
 * Shared app shell / layout (PRD "controles globales", AC-11).
 *
 * Mounts the single global mute toggle once, in a persistent header, and
 * exposes a `content` element where the current screen (Inicio, Quiz,
 * Feedback, Resultados, ...) renders. Screens stay unaware of the mute
 * button entirely -- they just render into `content` -- so it can never end
 * up duplicated per-screen.
 */

const { renderMuteToggle } = require('../components/MuteToggle');

function renderAppShell(container, options = {}) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'app-shell__header';

  const muteToggleContainer = document.createElement('div');
  muteToggleContainer.className = 'app-shell__mute-toggle';
  header.appendChild(muteToggleContainer);

  const content = document.createElement('div');
  content.className = 'app-shell__content';

  root.appendChild(header);
  root.appendChild(content);
  container.appendChild(root);

  const muteToggle = renderMuteToggle(muteToggleContainer, options);

  return { root, header, content, muteToggle };
}

module.exports = { renderAppShell };
