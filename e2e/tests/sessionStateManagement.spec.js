describe('Session State Management (TRIOFSND-11)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the start screen after reopening the app when closed mid-game', async () => {
    // Start a new game
    await element(by.id('start-game-button')).tap();
    
    // Make a move to ensure we are mid-game
    await element(by.id('game-tile-0-0')).tap();
    
    // Verify we are in the game
    await expect(element(by.id('game-screen'))).toBeVisible();
    
    // Close the app by sending it to the background
    await device.sendToHome();
    
    // Reopen the app
    await device.launchApp({ newInstance: false });
    
    // Verify the start screen is shown, not the game screen
    await expect(element(by.id('start-screen'))).toBeVisible();
    await expect(element(by.id('game-screen'))).not.toBeVisible();
  });

  it('should discard progress after reopening the app when closed mid-game', async () => {
    // Start a new game
    await element(by.id('start-game-button')).tap();
    
    // Make a couple of moves
    await element(by.id('game-tile-0-0')).tap();
    await element(by.id('game-tile-0-1')).tap();
    
    // Close the app
    await device.sendToHome();
    
    // Reopen the app
    await device.launchApp({ newInstance: false });
    
    // Verify start screen is shown, indicating progress was discarded
    await expect(element(by.id('start-screen'))).toBeVisible();
    
    // Start a new game again
    await element(by.id('start-game-button')).tap();
    
    // Verify the game board is fresh (no moves made)
    await expect(element(by.id('game-tile-0-0'))).toHaveText('');
    await expect(element(by.id('game-tile-0-1'))).toHaveText('');
  });
});