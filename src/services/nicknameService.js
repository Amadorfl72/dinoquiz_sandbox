'use strict';

/**
 * Local nickname ("apodo") persistence.
 *
 * The implementation lives in public/scripts/nicknameService.js because
 * public/scripts/main.js's game-start flow has to read/write it live in the
 * browser without a bundler -- it is loaded there as a `<script>` (see
 * public/index.html), the same rationale documented for
 * public/scripts/homeScreen.js and public/scripts/modeStorage.js. This
 * canonical `src/services/` module re-exports it so Node/Jest and other
 * `src/` modules keep a single source of truth (mirrors
 * src/services/network.js re-exporting public/scripts/network.js and how
 * src/services/modeStorage.js loads public/scripts/modeStorage.js).
 */

module.exports = require('../../public/scripts/nicknameService');
