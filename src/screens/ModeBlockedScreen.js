'use strict';

/**
 * Blocked-mode screen (TRIOFSND-306).
 *
 * The implementation lives in public/scripts/modeBlockedScreen.js because
 * the browser renders this screen directly, and without a bundler it must
 * be loaded there as a `<script>` (see public/index.html) — the same
 * rationale documented for public/scripts/homeScreen.js. This canonical
 * `src/screens/` module re-exports it so Node/Jest keep a single source of
 * truth (mirrors src/screens/ModeChangeConfirmScreen.js re-exporting
 * public/scripts/modeChangeConfirmScreen.js).
 */

module.exports = require('../../public/scripts/modeBlockedScreen');
