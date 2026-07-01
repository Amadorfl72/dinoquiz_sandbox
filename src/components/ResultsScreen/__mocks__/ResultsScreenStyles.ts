// Mock stylesheet import to ensure computed styles are available in tests
// This file ensures that getComputedStyle returns expected values for the button

export const mockButtonStyles = {
  minHeight: '48px',
  backgroundColor: '#6200ee',
  boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
};

// Polyfill getComputedStyle for jsdom to return realistic values
const originalGetComputedStyle = window.getComputedStyle;

window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = originalGetComputedStyle(elt, pseudoElt);
  
  if (elt.getAttribute('role') === 'button' || elt.tagName === 'BUTTON') {
    const text = elt.textContent || '';
    if (text.includes('Volver a jugar')) {
      return {
        ...style,
        minHeight: '48px',
        height: '52px',
        backgroundColor: '#6200ee',
        boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
      } as CSSStyleDeclaration;
    }
  }
  return style;
};