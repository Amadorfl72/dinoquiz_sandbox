import { renderHook, act } from '@testing-library/react';
import { useImageFallback } from '../useImageFallback';

describe('useImageFallback', () => {
  it('initializes with hasError as false', () => {
      const { result } = renderHook(() => useImageFallback());
      expect(result.current.hasError).toBe(false);
    });

  it('sets hasError to true when handleError is called', () => {
      const { result } = renderHook(() => useImageFallback());
      act(() => {
        result.current.handleError();
      });
      expect(result.current.hasError).toBe(true);
    });

  it('resets hasError to false when reset is called', () => {
      const { result } = renderHook(() => useImageFallback());
      act(() => {
        result.current.handleError();
      });
      expect(result.current.hasError).toBe(true);
      act(() => {
        result.current.reset();
      });
      expect(result.current.hasError).toBe(false);
    });

  it('resets hasError when src changes', () => {
      const { result, rerender } = renderHook(({ src }) => useImageFallback(src), {
        initialProps: { src: 'image1.jpg' },
      });
      act(() => {
        result.current.handleError();
      });
      expect(result.current.hasError).toBe(true);
      rerender({ src: 'image2.jpg' });
      expect(result.current.hasError).toBe(false);
    });

  it('does not reset when src stays the same', () => {
      const { result, rerender } = renderHook(({ src }) => useImageFallback(src), {
        initialProps: { src: 'image1.jpg' },
      });
      act(() => {
        result.current.handleError();
      });
      expect(result.current.hasError).toBe(true);
      rerender({ src: 'image1.jpg' });
      expect(result.current.hasError).toBe(true);
    });

  it('calls optional onError callback when handleError is invoked', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useImageFallback(undefined, onError));
      act(() => {
        result.current.handleError();
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });

  it('does not throw when onError callback is not provided', () => {
      const { result } = renderHook(() => useImageFallback());
      expect(() => {
        act(() => {
          result.current.handleError();
        });
      }).not.toThrow();
    });
});
