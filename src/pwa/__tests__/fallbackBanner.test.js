import { shouldShowFallbackBanner, renderFallbackBanner, removeFallbackBanner } from '../fallbackBanner.js';
import * as browserSupport from '../browserSupport.js';

describe('fallback banner', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('shouldShowFallbackBanner is true when neither standalone nor install-capable', () => {
    jest.spyOn(browserSupport, 'isStandaloneDisplayMode').mockReturnValue(false);
    jest.spyOn(browserSupport, 'supportsInstallFlow').mockReturnValue(false);

    expect(shouldShowFallbackBanner()).toBe(true);
  });

  test('shouldShowFallbackBanner is false once already running standalone', () => {
    jest.spyOn(browserSupport, 'isStandaloneDisplayMode').mockReturnValue(true);
    jest.spyOn(browserSupport, 'supportsInstallFlow').mockReturnValue(false);

    expect(shouldShowFallbackBanner()).toBe(false);
  });

  test('renderFallbackBanner appends a single banner node with a dismiss control', () => {
    jest.spyOn(browserSupport, 'isStandaloneDisplayMode').mockReturnValue(false);
    jest.spyOn(browserSupport, 'supportsInstallFlow').mockReturnValue(false);

    const first = renderFallbackBanner(document);
    const second = renderFallbackBanner(document);

    expect(first).not.toBeNull();
    expect(first).toBe(second);
    expect(document.querySelectorAll('.dq-fallback-banner')).toHaveLength(1);
    expect(document.querySelector('.dq-fallback-banner__dismiss')).not.toBeNull();
  });

  test('renderFallbackBanner does nothing when the flow is supported', () => {
    jest.spyOn(browserSupport, 'isStandaloneDisplayMode').mockReturnValue(false);
    jest.spyOn(browserSupport, 'supportsInstallFlow').mockReturnValue(true);

    expect(renderFallbackBanner(document)).toBeNull();
    expect(document.getElementById('dq-fallback-banner')).toBeNull();
  });

  test('removeFallbackBanner clears an existing banner', () => {
    jest.spyOn(browserSupport, 'isStandaloneDisplayMode').mockReturnValue(false);
    jest.spyOn(browserSupport, 'supportsInstallFlow').mockReturnValue(false);

    renderFallbackBanner(document);
    expect(document.getElementById('dq-fallback-banner')).not.toBeNull();

    removeFallbackBanner(document);
    expect(document.getElementById('dq-fallback-banner')).toBeNull();
  });
});
