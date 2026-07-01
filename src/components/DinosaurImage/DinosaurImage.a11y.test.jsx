import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import DinosaurImage from './DinosaurImage';

expect.extend(toHaveNoViolations);

describe('TRIOFSND-27: DinosaurImage accessibility', () => {
  it('has no accessibility violations when image loads normally', async () => {
    const { container } = render(
      <DinosaurImage src="/images/dinosaur.png" alt="A dinosaur" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when placeholder is shown', async () => {
    const { container } = render(
      <DinosaurImage src="/images/broken.png" alt="A dinosaur">
        <span data-testid="overlay-text">Dino World</span>
      </DinosaurImage>
    );
    const img = screen.getByRole('img', { name: /dinosaur/i });
    fireEvent.error(img);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('placeholder image has non-empty alt text', () => {
    render(<DinosaurImage src="/images/broken.png" alt="A dinosaur" />);
    const img = screen.getByRole('img', { name: /dinosaur/i });
    fireEvent.error(img);
    const placeholder = screen.getByTestId('image-placeholder');
    const placeholderImg = placeholder.querySelector('img');
    if (placeholderImg) {
      expect(placeholderImg.getAttribute('alt')).not.toBe('');
      expect(placeholderImg.getAttribute('alt')).not.toBeNull();
    }
  });

  it('overlay text has appropriate aria attributes when placeholder is shown', () => {
    render(
      <DinosaurImage src="/images/broken.png" alt="A dinosaur">
        <span data-testid="overlay-text">Dino World</span>
      </DinosaurImage>
    );
    const img = screen.getByRole('img', { name: /dinosaur/i });
    fireEvent.error(img);
    const overlayText = screen.getByTestId('overlay-text');
    // span elements should not have role=text, removing the role attribute is better
    expect(overlayText).not.toHaveAttribute('role', 'text');
  });
});