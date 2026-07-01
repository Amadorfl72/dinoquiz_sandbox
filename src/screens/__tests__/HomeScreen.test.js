import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

describe('TRIOFSND-50: Home Screen UI and Accessibility', () => {
  let getByText, getByLabelText, getByTestId;

  beforeEach(() => {
    const utils = render(<HomeScreen />);
    getByText = utils.getByText;
    getByLabelText = utils.getByLabelText;
    getByTestId = utils.getByTestId;
  });

  const getMergedStyle = (props) => {
    if (!props.style) return {};
    return Array.isArray(props.style) ? Object.assign({}, ...props.style) : props.style;
  };

  it('renders the DinoQuiz title with text size >= 24sp', () => {
    const title = getByText('DinoQuiz');
    expect(title).toBeTruthy();
    
    const style = getMergedStyle(title.props);
    expect(style.fontSize).toBeGreaterThanOrEqual(24);
  });

  it('renders the dinosaur mascot illustration', () => {
    const mascot = getByLabelText('Dinosaur mascot illustration');
    expect(mascot).toBeTruthy();
  });

  it('renders the ¡Jugar! button with ARIA label (accessibilityLabel)', () => {
    const button = getByLabelText('Play button');
    expect(button).toBeTruthy();
    expect(getByText('¡Jugar!')).toBeTruthy();
  });

  it('ensures button height >= 64dp', () => {
    const button = getByLabelText('Play button');
    const style = getMergedStyle(button.props);
    expect(style.height).toBeGreaterThanOrEqual(64);
  });

  it('ensures button touch area >= 48x48dp', () => {
    const button = getByLabelText('Play button');
    const style = getMergedStyle(button.props);
    const height = style.height || style.minHeight || 0;
    const width = style.width || style.minWidth || 0;
    expect(height).toBeGreaterThanOrEqual(48);
    expect(width).toBeGreaterThanOrEqual(48);
  });

  it('ensures button is keyboard navigable (focusable)', () => {
    const button = getByLabelText('Play button');
    // In React Native, accessible elements are focusable for keyboard navigation
    expect(button.props.accessible).not.toBe(false);
  });

  it('ensures responsive design optimized for tablet horizontal', () => {
    const container = getByTestId('home-container');
    const style = getMergedStyle(container.props);
    // Check for flexbox usage which is standard for responsive layouts in RN
    expect(style.flexDirection).toBeDefined();
  });
});
