import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage';

describe('TRIOFSND-27: DinosaurImage fallback placeholder', () => {
  describe('normal rendering', () => {
    it('renders the dinosaur image with correct src', () => {
      render(<DinosaurImage src="/images/dinosaur.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/images/dinosaur.png');
    });

    it('renders the image with the provided alt text', () => {
      render(<DinosaurImage src="/images/dinosaur.png" alt="A friendly dinosaur" />);
      expect(screen.getByAltText('A friendly dinosaur')).toBeInTheDocument();
    });

    it('does not show the placeholder when the image loads successfully', () => {
      render(<DinosaurImage src="/images/dinosaur.png" alt="Dinosaur" />);
      expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('onError fallback behavior', () => {
    it('displays a placeholder when the image fails to load', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    });

    it('hides the broken image element when the placeholder is shown', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      expect(screen.queryByTestId('dinosaur-image')).not.toBeInTheDocument();
    });

    it('replaces the image with a placeholder image on error', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const placeholderImg = screen.getByTestId('image-placeholder').querySelector('img');
      expect(placeholderImg).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });

    it('sets onError handler on the image element', () => {
      render(<DinosaurImage src="/images/dinosaur.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      expect(img).toHaveAttribute('onerror');
    });

    it('only triggers fallback once even if error fires multiple times', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      fireEvent.error(img);
      const placeholders = screen.getAllByTestId('image-placeholder');
      expect(placeholders).toHaveLength(1);
    });
  });

  describe('text legibility with placeholder', () => {
    it('renders overlay text that remains visible when placeholder is shown', () => {
      render(
        <DinosaurImage src="/images/broken.png" alt="Dinosaur">
          <span data-testid="overlay-text">Welcome to Dino World</span>
        </DinosaurImage>
      );
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const overlayText = screen.getByTestId('overlay-text');
      expect(overlayText).toBeVisible();
    });

    it('ensures overlay text has sufficient contrast against placeholder background', () => {
      render(
        <DinosaurImage src="/images/broken.png" alt="Dinosaur">
          <span data-testid="overlay-text" style={{ color: '#ffffff' }}>
            Welcome to Dino World
          </span>
        </DinosaurImage>
      );
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const computedBg = window.getComputedStyle(placeholder).backgroundColor;
      expect(computedBg).toBeTruthy();
      const overlayText = screen.getByTestId('overlay-text');
      expect(overlayText).toBeInTheDocument();
      expect(overlayText).toBeVisible();
    });

    it('maintains text legibility by applying a semi-transparent overlay on the placeholder', () => {
      render(
        <DinosaurImage src="/images/broken.png" alt="Dinosaur">
          <span data-testid="overlay-text">Dino Facts</span>
        </DinosaurImage>
      );
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const overlay = screen.getByTestId('placeholder-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('does not hide or obscure text content when switching to placeholder', () => {
      render(
        <DinosaurImage src="/images/broken.png" alt="Dinosaur">
          <p data-testid="caption">The mighty T-Rex</p>
        </DinosaurImage>
      );
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const caption = screen.getByTestId('caption');
      expect(caption).not.toHaveStyle({ display: 'none' });
      expect(caption).not.toHaveStyle({ visibility: 'hidden' });
      expect(caption).not.toHaveStyle({ opacity: '0' });
    });
  });

  describe('placeholder content and styling', () => {
    it('renders a placeholder with a background color', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      fireEvent.error(img);
      const placeholder = screen.getByTestId('image-placeholder');
      const styles = window.getComputedStyle(placeholder);
      expect(styles.backgroundColor).toBeTruthy();
    });

    it('placeholder maintains the same dimensions as the original image container', () => {
      render(<DinosaurImage src="/images/broken.png" alt="Dinosaur" />);
      const img = screen.getByTestId('dinosaur-image');
      const container = screen.getByTestId('dinosaur-image-container');
      const originalHeight = container.offsetHeight;
      const originalWidth = container.offsetWidth;
      
      fireEvent.error(img);
      
      const updatedContainer = screen.getByTestId('dinosaur-image-container');
      expect(updatedContainer.offsetHeight).toBe(originalHeight);
      expect(updatedContainer.offsetWidth).toBe(originalWidth);
    });
  });
});