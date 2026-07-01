import React from 'react';
import { render } from '@testing-library/react-native';
import FunFactScreen from '../FunFactScreen';

describe('FunFactScreen', () => {
  const mockFunFact = 'The T-Rex had a bite force of 12,800 pounds!';

  it('renders the fun fact text', () => {
    const { getByText } = render(<FunFactScreen funFact={mockFunFact} />);
    expect(getByText(mockFunFact)).toBeTruthy();
  });

  it('renders the dinosaur image', () => {
    const { getByTestId } = render(<FunFactScreen funFact={mockFunFact} />);
    expect(getByTestId('dinosaur-image')).toBeTruthy();
  });

  it('renders a Next button with text', () => {
    const { getByText } = render(<FunFactScreen funFact={mockFunFact} />);
    expect(getByText('Next')).toBeTruthy();
  });

  it('ensures the Next button has a height of at least 48', () => {
    const { getByTestId } = render(<FunFactScreen funFact={mockFunFact} />);
    const nextButton = getByTestId('next-button');
    const style = nextButton.props.style;
    
    let height = 0;
    if (Array.isArray(style)) {
      style.forEach(s => {
        if (s && s.height) height = s.height;
      });
    } else if (style && style.height) {
      height = style.height;
    }
    
    expect(height).toBeGreaterThanOrEqual(48);
  });

  it('ensures the Next button has colorful styling (background color)', () => {
    const { getByTestId } = render(<FunFactScreen funFact={mockFunFact} />);
    const nextButton = getByTestId('next-button');
    const style = nextButton.props.style;
    
    let backgroundColor = 'transparent';
    if (Array.isArray(style)) {
      style.forEach(s => {
        if (s && s.backgroundColor) backgroundColor = s.backgroundColor;
      });
    } else if (style && style.backgroundColor) {
      backgroundColor = style.backgroundColor;
    }
    
    expect(backgroundColor).toBeDefined();
    expect(backgroundColor).not.toBe('transparent');
    expect(backgroundColor).not.toBe('#ffffff');
    expect(backgroundColor).not.toBe('#000000');
  });
});