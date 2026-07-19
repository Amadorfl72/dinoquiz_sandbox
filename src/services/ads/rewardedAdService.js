'use strict';

/**
 * Rewarded-ad access point (TRIOFSND-86). Every "watch an ad to unlock X" CTA
 * in the app calls through this single seam instead of talking to an ad
 * network directly, so plugging in a real provider later only touches this
 * file, not every screen with a CTA.
 *
 * The implementation lives in public/scripts/adsService.js because, without
 * a bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) — the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/services/ads/` module
 * re-exports it so Node/Jest and other `src/` modules keep a single source
 * of truth (mirrors how src/game/scoring.js re-exports
 * public/scripts/scoring.js).
 */

module.exports = require('../../../public/scripts/adsService');
