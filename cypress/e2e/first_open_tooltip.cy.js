describe('TRIOFSND-51: First-Open Tooltip Logic', () => {
  const PLAY_BUTTON_SELECTOR = 'button:contains("¡Jugar!")';
  const TOOLTIP_SELECTOR = '[data-testid="first-open-tooltip"]';
  const STORAGE_KEY = 'hasOpenedApp';

  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the animated tooltip on first open', () => {
    cy.clearLocalStorage();
    cy.reload();
    
    cy.get(TOOLTIP_SELECTOR).should('be.visible');
    cy.get(TOOLTIP_SELECTOR).should('have.class', 'animated');
    cy.get(TOOLTIP_SELECTOR).should('be.aimedAt', PLAY_BUTTON_SELECTOR); // Assuming custom command or just visual check
  });

  it('should not display the tooltip on subsequent opens', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, 'true');
    });
    cy.reload();
    
    cy.get(TOOLTIP_SELECTOR).should('not.exist');
  });

  it('should dismiss the tooltip and set local storage when tapping the screen', () => {
    cy.clearLocalStorage();
    cy.reload();
    cy.get(TOOLTIP_SELECTOR).should('be.visible');
    
    // Tap on an empty area of the screen
    cy.get('body').click(10, 10);
    
    cy.get(TOOLTIP_SELECTOR).should('not.be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem(STORAGE_KEY)).to.eq('true');
    });
  });

  it('should dismiss the tooltip and set local storage when tapping the ¡Jugar! button', () => {
    cy.clearLocalStorage();
    cy.reload();
    cy.get(TOOLTIP_SELECTOR).should('be.visible');
    
    cy.get(PLAY_BUTTON_SELECTOR).click();
    
    cy.get(TOOLTIP_SELECTOR).should('not.be.visible');
    cy.window().then((win) => {
      expect(win.localStorage.getItem(STORAGE_KEY)).to.eq('true');
    });
  });
});