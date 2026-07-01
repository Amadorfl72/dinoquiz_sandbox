describe('TRIOFSND-28: Integrate Fun Fact screen into game flow', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/questions', { fixture: 'questions.json' }).as('getQuestions');
    cy.visit('/game');
    cy.wait('@getQuestions');
  });

  it('transitions to Fun Fact screen after a correct answer and routes to the next question', () => {
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of France?');
    cy.get('[data-testid="answer-option-Paris"]').click();
    
    cy.get('[data-testid="fun-fact-screen"]').should('be.visible');
    cy.get('[data-testid="fun-fact-text"]').should('not.be.empty');
    
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of Japan?');
    cy.get('[data-testid="fun-fact-screen"]').should('not.exist');
  });

  it('transitions to Fun Fact screen after an incorrect answer and routes to the next question', () => {
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of France?');
    cy.get('[data-testid="answer-option-London"]').click();
    
    cy.get('[data-testid="fun-fact-screen"]').should('be.visible');
    cy.get('[data-testid="fun-fact-text"]').should('not.be.empty');
    
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of Japan?');
    cy.get('[data-testid="fun-fact-screen"]').should('not.exist');
  });

  it('routes to the Results screen after the last question (correct answer)', () => {
    cy.get('[data-testid="answer-option-Paris"]').click();
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of Japan?');
    cy.get('[data-testid="answer-option-Tokyo"]').click();
    
    cy.get('[data-testid="fun-fact-screen"]').should('be.visible');
    cy.get('[data-testid="next-button"]').click();
    
    cy.url().should('include', '/results');
    cy.get('[data-testid="results-screen"]').should('be.visible');
    cy.get('[data-testid="fun-fact-screen"]').should('not.exist');
  });

  it('routes to the Results screen after the last question (incorrect answer)', () => {
    cy.get('[data-testid="answer-option-London"]').click();
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="question-text"]').should('contain', 'What is the capital of Japan?');
    cy.get('[data-testid="answer-option-Paris"]').click();
    
    cy.get('[data-testid="fun-fact-screen"]').should('be.visible');
    cy.get('[data-testid="next-button"]').click();
    
    cy.url().should('include', '/results');
    cy.get('[data-testid="results-screen"]').should('be.visible');
    cy.get('[data-testid="fun-fact-screen"]').should('not.exist');
  });
});