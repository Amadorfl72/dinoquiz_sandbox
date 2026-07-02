import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FunFact } from '../src/components/FunFact';

describe('FunFact Component', () => {
  const defaultProps = {
    fact: 'The T-Rex lived during the late Cretaceous period!',
    imageSource: { uri: 'https://example.com/dino.png' },
    onNext: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<FunFact {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the fun fact text', () => {
    const { getByText } = render(<FunFact {...defaultProps} />);
    expect(getByText(defaultProps.fact)).toBeTruthy();
  });

  it('displays the dinosaur image', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const image = getByTestId('fun-fact-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual(defaultProps.imageSource);
  });

  it('renders a Next button with accessible label', () => {
    const { getByText } = render(<FunFact {...defaultProps} />);
    expect(getByText('Next')).toBeTruthy();
  });

  it('calls onNext when the Next button is pressed', () => {
    const { getByText } = render(<FunFact {...defaultProps} />);
    fireEvent.press(getByText('Next'));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('Next button has a minimum height of at least 48dp', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const button = getByTestId('fun-fact-next-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('Next button has a minimum width of at least 48dp', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const button = getByTestId('fun-fact-next-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    const effectiveWidth = style.minWidth ?? style.width;
    expect(effectiveWidth).toBeGreaterThanOrEqual(48);
  });

  it('Next button has a colorful (non-default) background color', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const button = getByTestId('fun-fact-next-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    expect(style.backgroundColor).toBeDefined();
    expect(style.backgroundColor).not.toBe('transparent');
    expect(style.backgroundColor).not.toBe('#000000');
  });

  it('Next button has rounded corners for kid-friendly styling', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const button = getByTestId('fun-fact-next-button');
    const style = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style || {};
    expect(style.borderRadius).toBeDefined();
    expect(style.borderRadius).toBeGreaterThan(0);
  });

  it('Next button text is legible with a contrasting color', () => {
    const { getByText } = render(<FunFact {...defaultProps} />);
    const buttonText = getByText('Next');
    const style = Array.isArray(buttonText.props.style)
      ? Object.assign({}, ...buttonText.props.style)
      : buttonText.props.style || {};
    expect(style.color).toBeDefined();
    expect(style.color).not.toBe('transparent');
  });

  it('Next button text has a font size appropriate for kids (>= 16)', () => {
    const { getByText } = render(<FunFact {...defaultProps} />);
    const buttonText = getByText('Next');
    const style = Array.isArray(buttonText.props.style)
      ? Object.assign({}, ...buttonText.props.style)
      : buttonText.props.style || {};
    expect(style.fontSize).toBeGreaterThanOrEqual(16);
  });

  it('updates displayed fact when prop changes', () => {
    const { getByText, rerender } = render(<FunFact {...defaultProps} />);
    expect(getByText(defaultProps.fact)).toBeTruthy();

    const newFact = 'A Brachiosaurus could be as tall as a 4-story building!';
    rerender(<FunFact {...defaultProps} fact={newFact} />);
    expect(getByText(newFact)).toBeTruthy();
  });

  it('renders an accessible container for the fun fact', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} />);
    const container = getByTestId('fun-fact-container');
    expect(container).toBeTruthy();
  });

  it('Next button is disabled when loading prop is true', () => {
    const { getByTestId } = render(<FunFact {...defaultProps} loading={true} />);
    const button = getByTestId('fun-fact-next-button');
    expect(button.props.disabled).toBe(true);
  });

  it('does not call onNext when Next button is pressed while loading', () => {
    const { getByText } = render(<FunFact {...defaultProps} loading={true} />);
    fireEvent.press(getByText('Next'));
    expect(defaultProps.onNext).not.toHaveBeenCalled();
  });
});
