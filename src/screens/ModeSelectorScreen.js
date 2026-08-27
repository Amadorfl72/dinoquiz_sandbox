'use strict';

/**
 * Illustrated mode selector screen (TRIOFSND-231, PRD "Selector ilustrado de
 * modos").
 *
 * The implementation lives in public/scripts/modeSelectorScreen.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) — the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/screens/` module
 * re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/modeSelectorScreen');
