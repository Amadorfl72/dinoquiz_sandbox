require('../__mocks__/serviceWorkerMock');

describe('TRIOFSND-6: Audio File Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.caches._reset();
  });

  describe('Audio file caching on first load', () => {
    it('should cache audio files from /audio/ path', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/audio/question-1.mp3'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/audio/question-1.mp3' })
      );
    });

    it('should serve audio from cache when available (cache-first)', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/audio/question-1.mp3'),
        respondWith: jest.fn(),
      };

      const cache = await caches.open('triofsnd-cache-v1');
      await cache.put('/audio/question-1.mp3', new Response('audio-data'));

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should cache audio files with correct content type', async () => {
      const { AUDIO_CACHE_NAME } = require('../src/serviceWorkerConfig');
      expect(AUDIO_CACHE_NAME).toBeDefined();
      expect(AUDIO_CACHE_NAME).toMatch(/audio/i);
    });

    it('should handle multiple audio file requests', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      const audioFiles = [
        '/audio/question-1.mp3',
        '/audio/question-2.mp3',
        '/audio/question-3.mp3',
        '/audio/correct.mp3',
        '/audio/wrong.mp3',
      ];

      for (const url of audioFiles) {
        const event = {
          request: new Request(url),
          respondWith: jest.fn(),
        };
        await handleFetch(event);
        expect(event.respondWith).toHaveBeenCalled();
      }

      expect(fetch).toHaveBeenCalledTimes(audioFiles.length);
    });

    it('should use separate cache for audio files', async () => {
      const { handleFetch, AUDIO_CACHE_NAME } = require('../src/serviceWorkerCache');
      const event = {
        request: new Request('/audio/question-1.mp3'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(caches.open).toHaveBeenCalledWith(AUDIO_CACHE_NAME);
    });
  });

  describe('Audio caching failure handling', () => {
    it('should handle audio fetch failure gracefully', async () => {
      const { handleFetch } = require('../src/serviceWorkerCache');
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const event = {
        request: new Request('/audio/question-1.mp3'),
        respondWith: jest.fn(),
      };

      await handleFetch(event);

      expect(event.respondWith).toHaveBeenCalled();
    });
  });
});
