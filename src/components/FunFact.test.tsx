import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FunFact } from './FunFact';

describe('FunFact Component', () => {
  const mockFunFact = 'Dinosaurs lived millions of years ago!';
  const mockImageUri = 'https://example.com/dino.png';
  const mockOnNext = jest.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
  });

  it('renders the fun fact text', () => {
    const { getByText } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    expect(getByText(mockFunFact)).toBeTruthy();
  });

  it('renders the dinosaur image', () => {
    const { getByTestId } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    const image = getByTestId('dinosaur-image');
    expect(image.props.source.uri).toBe(mockImageUri);
  });

  it('renders the Next button with text', () => {
    const { getByText } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    expect(getByText('Next')).toBeTruthy();
  });

  it('calls onNext when the Next button is pressed', () => {
    const { getByText } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    fireEvent.press(getByText('Next'));
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('ensures the Next button has a minimum height of 48dp', () => {
    const { getByTestId } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    const button = getByTestId('next-button');
    const style = Array.isArray(button.props.style) ? button.props.style[0] : button.props.style;
    expect(style.height).toBeGreaterThanOrEqual(48);
  });

  it('ensures the Next button has colorful kid-friendly styling', () => {
    const { getByTestId } = render(
      <FunFact fact={mockFunFact} imageUri={mockImageUri} onNext={mockOnNext} />
    );
    const button = getByTestId('next-button');
    const style = Array.isArray(button.props.style) ? button.props.style[0] : button.props.style;
    expect(style.backgroundColor).toBeDefined();
    expect(style.backgroundColor).not.toBe('transparent');
    expect(style.backgroundColor).not.toBe('#ffffff');
  });
});
