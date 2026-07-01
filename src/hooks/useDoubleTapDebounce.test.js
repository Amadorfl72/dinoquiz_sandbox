import { renderHook, act } from '@testing-library/react-hooks';
import { useDoubleTapDebounce } from '../hooks/useDoubleTapDebounce';

describe('TRIOFSND-20: Implement Double Tap Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should register the first response and ignore subsequent quick taps on the same option', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_1');
    });
    
    act(() => {
      result.current('option_1');
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('option_1');
  });

  it('should register responses for different options even if tapped quickly', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_1');
    });
    
    act(() => {
      result.current('option_2');
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, 'option_1');
    expect(mockCallback).toHaveBeenNthCalledWith(2, 'option_2');
  });

  it('should register a response for the same option after the debounce time has passed', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(mockCallback, 300));

    act(() => {
      result.current('option_1');
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current('option_1');
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});