import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DinosaurImage from './DinosaurImage/DinosaurImage';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  const defaultProps = {
    src: '/images/dinosaur.png',
    alt: 'Dinosaur illustration',
    caption: 'Welcome to the prehistoric era',
  };

  it('renders the image under normal conditions', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', defaultProps.src);
  });

  it('displays a placeholder when the image fails to load', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);

    // Simulate image load error
    fireEvent.error(image);

    // Image should be replaced by placeholder
    const placeholder = screen.getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeInTheDocument();
  });

  it('ensures text remains legible when placeholder is displayed', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);
    fireEvent.error(image);

    const caption = screen.getByText(defaultProps.caption);
    expect(caption).toBeVisible();

    // Caption overlay should have the caption-overlay class for legible background
    const captionOverlay = screen.getByTestId('caption-overlay');
    expect(captionOverlay).toHaveClass('caption-overlay');
  });

  it('does not show placeholder if image loads successfully', () => {
    render(<DinosaurImage {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);
    fireEvent.load(image);

    expect(screen.queryByTestId('dinosaur-placeholder')).not.toBeInTheDocument();
    expect(image).toBeInTheDocument();
  });
});
