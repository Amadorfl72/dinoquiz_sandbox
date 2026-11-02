'use strict';

/**
 * Catalog of selectable dinosaur avatars for the nickname screen's avatar
 * picker.
 *
 * The implementation lives in public/scripts/avatarList.js because the
 * nickname screen's avatar picker (public/scripts/nicknameScreen.js) has to
 * read it live in the browser without a bundler -- it is loaded there as a
 * `<script>` (see public/index.html), the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/data/` module re-exports
 * it so Node/Jest and other `src/` modules keep a single source of truth
 * (mirrors how src/game/modesCatalog.js re-exports public/scripts/modesCatalog.js).
 */

module.exports = require('../../public/scripts/avatarList');
