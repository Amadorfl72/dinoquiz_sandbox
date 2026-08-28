'use strict';

/**
 * Oído Jurásico screen (TRIOFSND-270).
 *
 * The implementation lives in public/scripts/oidoJurasicoScreen.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) — the same rationale documented for
 * public/scripts/questionScreen.js. This canonical `src/screens/` module
 * re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/oidoJurasicoScreen');
