'use strict';

const {
  RewardedAdService,
  unavailableProvider,
  rewardedAdService,
  isRoundTransition,
} = require('./rewardedAdService');

describe('RewardedAdService', () => {
  test('the default provider always reports the ad as unavailable (no ad SDK wired into v1)', () => {
    const service = new RewardedAdService();
    expect(service.isAvailable()).toBe(false);
  });

  test('the shared singleton is exported for callers that do not need a custom provider', () => {
    expect(rewardedAdService).toBeInstanceOf(RewardedAdService);
    expect(rewardedAdService.isAvailable()).toBe(false);
  });

  test('unavailableProvider() matches the provider shape (isAvailable/show)', () => {
    const provider = unavailableProvider();
    expect(provider.isAvailable()).toBe(false);
    return expect(provider.show()).resolves.toEqual({ granted: false });
  });

  test('request() resolves { granted: false, reason: "unavailable" } without calling an unavailable provider\'s show()', async () => {
    const show = jest.fn();
    const service = new RewardedAdService({ isAvailable: () => false, show });

    const result = await service.request({ status: 'finished' });

    expect(result).toEqual({ granted: false, reason: 'unavailable' });
    expect(show).not.toHaveBeenCalled();
  });

  test('request() resolves { granted: true, reason: null } when the child watches the ad to completion', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.resolve({ granted: true }),
    });

    const result = await service.request({ status: 'finished' });

    expect(result).toEqual({ granted: true, reason: null });
  });

  test('request() resolves { granted: false, reason: "not-completed" } when the ad is available but declined/abandoned', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.resolve({ granted: false }),
    });

    const result = await service.request({ status: 'finished' });

    expect(result).toEqual({ granted: false, reason: 'not-completed' });
  });

  test('request() never rejects — a provider that throws/rejects still resolves { granted: false, reason: "error" }', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.reject(new Error('ad network timeout')),
    });

    await expect(service.request({ status: 'finished' })).resolves.toEqual({ granted: false, reason: 'error' });
  });

  test('isAvailable() degrades to false instead of throwing when the provider itself throws', () => {
    const service = new RewardedAdService({
      isAvailable: () => {
        throw new Error('sdk not initialized');
      },
    });

    expect(service.isAvailable()).toBe(false);
  });
});

describe('round-transition gating (TRIOFSND-245: ads only between games, never mid-round/over the board)', () => {
  test('isRoundTransition() is false with no session — a caller must pass the roundContract session explicitly', () => {
    expect(isRoundTransition(undefined)).toBe(false);
  });

  test('isRoundTransition() is true once roundContract has flipped the session to "finished"', () => {
    expect(isRoundTransition({ status: 'finished' })).toBe(true);
  });

  test('isRoundTransition() is false while the roundContract session is "playing" (mid-round, over the board/controls)', () => {
    expect(isRoundTransition({ status: 'playing' })).toBe(false);
  });

  test('isRoundTransition() is false while the roundContract session is "paused"', () => {
    expect(isRoundTransition({ status: 'paused' })).toBe(false);
  });

  test('request() rejects a "playing" session without ever calling the provider\'s show()', async () => {
    const show = jest.fn(() => Promise.resolve({ granted: true }));
    const service = new RewardedAdService({ isAvailable: () => true, show });

    const result = await service.request({ status: 'playing' });

    expect(result).toEqual({ granted: false, reason: 'not-round-transition' });
    expect(show).not.toHaveBeenCalled();
  });

  test('request() rejects a "paused" session without ever calling the provider\'s show()', async () => {
    const show = jest.fn(() => Promise.resolve({ granted: true }));
    const service = new RewardedAdService({ isAvailable: () => true, show });

    const result = await service.request({ status: 'paused' });

    expect(result).toEqual({ granted: false, reason: 'not-round-transition' });
    expect(show).not.toHaveBeenCalled();
  });

  test('request() still proceeds to the provider for a "finished" session', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.resolve({ granted: true }),
    });

    const result = await service.request({ status: 'finished' });

    expect(result).toEqual({ granted: true, reason: null });
  });

  test('request() rejects a missing session without ever calling the provider\'s show()', async () => {
    const show = jest.fn(() => Promise.resolve({ granted: true }));
    const service = new RewardedAdService({ isAvailable: () => true, show });

    const result = await service.request();

    expect(result).toEqual({ granted: false, reason: 'not-round-transition' });
    expect(show).not.toHaveBeenCalled();
  });
});
