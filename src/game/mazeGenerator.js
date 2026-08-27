'use strict';

/**
 * Solvable maze generation for the Laberinto game mode (TRIOFSND-255).
 *
 * The implementation lives in public/scripts/mazeGenerator.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) — the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/game/` module re-exports
 * it so Node/Jest and other `src/` modules keep a single source of truth.
 */

module.exports = require('../../public/scripts/mazeGenerator');
