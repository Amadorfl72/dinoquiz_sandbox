'use strict';

/**
 * Local diagnostics service (TRIOFSND-317/TRIOFSND-319): aggregated
 * counters, seven-day retention and structured error codes, all local-only.
 *
 * The implementation lives in public/scripts/diagnostics.js because the
 * diagnostics screen (public/scripts/diagnosticsScreen.js) renders directly
 * in the browser and, without a bundler, must load it there as a `<script>`
 * (see public/index.html) -- the same rationale documented for
 * public/scripts/offlineStatus.js. This canonical `src/services/` module
 * re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/diagnostics');
