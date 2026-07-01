import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestionScreen } from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockProps = {
    imageUri: 'https://example.com/dino.png',
    statement: 'What dinosaur is this?',
    options: ['T-Rex', 'Triceratops', 'Stegosaurus'],
    onSelectOption: jest.fn(),
  };

  it('renders the dinosaur image', () => {
    const { getByTestId } = render(<QuestionScreen {...mockProps} />);
    const image = getByTestId('dinosaur-image');
    expect(image.props.source.uri).toBe(mockProps.imageUri);
  });

  it('renders placeholder fallback when imageUri is not provided', () => {
    const { getByTestId } = render(
      <QuestionScreen {...mockProps} imageUri={null} />
    );
    const image = getByTestId('dinosaur-image');
    expect(image.props.source).toBeTruthy();
  });

  it('renders statement with font size >= 20', () => {
    const { getByTestId } = render(<QuestionScreen {...mockProps} />);
    const statement = getByTestId('question-statement');
    const style = Array.isArray(statement.props.style) 
      ? Object.assign({}, ...statement.props.style) 
      : statement.props.style;
    const fontSize = style?.fontSize || 16;
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  it('renders 3 to 4 answer option buttons', () => {
    const { getAllByTestId } = render(<QuestionScreen {...mockProps} />);
    const buttons = getAllByTestId('answer-option-button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons.length).toBeLessThanOrEqual(4);
  });

  it('maintains 48x48dp touch areas for answer option buttons', () => {
    const { getAllByTestId } = render(<QuestionScreen {...mockProps} />);
    const buttons = getAllByTestId('answer-option-button');
    
    buttons.forEach(button => {
      const style = Array.isArray(button.props.style) 
        ? Object.assign({}, ...button.props.style) 
        : button.props.style;
      const width = style?.width || style?.minWidth || 0;
      const height = style?.height || style?.minHeight || 0;
      
      expect(width).toBeGreaterThanOrEqual(48);
      expect(height).toBeGreaterThanOrEqual(48);
    });
  });
});