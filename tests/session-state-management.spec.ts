import { test, expect } from '@playwright/test';

test.describe('TRIOFSND-11: Session State Management', () => {
  test('should show start screen on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="start-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="game-board"]')).not.toBeVisible();
  });

  test('should discard progress and show start screen after closing mid-game', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    
    // Start a new game
    await page.click('[data-testid="start-game-button"]');
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    
    // Make some progress
    await page.click('[data-testid="game-tile-1"]');
    await expect(page.locator('[data-testid="score-display"]')).toContainText('1');
    
    // Close the app
    await context.close();
    
    // Reopen the app
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto('/');
    
    // Verify start screen is shown and progress is discarded
    await expect(newPage.locator('[data-testid="start-screen"]')).toBeVisible();
    await expect(newPage.locator('[data-testid="game-board"]')).not.toBeVisible();
    
    // Verify score is reset when starting a new game
    await newPage.click('[data-testid="start-game-button"]');
    await expect(newPage.locator('[data-testid="score-display"]')).toContainText('0');
    
    await newContext.close();
  });

  test('should not persist game state in local storage after closing mid-game', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    await page.click('[data-testid="start-game-button"]');
    await page.click('[data-testid="game-tile-1"]');
    
    await context.close();
    
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto('/');
    
    // Verify no game state is persisted in local storage
    const gameState = await newPage.evaluate(() => localStorage.getItem('gameState'));
    expect(gameState).toBeNull();
    
    await newContext.close();
  });
});