'use strict';

const { SCREENS, getCurrentScreen, navigateTo, onNavigate } = require('./navigator');

describe('navigator', () => {
  test('navigateTo updates the current screen and returns it', () => {
    expect(navigateTo(SCREENS.QUESTION)).toBe(SCREENS.QUESTION);
    expect(getCurrentScreen()).toBe(SCREENS.QUESTION);
  });

  test('navigateTo notifies subscribed listeners with the new screen', () => {
    const listener = jest.fn();
    const unsubscribe = onNavigate(listener);

    navigateTo(SCREENS.RESULTS);

    expect(listener).toHaveBeenCalledWith(SCREENS.RESULTS);

    unsubscribe();
    navigateTo(SCREENS.HOME);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
