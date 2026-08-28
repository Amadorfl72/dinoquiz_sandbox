'use strict';

/**
 * Línea del tiempo board screen (TRIOFSND-293).
 *
 * The implementation lives in public/scripts/timelineScreen.js because the
 * browser renders this screen directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) -- the same rationale
 * documented for public/scripts/classifyScreen.js. This canonical
 * `src/screens/` module re-exports it so Node/Jest keep a single source of
 * truth.
 */

module.exports = require('../../public/scripts/timelineScreen');
