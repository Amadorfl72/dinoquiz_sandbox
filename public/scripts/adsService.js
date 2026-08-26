'use strict';

/**
 * Rewarded-ad access point (TRIOFSND-86). Every "watch an ad to unlock X" CTA
 * in the app calls through this single seam instead of talking to an ad
 * network directly, so plugging in a real provider later only touches this
 * file, not every screen with a CTA.
 *
 * v1 ships without a behavioral/tracking ad SDK (PRD open_risks: "sin SDK
 * publicitario comportamental"), so the default provider always reports the
 * ad as unavailable. `request()` always resolves (never rejects) with a
 * `{ granted, reason }` result, whether the ad was unavailable, declined,
 * failed, or watched to completion — callers never need a try/catch, so the
 * optional CTA can never block the rest of the game (PRD alternative_workflows:
 * "si no se ve el rewarded, la partida funciona igual").
 *
 * Browser bridge: DinoQuiz ships without a bundler, so this module follows
 * the same dual CommonJS/global pattern as public/scripts/scoring.js: it
 * registers on `window.DinoQuiz.ads.rewardedAdService` for the `<script>`-
 * loaded PWA (see public/index.html) and also `module.exports` for
 * Node/Jest. The canonical `src/services/ads/rewardedAdService.js` re-
 * exports this file so tests and other `src/` modules keep a single source
 * of truth (mirrors how src/game/scoring.js re-exports
 * public/scripts/scoring.js).
 */

(function () {
  function unavailableProvider() {
    return {
      isAvailable: function () {
        return false;
      },
      show: function () {
        return Promise.resolve({ granted: false });
      },
    };
  }

  function RewardedAdService(provider) {
    this.provider = provider || unavailableProvider();
  }

  RewardedAdService.prototype.isAvailable = function isAvailable() {
    try {
      return !!this.provider.isAvailable();
    } catch (error) {
      return false;
    }
  };

  RewardedAdService.prototype.request = function request() {
    var self = this;

    if (!this.isAvailable()) {
      return Promise.resolve({ granted: false, reason: 'unavailable' });
    }

    return Promise.resolve()
      .then(function () {
        return self.provider.show();
      })
      .then(function (result) {
        return {
          granted: !!(result && result.granted),
          reason: result && result.granted ? null : 'not-completed',
        };
      })
      .catch(function () {
        return { granted: false, reason: 'error' };
      });
  };

  var rewardedAdService = new RewardedAdService();

  var api = {
    RewardedAdService: RewardedAdService,
    unavailableProvider: unavailableProvider,
    rewardedAdService: rewardedAdService,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.ads = window.DinoQuiz.ads || {};
    window.DinoQuiz.ads.rewardedAdService = rewardedAdService;
  }
})();
