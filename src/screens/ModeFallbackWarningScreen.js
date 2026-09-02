'use strict';

/**
 * Mode-dispatch fallback warning screen (TRIOFSND-322).
 *
 * The implementation lives in public/scripts/modeFallbackWarningScreen.js
 * because the browser renders this screen directly, and without a bundler
 * it must be loaded there as a `<script>` (see public/index.html) — the
 * same rationale documented for public/scripts/modeBlockedScreen.js. This
 * canonical `src/screens/` module re-exports it so Node/Jest keep a single
 * source of truth.
 */

module.exports = require('../../public/scripts/modeFallbackWarningScreen');
