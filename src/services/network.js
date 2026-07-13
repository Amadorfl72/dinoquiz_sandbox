'use strict';

/**
 * Network status (TRIOFSND-112).
 *
 * The implementation lives in public/scripts/network.js because, without a
 * bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) -- the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/services/` module
 * re-exports it so Node/Jest and other `src/` modules keep a single source
 * of truth (mirrors src/services/audio.js re-exporting public/scripts/audio.js).
 */

module.exports = require('../../public/scripts/network');
