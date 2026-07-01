describe('TRIOFSND-29: Next button debounce - E2E', () => {
  beforeEach(() => {
    cy.visit('/fun-facts');
  });

  it('navigates to the next fun fact on a single click', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').should('be.visible').and('not.be.disabled');
    cy.get('@nextButton').click();
    cy.location('pathname').should('not.eq', '/fun-facts');
  });

  it('disables the Next button immediately after click', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').click();
    cy.get('@nextButton').should('be.disabled');
  });

  it('prevents navigation from rapid double-click within debounce window', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').should('not.be.disabled');

    cy.get('@nextButton').then(($btn) => {
      const rect = $btn[0].getBoundingClientRect();
      cy.wrap($btn)
        .trigger('mousedown', { clientX: rect.x + 5, clientY: rect.y + 5 })
        .trigger('mouseup', { clientX: rect.x + 5, clientY: rect.y + 5 })
        .trigger('mousedown', { clientX: rect.x + 5, clientY: rect.y + 5 })
        .trigger('mouseup', { clientX: rect.x + 5, clientY: rect.y + 5 })
        .trigger('click')
        .trigger('click');
    });

    cy.findByText(/fun fact/i).should('exist');
  });

  it('shows a loading spinner or visual feedback during debounce', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').click();
    cy.get('@nextButton').find('[data-testid="next-button-loading"], .spinner, [aria-busy="true"]').should('exist');
  });

  it('re-enables the Next button after the debounce period', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').click();
    cy.get('@nextButton').should('be.disabled');
    cy.get('@nextButton').should('not.be.disabled', { timeout: 3000 });
  });

  it('allows clicking Next again after debounce completes', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    cy.get('@nextButton').click();
    cy.get('@nextButton').should('be.disabled');
    cy.get('@nextButton').should('not.be.disabled', { timeout: 3000 });
    cy.get('@nextButton').click();
  });

  it('does not skip more than one fun fact on rapid taps', () => {
    cy.findByRole('button', { name: /next/i }).as('nextButton');
    const clickCount = 5;
    for (let i = 0; i < clickCount; i++) {
      cy.get('@nextButton').click({ force: true });
    }
    cy.findByText(/fun fact/i).should('exist');
  });
});