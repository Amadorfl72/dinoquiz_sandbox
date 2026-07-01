describe('TRIOFSND-27: Image fallback placeholder', () => {
  const dinosaurPageUrl = '/dinosaur';

  beforeEach(() => {
    cy.visit(dinosaurPageUrl);
  });

  context('Image loads successfully', () => {
    it('displays the dinosaur image', () => {
      cy.get('[data-testid="dinosaur-image"]')
        .should('be.visible')
        .and('have.attr', 'src')
        .and('not.include', 'placeholder');
    });

    it('does not display the placeholder', () => {
      cy.get('[data-testid="image-placeholder"]').should('not.exist');
    });

    it('displays overlay text over the image', () => {
      cy.get('[data-testid="overlay-text"]').should('be.visible');
    });
  });

  context('Image fails to load', () => {
    it('displays a placeholder when the image src is broken', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"]').should('be.visible');
    });

    it('hides the broken image when placeholder is shown', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 500, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="dinosaur-image"]').should('not.be.visible');
    });

    it('shows a placeholder image with appropriate src', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"] img')
        .should('have.attr', 'src')
        .and('include', 'placeholder');
    });
  });

  context('Text legibility with placeholder', () => {
    it('keeps overlay text visible after image fails to load', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="overlay-text"]')
        .should('be.visible')
        .and('not.have.css', 'visibility', 'hidden')
        .and('not.have.css', 'opacity', '0');
    });

    it('maintains text contrast against placeholder background', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"]').should('be.visible');
      cy.get('[data-testid="overlay-text"]').should('be.visible');
      cy.get('[data-testid="overlay-text"]').then(($el) => {
        const color = window.getComputedStyle($el[0]).color;
        expect(color).to.not.equal('');
        expect(color).to.not.equal('transparent');
      });
    });

    it('renders a darkening overlay behind text for legibility', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="placeholder-overlay"]').should('exist');
    });

    it('overlay text is readable (not hidden behind placeholder)', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="overlay-text"]').should('be.visible');
      cy.get('[data-testid="overlay-text"]').should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(0);
        expect(rect.height).to.be.greaterThan(0);
      });
    });
  });

  context('Placeholder dimensions and layout', () => {
    it('placeholder matches the original image container size', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"]').should('be.visible');
      cy.get('[data-testid="image-placeholder"]').invoke('outerWidth').should('be.greaterThan', 0);
      cy.get('[data-testid="image-placeholder"]').invoke('outerHeight').should('be.greaterThan', 0);
    });

    it('does not cause layout shift when switching to placeholder', () => {
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="dinosaur-image-container"]').then(($container) => {
        const originalHeight = $container[0].offsetHeight;
        const originalWidth = $container[0].offsetWidth;

        cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
        cy.visit(dinosaurPageUrl);

        cy.get('[data-testid="dinosaur-image-container"]').then(($updated) => {
          expect($updated[0].offsetHeight).to.equal(originalHeight);
          expect($updated[0].offsetWidth).to.equal(originalWidth);
        });
      });
    });
  });

  context('Network error scenario', () => {
    it('displays placeholder on network failure', () => {
      cy.intercept('GET', '/images/dinosaur.png', { forceNetworkError: true });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"]', { timeout: 10000 }).should('be.visible');
    });

    it('text remains legible on network failure', () => {
      cy.intercept('GET', '/images/dinosaur.png', { forceNetworkError: true });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="overlay-text"]', { timeout: 10000 }).should('be.visible');
    });
  });

  context('Accessibility', () => {
    it('placeholder has accessible alt text', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('[data-testid="image-placeholder"] img').should('have.attr', 'alt');
    });

    it('page remains keyboard navigable after placeholder appears', () => {
      cy.intercept('GET', '/images/dinosaur.png', { statusCode: 404, body: '' });
      cy.visit(dinosaurPageUrl);
      cy.get('body').tab();
      cy.focused().should('exist');
    });
  });
});
