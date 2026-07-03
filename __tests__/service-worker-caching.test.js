/**
 * TRIOFSND-6: Service Worker Caching Tests
 * Verifies that the service worker caches app shell, assets, audio,
 * images, and questions JSON on first load (install event).
 */

// Mock Cache and Caches API
const mockCache = {
  addAll: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  put: jest.fn().mockResolvedValue(undefined),
  match: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(true),
};

const mockCaches = {
  open: jest.fn().mockResolvedValue(mockCache),
  has: jest.fn().mockResolvedValue(false),
  delete: jest.fn().mockResolvedValue(true),
  keys: jest.fn().mockResolvedValue([]),
  match: jest.fn().mockResolvedValue(undefined),
};

global.caches = mockCaches;

describe('Service Worker Caching (TRIOFSND-6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaches.open.mockResolvedValue(mockCache);
    mockCache.addAll.mockResolvedValue(undefined);
  });

  describe('Install Event - App Shell Caching', () => {
    test('should create a cache with the correct cache name', async () => {
      const { CACHE_NAMES, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAMES.APP_SHELL);
    });

    test('should cache app shell files on install', async () => {
      const { APP_SHELL_URLS, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      expect(mockCache.addAll).toHaveBeenCalledTimes(1);
      const cachedUrls = mockCache.addAll.mock.calls[0][0];
      APP_SHELL_URLS.forEach((url) => {
        expect(cachedUrls).toContain(url);
      });
    });

    test('should cache index.html', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const cachedUrls = mockCache.addAll.mock.calls[0][0];
      expect(cachedUrls).toContain('/');
      expect(cachedUrls).toContain('/index.html');
    });

    test('should cache CSS and JS assets', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const cachedUrls = mockCache.addAll.mock.calls[0][0];
      expect(cachedUrls.some((u) => u.endsWith('.css'))).toBe(true);
      expect(cachedUrls.some((u) => u.endsWith('.js'))).toBe(true);
    });

    test('should call event.waitUntil during install', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      expect(event.waitUntil).toHaveBeenCalled();
    });
  });

  describe('Install Event - Audio Caching', () => {
    test('should cache audio assets in a separate audio cache', async () => {
      const { CACHE_NAMES, AUDIO_URLS, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAMES.AUDIO);
      const audioCacheCall = mockCaches.open.mock.calls.find(
        (c) => c[0] === CACHE_NAMES.AUDIO
      );
      expect(audioCacheCall).toBeDefined();
    });

    test('should cache all audio files listed in AUDIO_URLS', async () => {
      const { AUDIO_URLS, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      // Verify audio URLs are included in cache.addAll calls
      const allCachedUrls = mockCache.addAll.mock.calls.map((c) => c[0]).flat();
      AUDIO_URLS.forEach((url) => {
        expect(allCachedUrls).toContain(url);
      });
    });

    test('should handle audio files with common audio extensions', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const allCachedUrls = mockCache.addAll.mock.calls.map((c) => c[0]).flat();
      const audioUrls = allCachedUrls.filter((u) =>
        /\.(mp3|wav|ogg|m4a|aac)$/i.test(u)
      );
      expect(audioUrls.length).toBeGreaterThan(0);
    });
  });

  describe('Install Event - Image Caching', () => {
    test('should cache image assets in a separate image cache', async () => {
      const { CACHE_NAMES, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAMES.IMAGES);
    });

    test('should cache all image files listed in IMAGE_URLS', async () => {
      const { IMAGE_URLS, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const allCachedUrls = mockCache.addAll.mock.calls.map((c) => c[0]).flat();
      IMAGE_URLS.forEach((url) => {
        expect(allCachedUrls).toContain(url);
      });
    });

    test('should handle image files with common image extensions', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const allCachedUrls = mockCache.addAll.mock.calls.map((c) => c[0]).flat();
      const imageUrls = allCachedUrls.filter((u) =>
        /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(u)
      );
      expect(imageUrls.length).toBeGreaterThan(0);
    });
  });

  describe('Install Event - Questions JSON Caching', () => {
    test('should cache questions JSON file', async () => {
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      const allCachedUrls = mockCache.addAll.mock.calls.map((c) => c[0]).flat();
      const jsonUrls = allCachedUrls.filter((u) =>
        /questions.*\.json$/i.test(u)
      );
      expect(jsonUrls.length).toBeGreaterThan(0);
    });

    test('should cache questions JSON in data cache or app shell cache', async () => {
      const { CACHE_NAMES, handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      // Questions JSON should be cached in either DATA or APP_SHELL cache
      const cacheNamesUsed = mockCaches.open.mock.calls.map((c) => c[0]);
      const hasDataCache = cacheNamesUsed.includes(CACHE_NAMES.DATA);
      const hasAppShellCache = cacheNamesUsed.includes(CACHE_NAMES.APP_SHELL);
      expect(hasDataCache || hasAppShellCache).toBe(true);
    });
  });

  describe('Install Event - Error Handling', () => {
    test('should handle cache.addAll failure gracefully', async () => {
      mockCache.addAll.mockRejectedValueOnce(new Error('Network error'));
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await expect(handleInstall(event)).resolves.not.toThrow();
    });

    test('should skip caching if a resource fails but continue with others', async () => {
      mockCache.addAll.mockRejectedValueOnce(new Error('Failed'));
      const { handleInstall } = require('../src/sw/sw-handler');
      const event = { waitUntil: jest.fn((p) => p) };

      await handleInstall(event);

      // Should still attempt to open caches
      expect(mockCaches.open).toHaveBeenCalled();
    });
  });
});
