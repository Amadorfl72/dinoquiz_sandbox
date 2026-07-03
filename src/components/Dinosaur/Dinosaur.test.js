import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Dinosaur from './Dinosaur';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  const defaultProps = {
    imageSource: { uri: 'https://example.com/dino.png' },
    accessibleLabel: 'Dinosaur image',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dinosaur image by default', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual(defaultProps.imageSource);

    // Placeholder should not be visible while the image is loading/displayed
    expect(queryByTestId('dinosaur-placeholder')).toBeNull();
  });

  it('displays a placeholder when the image fails to load', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    // Initially the image is rendered
    expect(getByTestId('dinosaur-image')).toBeTruthy();

    // Simulate an image load error
    fireEvent(getByTestId('dinosaur-image'), 'error');

    // The placeholder should now be displayed
    const placeholder = getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeTruthy();

    // The broken image should no longer be rendered
    expect(queryByTestId('dinosaur-image')).toBeNull();
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    const { getByTestId, getByText } = render(<Dinosaur {...defaultProps} />);

    // Trigger the image error to show the placeholder
    fireEvent(getByTestId('dinosaur-image'), 'error');

    const placeholder = getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeTruthy();

    // The placeholder should contain descriptive text
    const placeholderText = getByText(/dinosaur/i);
    expect(placeholderText).toBeTruthy();

    // Verify the placeholder has a background color that provides contrast
    const placeholderStyle = Array.isArray(placeholder.props.style)
      ? Object.assign({}, ...placeholder.props.style)
      : placeholder.props.style || {};
    expect(placeholderStyle.backgroundColor).toBeDefined();
    expect(placeholderStyle.backgroundColor).not.toBe('transparent');

    // Verify the text color is defined and contrasts with the background
    const textStyle = Array.isArray(placeholderText.props.style)
      ? Object.assign({}, ...placeholderText.props.style)
      : placeholderText.props.style || {};
    expect(textStyle.color).toBeDefined();
    expect(textStyle.color).not.toBe('transparent');
    expect(textStyle.color).not.toBe(placeholderStyle.backgroundColor);

    // Verify the text has a readable font size (>= 14)
    expect(textStyle.fontSize).toBeGreaterThanOrEqual(14);
  });
});
