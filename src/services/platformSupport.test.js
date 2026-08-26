'use strict';

const { isServiceWorkerSupported, isManifestSupported, detectPwaSupport } = require('./platformSupport');

describe('TRIOFSND-113: isServiceWorkerSupported', () => {
  test('true when navigator exposes serviceWorker', () => {
    expect(isServiceWorkerSupported({ serviceWorker: {} })).toBe(true);
  });

  test('false when navigator has no serviceWorker (old tablet / embedded browser)', () => {
    expect(isServiceWorkerSupported({})).toBe(false);
  });

  test('false when navigator itself is missing', () => {
    expect(isServiceWorkerSupported(undefined)).toBe(false);
  });
});

describe('TRIOFSND-113: isManifestSupported', () => {
  function docWithRelListSupports(supportsManifest) {
    return {
      createElement: () => ({
        relList: { supports: (rel) => rel === 'manifest' && supportsManifest },
      }),
    };
  }

  test('true when relList.supports reports manifest support', () => {
    expect(isManifestSupported(docWithRelListSupports(true))).toBe(true);
  });

  test('false when relList.supports reports no manifest support', () => {
    expect(isManifestSupported(docWithRelListSupports(false))).toBe(false);
  });

  test('false when the created link has no relList at all (older browser)', () => {
    const doc = { createElement: () => ({}) };
    expect(isManifestSupported(doc)).toBe(false);
  });

  test('false when relList.supports itself is missing', () => {
    const doc = { createElement: () => ({ relList: {} }) };
    expect(isManifestSupported(doc)).toBe(false);
  });

  test('false when document is missing', () => {
    expect(isManifestSupported(undefined)).toBe(false);
  });

  test('false instead of throwing when createElement throws', () => {
    const doc = {
      createElement: () => {
        throw new Error('boom');
      },
    };
    expect(isManifestSupported(doc)).toBe(false);
  });
});

describe('TRIOFSND-113: detectPwaSupport', () => {
  test('isFullySupported is true only when both service worker and manifest are supported', () => {
    const nav = { serviceWorker: {} };
    const doc = { createElement: () => ({ relList: { supports: () => true } }) };

    expect(detectPwaSupport(nav, doc)).toEqual({
      serviceWorker: true,
      manifest: true,
      isFullySupported: true,
    });
  });

  test('isFullySupported is false on a browser missing service worker support (old tablet)', () => {
    const nav = {};
    const doc = { createElement: () => ({ relList: { supports: () => true } }) };

    expect(detectPwaSupport(nav, doc)).toEqual({
      serviceWorker: false,
      manifest: true,
      isFullySupported: false,
    });
  });

  test('isFullySupported is false on a browser missing manifest support (embedded webview)', () => {
    const nav = { serviceWorker: {} };
    const doc = { createElement: () => ({}) };

    expect(detectPwaSupport(nav, doc)).toEqual({
      serviceWorker: true,
      manifest: false,
      isFullySupported: false,
    });
  });

  test('degrades to fully unsupported when neither nav nor doc are provided', () => {
    expect(detectPwaSupport(undefined, undefined)).toEqual({
      serviceWorker: false,
      manifest: false,
      isFullySupported: false,
    });
  });
});
