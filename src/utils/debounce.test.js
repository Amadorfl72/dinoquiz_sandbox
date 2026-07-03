import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the function after the specified delay', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();

    expect(func).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the function', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced('a', 'b', 'c');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(func).toHaveBeenCalledWith('a', 'b', 'c');
  });

  it('cancels previous call when invoked again within the delay window', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();
    debounced();
    debounced();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('does not call the function if never triggered', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(func).not.toHaveBeenCalled();
  });

  it('allows multiple independent debounced calls after each delay window', () => {
    const func = jest.fn();
    const debounced = debounce(func, 300);

    debounced();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(func).toHaveBeenCalledTimes(1);

    debounced();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(func).toHaveBeenCalledTimes(2);
  });
});
