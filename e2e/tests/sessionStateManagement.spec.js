describe('TRIOFSND-11: Session State Management', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should discard progress and show start screen after reopening mid-game', async () => {
    // 1. Start a new game from the start screen
    await expect(element(by.id('start-screen'))).toBeVisible();
    await element(by.id('start-game-button')).tap();
    await expect(element(by.id('game-screen'))).toBeVisible();

    // 2. Make some progress in the game
    await element(by.id('game-tile-1')).tap();
    await element(by.id('game-tile-2')).tap();
    await expect(element(by.id('score-label'))).toHaveText('2');

    // 3. Close the app mid-game
    await device.sendToHome();
    await device.terminateApp();

    // 4. Reopen the app
    await device.launchApp({ newInstance: false });

    // 5. Verify the start screen is shown and game progress is discarded
    await expect(element(by.id('start-screen'))).toBeVisible();
    await expect(element(by.id('game-screen'))).not.toBeVisible();
    await expect(element(by.id('score-label'))).not.toBeVisible();
  });
});
