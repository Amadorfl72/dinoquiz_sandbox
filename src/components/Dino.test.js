import { setupImageFallback } from './Dino';

describe('TRIOFSND-21: Implement Image Fallback', () => {
  let img, placeholder;

  beforeEach(() => {
    document.body.innerHTML = `
      <img data-testid="dino-image" id="dino-img" src="dino.png" />
      <div data-testid="dino-placeholder" id="dino-placeholder" style="display: none;">Placeholder</div>
    `;
    img = document.getElementById('dino-img');
    placeholder = document.getElementById('dino-placeholder');
  });

  it('shows placeholder and hides image on error', () => {
    setupImageFallback(img, placeholder);
    img.onerror(new Event('error'));
    
    expect(placeholder.style.display).not.toBe('none');
    expect(img.style.display).toBe('none');
  });

  it('hides placeholder and shows image on successful load', () => {
    setupImageFallback(img, placeholder);
    img.onload(new Event('load'));
    
    expect(placeholder.style.display).toBe('none');
    expect(img.style.display).not.toBe('none');
  });

  it('does not throw errors that block the game loop on image error', () => {
    setupImageFallback(img, placeholder);
    expect(() => img.onerror(new Event('error'))).not.toThrow();
  });
});