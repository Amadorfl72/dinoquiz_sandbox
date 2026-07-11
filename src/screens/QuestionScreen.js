'use strict';

/**
 * Pregunta/Feedback screen (TRIOFSND-77 / TRIOFSND-88, TRIOFSND-135).
 *
 * The implementation lives in public/scripts/questionScreen.js because the
 * browser renders this screen directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) — the same rationale
 * documented for public/scripts/homeScreen.js. This canonical `src/screens/`
 * module re-exports it so Node/Jest keep a single source of truth (mirrors
 * how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/questionScreen');
