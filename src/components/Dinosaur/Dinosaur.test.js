import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Dinosaur } from './Dinosaur';

describe('TRIOFSND-27: Implement image fallback placeholder', () => {
  const defaultProps = {
    source: { uri: 'https://example.com/dino.png' },
    label: 'T-Rex',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dinosaur image by default', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual(defaultProps.source);

    // Placeholder should not be visible initially
    expect(queryByTestId('dinosaur-placeholder')).toBeNull();
  });

  it('displays a placeholder when the image fails to load', () => {
    const { getByTestId, queryByTestId } = render(<Dinosaur {...defaultProps} />);

    // Initially the image is shown
    expect(getByTestId('dinosaur-image')).toBeTruthy();
    expect(queryByTestId('dinosaur-placeholder')).toBeNull();

    // Simulate image load error
    fireEvent(getByTestId('dinosaur-image'), 'error');

    // Placeholder should now be visible
    const placeholder = getByTestId('dinosaur-placeholder');
    expect(placeholder).toBeTruthy();
  });

  it('ensures text remains legible when the placeholder is displayed', () => {
    const { getByTestId, getByText } = render(<Dinosaur {...defaultProps} />);

    // Trigger image error to show placeholder
    fireEvent(getByTestId('dinosaur-image'), 'error');

    // The label text should still be rendered and visible
    const labelText = getByText(defaultProps.label);
    expect(labelText).toBeTruthy();

    // Verify the text has a color that is not transparent
    const style = Array.isArray(labelText.props.style)
      ? Object.assign({}, ...labelText.props.style)
      : labelText.props.style || {};
    expect(style.color).toBeDefined();
    expect(style.color).not.toBe('transparent');

    // Verify the placeholder has a background color that contrasts with text
    const placeholder = getByTestId('dinosaur-placeholder');
    const placeholderStyle = Array.isArray(placeholder.props.style)
      ? Object.assign({}, ...placeholder.props.style)
      : placeholder.props.style || {};
    expect(placeholderStyle.backgroundColor).toBeDefined();
    expect(placeholderStyle.backgroundColor).not.toBe('transparent');
  });
});
