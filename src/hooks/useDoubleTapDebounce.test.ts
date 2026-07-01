import { renderHook, act } from '@testing-library/react-hooks';
import { useDoubleTapDebounce } from '../useDoubleTapDebounce';

describe('useDoubleTapDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should only register the first response when the same option is tapped twice quickly', () => {
    const onAnswer = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(onAnswer, 500));

    act(() => {
      result.current('option_1');
    });

    act(() => {
      result.current('option_1');
    });

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith('option_1');
  });

  it('should allow registering the same option again after the debounce period', () => {
    const onAnswer = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(onAnswer, 500));

    act(() => {
      result.current('option_1');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      result.current('option_1');
    });

    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it('should allow registering different options quickly', () => {
    const onAnswer = jest.fn();
    const { result } = renderHook(() => useDoubleTapDebounce(onAnswer, 500));

    act(() => {
      result.current('option_1');
    });

    act(() => {
      result.current('option_2');
    });

    expect(onAnswer).toHaveBeenCalledTimes(2);
    expect(onAnswer).toHaveBeenNthCalledWith(1, 'option_1');
    expect(onAnswer).toHaveBeenNthCalledWith(2, 'option_2');
  });
});