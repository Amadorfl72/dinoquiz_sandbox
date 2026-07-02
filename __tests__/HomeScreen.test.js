import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';

describe('TRIOFSND-50: Home Screen UI and Accessibility', () => {
  let getByText, getByTestId;

  beforeEach(() => {
    const renderResult = render(<HomeScreen />);
    getByText = renderResult.getByText;
    getByTestId = renderResult.getByTestId;
  });

  it('renders the DinoQuiz title', () => {
    expect(getByText('DinoQuiz')).toBeTruthy();
  });

  it('renders the dinosaur mascot illustration', () => {
    expect(getByTestId('dino-mascot')).toBeTruthy();
  });

  it('renders the ¡Jugar! button', () => {
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('has a button with height >= 64dp', () => {
    const button = getByTestId('play-button');
    const style = Array.isArray(button.props.style) ? Object.assign({}, ...button.props.style) : button.props.style;
    expect(style.height).toBeGreaterThanOrEqual(64);
  });

  it('has a button touch area >= 48x48dp', () => {
    const button = getByTestId('play-button');
    const style = Array.isArray(button.props.style) ? Object.assign({}, ...button.props.style) : button.props.style;
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  });

  it('has text >= 24sp', () => {
    const textElement = getByText('¡Jugar!');
    const style = Array.isArray(textElement.props.style) ? Object.assign({}, ...textElement.props.style) : textElement.props.style;
    expect(style.fontSize).toBeGreaterThanOrEqual(24);
  });

  it('is keyboard navigable', () => {
    const button = getByTestId('play-button');
    expect(button.props.focusable).toBe(true);
  });

  it('has ARIA labels and correct role', () => {
    const button = getByTestId('play-button');
    expect(button.props.accessibilityLabel).toBeTruthy();
    expect(button.props.accessibilityRole).toBe('button');
  });
});
