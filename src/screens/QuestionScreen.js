'use strict';

/**
 * Pregunta/Feedback screen (TRIOFSND-72 / TRIOFSND-77 / TRIOFSND-88 / TRIOFSND-83 / TRIOFSND-84 / TRIOFSND-135 / TRIOFSND-79).
 *
 * Rewarded-ad CTA (TRIOFSND-86): once the feedback is revealed, an optional,
 * clearly-labeled "watch an ad for an extra dato curioso" button appears
 * through `src/services/ads/rewardedAdService` (the app's one seam for every
 * rewarded-ad CTA) — but only when that service reports an ad is actually
 * available, since v1 ships without a real ad network wired in and a CTA
 * that always fails would be worse than no CTA. Clicking it never touches
 * `nextButton`/its advance timer: whatever the ad service resolves with —
 * granted or not, available or not, completed or abandoned — the CTA only
 * ever shows or hides the extra fact box and never blocks or delays the
 * child from pressing "Siguiente" (PRD: "si no se ve el rewarded, la
 * partida funciona igual").
 *
 * The implementation lives in public/scripts/questionScreen.js because the
 * browser renders this screen directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) — the same rationale
 * documented for public/scripts/homeScreen.js. This canonical `src/screens/`
 * module re-exports it so Node/Jest keep a single source of truth (mirrors
 * how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/questionScreen');
