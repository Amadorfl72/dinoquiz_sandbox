describe('TRIOFSND-21: Implement Image Fallback', () => {
  beforeEach(() => {
    cy.intercept('GET', '/dino.png', { statusCode: 404, body: '' });
    cy.visit('/');
  });

  it('displays a placeholder when the dinosaur image fails to load', () => {
    cy.get('[data-testid="dino-image"]').should('exist');
    cy.get('[data-testid="dino-placeholder"]')
      .should('be.visible')
      .and('contain', 'Dinosaur image unavailable');
  });

  it('allows the game to continue after the placeholder appears', () => {
    cy.get('[data-testid="dino-placeholder"]').should('be.visible');
    cy.get('[data-testid="start-button"]').click();
    cy.get('[data-testid="game-board"]').should('exist');
  });

  it('does not show a blocking overlay while the placeholder is visible', () => {
    cy.get('[data-testid="dino-placeholder"]').should('be.visible');
    cy.get('[data-testid="blocking-overlay"]').should('not.exist');
  });
});
