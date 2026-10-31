'use strict';

/**
 * Catalog of player avatars (trioforge-dinoquiz-player-avatars skill).
 *
 * The implementation lives in public/scripts/avatarCatalog.js because the
 * avatar picker screen has to read it live in the browser without a
 * bundler -- it is loaded there as a `<script>` (see public/index.html),
 * the same rationale documented for public/scripts/nicknameService.js. This
 * canonical `src/data/` module re-exports it so Node/Jest and other `src/`
 * modules keep a single source of truth (mirrors
 * src/services/nicknameService.js re-exporting
 * public/scripts/nicknameService.js).
 */

module.exports = require('../../public/scripts/avatarCatalog');
