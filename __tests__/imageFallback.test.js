const {
  handleImageError,
  handleImageLoad,
  createPlaceholder,
  isPlaceholderActive,
  resetImageState,
} = require('../src/imageFallback');

describe('TRIOFSND-21: Image Fallback', () => {
  beforeEach(() => {
    resetImageState();
  });

  describe('handleImageError', () => {
    it('should set a flag indicating the image failed to load', () => {
      handleImageError();
      expect(isPlaceholderActive()).toBe(true);
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        handleImageError();
        handleImageError();
        handleImageError();
      }).not.toThrow();
    });

    it('should invoke the onPlaceholderShown callback if provided', () => {
      const callback = jest.fn();
      handleImageError(callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleImageLoad', () => {
    it('should clear the placeholder flag when image loads successfully', () => {
      handleImageError();
      expect(isPlaceholderActive()).toBe(true);

      handleImageLoad();
      expect(isPlaceholderActive()).toBe(false);
    });

    it('should not throw when called without a prior error', () => {
      expect(() => handleImageLoad()).not.toThrow();
      expect(isPlaceholderActive()).toBe(false);
    });
  });

  describe('createPlaceholder', () => {
    it('should return a placeholder element with a data attribute identifying it as a placeholder', () => {
      const placeholder = createPlaceholder();
      expect(placeholder).not.toBeNull();
      expect(placeholder.getAttribute('data-placeholder')).toBe('true');
    });

    it('should apply default dimensions matching the expected dinosaur sprite size', () => {
      const placeholder = createPlaceholder();
      expect(placeholder.style.width).not.toBe('');
      expect(placeholder.style.height).not.toBe('');
    });

    it('should accept custom width and height options', () => {
      const placeholder = createPlaceholder({ width: 100, height: 50 });
      expect(placeholder.style.width).toBe('100px');
      expect(placeholder.style.height).toBe('50px');
    });

    it('should have a visible background or border so the user can see it', () => {
      const placeholder = createPlaceholder();
      const hasBackground = placeholder.style.backgroundColor && placeholder.style.backgroundColor !== '';
      const hasBorder = placeholder.style.border && placeholder.style.border !== '';
      expect(hasBackground || hasBorder).toBe(true);
    });

    it('should include an accessible label or aria attribute', () => {
      const placeholder = createPlaceholder();
      const hasAriaLabel = placeholder.getAttribute('aria-label') || placeholder.getAttribute('role');
      expect(hasAriaLabel).toBeTruthy();
    });
  });

  describe('isPlaceholderActive', () => {
    it('should return false initially', () => {
      expect(isPlaceholderActive()).toBe(false);
    });

    it('should return true after handleImageError is called', () => {
      handleImageError();
      expect(isPlaceholderActive()).toBe(true);
    });

    it('should return false after resetImageState is called', () => {
      handleImageError();
      resetImageState();
      expect(isPlaceholderActive()).toBe(false);
    });
  });

  describe('resetImageState', () => {
    it('should clear all fallback state', () => {
      handleImageError();
      resetImageState();
      expect(isPlaceholderActive()).toBe(false);
    });
  });
});
