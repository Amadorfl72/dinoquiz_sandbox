'use strict';

/**
 * Local, on-device analytics recorder for the generic mode dispatcher
 * (public/scripts/main.js's `handleModeSelected`/`startMode`, TRIOFSND-322).
 *
 * The implementation lives in public/scripts/analytics.js because main.js's
 * `resolveAnalytics` has to reach it live in the real, bundler-less browser
 * (loaded there as a `<script>` that registers it on
 * `window.DinoQuiz.services.analytics`, see public/index.html). This canonical
 * `src/services/` module re-exports it so Node/Jest keep a single source of
 * truth -- mirrors how src/services/modeStorage.js re-exports
 * public/scripts/modeStorage.js.
 */

module.exports = require('../../public/scripts/analytics');
