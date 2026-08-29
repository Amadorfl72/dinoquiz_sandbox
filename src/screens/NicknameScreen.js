'use strict';

/**
 * Nickname request ("solicitud de nombre") screen.
 *
 * The implementation lives in public/scripts/nicknameScreen.js because the
 * browser renders this screen directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) — the same rationale
 * documented for public/scripts/homeScreen.js. This canonical `src/screens/`
 * module re-exports it so Node/Jest keep a single source of truth (mirrors
 * how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/nicknameScreen');
