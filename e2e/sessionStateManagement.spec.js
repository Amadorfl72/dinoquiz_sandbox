describe('TRIOFSND-11: Session State Management', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should discard progress and show start screen after closing mid-game', async () => {
    // Start a new game
    await element(by.id('start-game-button')).tap();
    await expect(element(by.id('game-screen'))).toBeVisible();

    // Make some progress in the game
    await element(by.id('game-tile-0-0')).tap();
    await expect(element(by.id('game-tile-0-0'))).toHaveText('X');

    // Close the app completely
    await device.terminateApp();

    // Reopen the app
    await device.launchApp({ newInstance: true });

    // Verify the start screen is shown and progress is discarded
    await expect(element(by.id('start-screen'))).toBeVisible();
    await expect(element(by.id('game-screen'))).not.toBeVisible();
  });

  it('should start a fresh game after reopening', async () => {
    // Reopen the app and start a new game
    await element(by.id('start-game-button')).tap();
    await expect(element(by.id('game-screen'))).toBeVisible();

    // Verify the game board is fresh and previous progress is lost
    await expect(element(by.id('game-tile-0-0'))).toHaveText('');
    await expect(element(by.id('game-tile-1-1'))).toHaveText('');
  });
});