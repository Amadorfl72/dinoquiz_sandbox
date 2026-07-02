import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Dinosaur } from './Dinosaur';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  const defaultProps = {
    imageSource: { uri: 'https://example.com/dino.png' },
    altText: 'Tyrannosaurus Rex',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dinosaur image by default', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual(defaultProps.imageSource);

    // Placeholder should not be visible while the image is loading/visible
    expect(queryByTestId('dinosaur-placeholder')).toBeNull();
  });

  it('displays a placeholder when the image fails to load', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    // Initially the image is rendered
    expect(getByTestId('dinosaur-image')).toBeTruthy();

    // Simulate an image load error
    fireEvent(getByTestId('dinosaur-image'), 'error');

    // After the error, the placeholder should be displayed
    const placeholder = getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeTruthy();

    // The broken image should no longer be rendered
    expect(queryByTestId('dinosaur-image')).toBeNull();
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    const { getByTestId, getByText } = render(<Dinosaur {...defaultProps} />);

    // Trigger the image error to show the placeholder
    fireEvent(getByTestId('dinosaur-image'), 'error');

    // The placeholder should display the alt text so users know what failed to load
    const placeholderText = getByText(defaultProps.altText);
    expect(placeholderText).toBeTruthy();

    // Verify the placeholder text has a legible color (not transparent)
    const style = Array.isArray(placeholderText.props.style)
      ? Object.assign({}, ...placeholderText.props.style)
      : placeholderText.props.style || {};
    expect(style.color).toBeDefined();
    expect(style.color).not.toBe('transparent');

    // Verify the placeholder text has a font size appropriate for reading (>= 14)
    expect(style.fontSize).toBeGreaterThanOrEqual(14);

    // Verify the placeholder container has a contrasting background
    const placeholder = getByTestId('dinosaur-placeholder');
    const placeholderStyle = Array.isArray(placeholder.props.style)
      ? Object.assign({}, ...placeholder.props.style)
      : placeholder.props.style || {};
    expect(placeholderStyle.backgroundColor).toBeDefined();
    expect(placeholderStyle.backgroundColor).not.toBe('transparent');
  });
});
