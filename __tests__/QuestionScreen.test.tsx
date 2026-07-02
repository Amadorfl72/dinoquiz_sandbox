import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionScreen } from '../src/screens/QuestionScreen';

describe('QuestionScreen', () => {
  const mockProps = {
    imageUri: 'https://example.com/dino.png',
    statement: 'What dinosaur is this?',
    options: ['T-Rex', 'Triceratops', 'Stegosaurus'],
    onSelectAnswer: jest.fn(),
  };

  it('renders the dinosaur image when imageUri is provided', () => {
    const { getByTestId } = render(<QuestionScreen {...mockProps} />);
    expect(getByTestId('dinosaur-image')).toBeTruthy();
  });

  it('renders placeholder fallback when imageUri is missing', () => {
    const { getByTestId, queryByTestId } = render(
      <QuestionScreen {...mockProps} imageUri={null} />
    );
    expect(getByTestId('dinosaur-placeholder')).toBeTruthy();
    expect(queryByTestId('dinosaur-image')).toBeNull();
  });

  it('renders statement with font size >= 20sp', () => {
    const { getByText } = render(<QuestionScreen {...mockProps} />);
    const statement = getByText(mockProps.statement);
    const styleArray = statement.props.style;
    const style = Array.isArray(styleArray) ? Object.assign({}, ...styleArray) : styleArray;
    
    expect(style.fontSize).toBeGreaterThanOrEqual(20);
  });

  it('renders 3 to 4 answer option buttons', () => {
    const { getAllByTestId } = render(<QuestionScreen {...mockProps} />);
    const buttons = getAllByTestId('answer-option-button');
    
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons.length).toBeLessThanOrEqual(4);
  });

  it('maintains 48x48dp minimum touch areas for answer buttons', () => {
    const { getAllByTestId } = render(<QuestionScreen {...mockProps} />);
    const buttons = getAllByTestId('answer-option-button');
    
    buttons.forEach(button => {
      const styleArray = button.props.style;
      const style = Array.isArray(styleArray) ? Object.assign({}, ...styleArray) : styleArray;
      const width = style.minWidth || style.width;
      const height = style.minHeight || style.height;
      
      expect(width).toBeGreaterThanOrEqual(48);
      expect(height).toBeGreaterThanOrEqual(48);
    });
  });
});