const { by, device, element, expect, waitFor } = require('detox');

describe('TRIOFSND-18: Correct Answer Feedback', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navigate to the quiz screen
    await element(by.id('start-quiz-button')).tap();
  });

  it('should show a positive animation when the correct option is tapped', async () => {
    await element(by.id('option-button-correct')).tap();
    await expect(element(by.id('positive-animation-overlay'))).toBeVisible();
  });

  it('should transition to the fun fact screen when the correct option is tapped', async () => {
    await element(by.id('option-button-correct')).tap();
    
    // Wait for the animation to finish and transition to occur
    await waitFor(element(by.id('fun-fact-screen'))).toBeVisible().withTimeout(5000);
  });

  it('should trigger the happy sound effect when the correct option is tapped', async () => {
    // Assuming the app exposes a test hook to verify audio playback state
    await element(by.id('option-button-correct')).tap();
    await expect(element(by.id('audio-player-status'))).toHaveLabel('playing-happy-sound');
  });
});
