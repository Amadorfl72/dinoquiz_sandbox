'use strict';

/**
 * Local sign-off registry for the PRD's numeric product goals (TRIOFSND-325).
 *
 * The implementation lives in public/scripts/productGoals.js because,
 * without a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) -- the same rationale documented for
 * public/scripts/offlineStatus.js. This canonical `src/services/` module
 * re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/productGoals');
