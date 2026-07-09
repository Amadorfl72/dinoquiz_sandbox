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
 */

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
  if (!this.isAvailable()) {
    return Promise.resolve({ granted: false, reason: 'unavailable' });
  }

  return Promise.resolve()
    .then(() => this.provider.show())
    .then((result) => ({
      granted: !!(result && result.granted),
      reason: result && result.granted ? null : 'not-completed',
    }))
    .catch(() => ({ granted: false, reason: 'error' }));
};

const rewardedAdService = new RewardedAdService();

module.exports = { RewardedAdService, unavailableProvider, rewardedAdService };
