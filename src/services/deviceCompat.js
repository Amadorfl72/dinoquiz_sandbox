'use strict';

/**
 * Device compatibility + anonymous crash logging (TRIOFSND-143).
 *
 * The implementation lives in public/scripts/deviceCompat.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) -- the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/services/` module
 * re-exports it so Node/Jest and other `src/` modules keep a single source
 * of truth (mirrors src/services/network.js re-exporting
 * public/scripts/network.js).
 */

module.exports = require('../../public/scripts/deviceCompat');
