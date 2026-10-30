'use strict';

/**
 * Local player-avatar persistence.
 *
 * The implementation lives in public/scripts/avatarService.js because
 * public/scripts/main.js's game-start flow and the avatar picker have to
 * read/write it live in the browser without a bundler -- it is loaded there
 * as a `<script>` (see public/index.html), the same rationale documented
 * for public/scripts/nicknameService.js and public/scripts/hallOfFameService.js.
 * This canonical `src/services/` module re-exports it so Node/Jest and other
 * `src/` modules keep a single source of truth (mirrors
 * src/services/nicknameService.js re-exporting public/scripts/nicknameService.js).
 */

module.exports = require('../../public/scripts/avatarService');
