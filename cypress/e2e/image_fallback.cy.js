describe('TRIOFSND-21: Implement Image Fallback', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('shows the dinosaur image and hides placeholder on successful load', () => {
    cy.get('[data-testid="dino-image"]').should('be.visible');
    cy.get('[data-testid="dino-placeholder"]').should('not.be.visible');
  });

  it('shows placeholder and hides dinosaur image on failed load', () => {
    cy.intercept('GET', '**/assets/dino.png', { forceNetworkError: true });
    cy.visit('/');
    
    cy.get('[data-testid="dino-image"]').should('not.be.visible');
    cy.get('[data-testid="dino-placeholder"]').should('be.visible');
  });

  it('does not block the game loop when image fails to load', () => {
    cy.intercept('GET', '**/assets/dino.png', { forceNetworkError: true });
    cy.visit('/');
    
    cy.get('[data-testid="dino-placeholder"]').should('be.visible');
    
    // Trigger game start or jump
    cy.get('body').type(' ');
    
    // Verify game is running by checking score or game state
    cy.get('[data-testid="game-score"]').should(($el) => {
      const score = parseInt($el.text(), 10);
      expect(score).to.be.greaterThan(0);
    });
  });
});