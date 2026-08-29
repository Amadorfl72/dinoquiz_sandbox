'use strict';

/**
 * Local SW status / last-preload tracking (TRIOFSND-305).
 *
 * The implementation lives in public/scripts/offlineStatus.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) -- the same rationale documented for
 * public/scripts/modeStorage.js. This canonical `src/services/` module
 * re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/offlineStatus');
