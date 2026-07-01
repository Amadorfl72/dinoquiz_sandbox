import { renderHook, act } from '@testing-library/react-hooks';
import { useDoubleTapDebounce } from './useDoubleTapDebounce';

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register only the first response when the same option is tapped twice quickly', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_A');
      result.current('option_A');
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('option_A');
  });

  it('should register both responses if different options are tapped quickly', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_A');
      result.current('option_B');
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, 'option_A');
    expect(mockCallback).toHaveBeenNthCalledWith(2, 'option_B');
  });

  it('should register both responses if the same option is tapped after the debounce time', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_A');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current('option_A');
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should not register a second response if tapped multiple times within the debounce window', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_A');
      result.current('option_A');
      result.current('option_A');
      result.current('option_A');
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
