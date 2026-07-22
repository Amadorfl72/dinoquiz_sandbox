'use strict';

/**
 * Shared "historic progress" indicators (TRIOFSND-129): mejor puntuación,
 * racha máxima and "Descubiertos X/Y" datos curiosos, rendered identically
 * on Inicio and Resultados. A logic/DOM module (not a "pantalla" -- neither
 * screen navigates to it), so it lives alongside public/scripts/scoring.js
 * and public/scripts/gameFlow.js and follows their same dual CommonJS/
 * `window.DinoQuiz` bridge so both homeScreen.js and resultsScreen.js can
 * build one without duplicating its markup.
 *
 * All three numbers come from the caller (public/scripts/main.js), which
 * resolves them from src/services/storage's sanitizing `getProgressSummary`
 * -- this module never touches storage itself, matching how the screens
 * already treat `onAnswer`/`onPlayAgain`/etc. as pure callbacks.
 *
 * No transient false zeros: `total` (the catalog size) is always known
 * synchronously from the local question bank, so it renders immediately,
 * but `bestScore`/`maxStreak`/`discovered` show a neutral "…" placeholder
 * until `update()` is called with `progress.ready === true` -- never an
 * invented `0`/`0/total` while the real, storage-resolved value is still
 * pending.
 */

(function () {
  function formatTemplate(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.split('{' + key + '}').join(values[key]);
    }, template);
  }

  function buildProgressSummary(strings, initialProgress) {
    var root = document.createElement('div');
    root.className = 'progress-summary';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', strings.groupLabel);

    var bestScoreEl = document.createElement('p');
    bestScoreEl.className = 'progress-summary__best-score';

    var maxStreakEl = document.createElement('p');
    maxStreakEl.className = 'progress-summary__max-streak';

    var discoveredEl = document.createElement('p');
    discoveredEl.className = 'progress-summary__discovered';

    root.appendChild(bestScoreEl);
    root.appendChild(maxStreakEl);
    root.appendChild(discoveredEl);

    function update(progress) {
      var p = progress || {};
      var total = typeof p.total === 'number' ? p.total : 0;

      bestScoreEl.textContent = p.ready
        ? formatTemplate(strings.bestScoreFormat, { score: p.bestScore })
        : strings.bestScoreLabel + ': ' + strings.pendingValue;

      maxStreakEl.textContent = p.ready
        ? formatTemplate(strings.maxStreakFormat, { streak: p.maxStreak })
        : strings.maxStreakLabel + ': ' + strings.pendingValue;

      discoveredEl.textContent = p.ready
        ? formatTemplate(strings.discoveredFormat, { discovered: p.discovered, total: total })
        : formatTemplate(strings.discoveredPendingFormat, { total: total });
    }

    update(initialProgress);

    return {
      root: root,
      bestScoreEl: bestScoreEl,
      maxStreakEl: maxStreakEl,
      discoveredEl: discoveredEl,
      update: update,
    };
  }

  var api = { buildProgressSummary: buildProgressSummary };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.components = window.DinoQuiz.components || {};
    window.DinoQuiz.components.buildProgressSummary = buildProgressSummary;
  }
})();
