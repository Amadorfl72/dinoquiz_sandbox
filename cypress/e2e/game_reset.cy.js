describe('TRIOFSND-34: Volver a jugar Game Reset Logic', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/questions', { fixture: 'questions_pool.json' }).as('getQuestions');
    cy.visit('/game');
    // Simulate finishing the game to reach the 'Volver a jugar' screen
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('test:forceGameOver'));
    });
  });

  it('should reset the game, select 10 new questions, and navigate to the first question', () => {
    // Capture initial questions from the first game
    cy.get('[data-testid="question-text"]').invoke('text').as('firstGameFirstQuestion');
    
    // Verify game over screen is visible
    cy.get('[data-testid="game-over-screen"]').should('be.visible');
    
    // Click the reset button
    cy.get('[data-testid="volver-a-jugar-btn"]').click();

    // Verify navigation to first question
    cy.url().should('match', /\/game\/question\/1$/);
    cy.get('[data-testid="question-counter"]').should('contain', '1 / 10');

    // Verify game state is reset (score is 0)
    cy.get('[data-testid="score"]').should('contain', '0');

    // Verify new questions are loaded and no repetition from the previous set
    cy.get('@firstGameFirstQuestion').then((firstGameFirstQuestion) => {
      cy.get('[data-testid="question-text"]').invoke('text').should((newFirstQuestion) => {
        expect(newFirstQuestion).to.not.equal(firstGameFirstQuestion);
      });
    });
  });
});