'use strict';

/**
 * Per-mode local persistence of level progress, last result and unlock
 * counts (TRIOFSND-250).
 *
 * The implementation lives in public/scripts/modeProgressStorage.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) so the eight game modes can actually save/read
 * progress after a reload -- the same rationale documented for
 * public/scripts/homeScreen.js/logging.js. This canonical `src/services/`
 * module re-exports it so Node/Jest and other `src/` modules (e.g.
 * src/services/storage/index.js) keep a single source of truth.
 */

module.exports = require('../../../public/scripts/modeProgressStorage');
