describe('TRIOFSND-45: New best score feedback on results screen', () => {
  const FEEDBACK_TEXT = '¡Nueva mejor puntuación!';

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });

  it('shows the feedback when a new best score is achieved and auto-dismisses', () => {
    // Seed a previous best score
    cy.window().then((win) => {
      win.localStorage.setItem('bestScore', '1000');
    });

    cy.visit('/');
    cy.startGame();
    cy.finishGameWithScore(1500); // exceeds 1000

    cy.url().should('include', '/results');
    cy.contains(FEEDBACK_TEXT).should('be.visible');

    // It must be non-blocking: primary action is clickable while toast is visible
    cy.contains('button', /jugar de nuevo|play again/i).should('not.be.disabled').click();

    // Navigate back to results to verify auto-dismiss timing
    cy.startGame();
    cy.finishGameWithScore(1600);
    cy.contains(FEEDBACK_TEXT).should('be.visible');

    // Wait for auto-dismiss (a few seconds)
    cy.clock();
    cy.tick(3000);
    cy.contains(FEEDBACK_TEXT).should('not.exist');
  });

  it('does NOT show the feedback when the score does not beat the best', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('bestScore', '2000');
    });

    cy.visit('/');
    cy.startGame();
    cy.finishGameWithScore(1500); // below 2000

    cy.url().should('include', '/results');
    cy.contains(FEEDBACK_TEXT).should('not.exist');
  });

  it('does NOT show the feedback when score equals the best (tie is not a new best)', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('bestScore', '1500');
    });

    cy.visit('/');
    cy.startGame();
    cy.finishGameWithScore(1500);

    cy.url().should('include', '/results');
    cy.contains(FEEDBACK_TEXT).should('not.exist');
  });

  it('shows feedback on first ever game (no previous best stored)', () => {
    cy.window().then((win) => {
      win.localStorage.removeItem('bestScore');
    });

    cy.visit('/');
    cy.startGame();
    cy.finishGameWithScore(300);

    cy.url().should('include', '/results');
    cy.contains(FEEDBACK_TEXT).should('be.visible');
  });

  it('does not block keyboard navigation while visible', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('bestScore', '100');
    });

    cy.visit('/');
    cy.startGame();
    cy.finishGameWithScore(500);

    cy.contains(FEEDBACK_TEXT).should('be.visible');

    // Tab through the results screen — focus should move to actionable elements
    cy.get('body').tab();
    cy.focused().should('match', 'button, a, [tabindex]');
  });
});
