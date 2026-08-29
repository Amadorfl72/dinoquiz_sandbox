'use strict';

/**
 * Clasifica bonus round timer (TRIOFSND-280).
 *
 * The implementation lives in public/scripts/classifyTimer.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) -- the same rationale documented for
 * public/scripts/gameFlow.js. Unlike classifyGame.js, this module has no
 * fs-backed dependency, so there is no second, browser-specific
 * implementation to keep in sync: this canonical `src/game/` module
 * re-exports it so Node/Jest and other `src/` modules keep a single source
 * of truth.
 */

module.exports = require('../../public/scripts/classifyTimer');
