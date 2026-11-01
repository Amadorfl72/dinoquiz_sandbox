'use strict';

/**
 * Local player-avatar persistence.
 *
 * The implementation lives in public/scripts/avatarService.js because,
 * once an avatar picker is wired into the game-start flow, it has to
 * read/write it live in the browser without a bundler -- it is loaded
 * there as a `<script>` (see public/index.html), the same rationale
 * documented for public/scripts/nicknameService.js. This canonical
 * `src/services/` module re-exports it so Node/Jest and other `src/`
 * modules keep a single source of truth (mirrors
 * src/services/nicknameService.js re-exporting public/scripts/nicknameService.js).
 */

module.exports = require('../../public/scripts/avatarService');
