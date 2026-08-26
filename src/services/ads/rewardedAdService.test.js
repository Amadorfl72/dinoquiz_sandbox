'use strict';

const { RewardedAdService, unavailableProvider, rewardedAdService } = require('./rewardedAdService');

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

    const result = await service.request();

    expect(result).toEqual({ granted: false, reason: 'unavailable' });
    expect(show).not.toHaveBeenCalled();
  });

  test('request() resolves { granted: true, reason: null } when the child watches the ad to completion', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.resolve({ granted: true }),
    });

    const result = await service.request();

    expect(result).toEqual({ granted: true, reason: null });
  });

  test('request() resolves { granted: false, reason: "not-completed" } when the ad is available but declined/abandoned', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.resolve({ granted: false }),
    });

    const result = await service.request();

    expect(result).toEqual({ granted: false, reason: 'not-completed' });
  });

  test('request() never rejects — a provider that throws/rejects still resolves { granted: false, reason: "error" }', async () => {
    const service = new RewardedAdService({
      isAvailable: () => true,
      show: () => Promise.reject(new Error('ad network timeout')),
    });

    await expect(service.request()).resolves.toEqual({ granted: false, reason: 'error' });
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
