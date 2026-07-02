import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import QuestionScreen from './QuestionScreen';

describe('QuestionScreen', () => {
  const mockQuestion = 'What dinosaur is known for having three horns?';
  const mockOptions = ['T-Rex', 'Triceratops', 'Velociraptor'];
  const mockDinosaurImage = require('../assets/triceratops.png');

  const renderComponent = (overrides = {}) => {
    const onOptionSelect = jest.fn();
    const utils = render(
      <QuestionScreen
        question={overrides.question ?? mockQuestion}
        options={overrides.options ?? mockOptions}
        dinosaurImage={overrides.dinosaurImage ?? mockDinosaurImage}
        onOptionSelect={overrides.onOptionSelect ?? onOptionSelect}
      />
    );
    return { ...utils, onOptionSelect };
  };

  it('renders the question statement text', () => {
    const { getByText } = renderComponent();
    expect(getByText(mockQuestion)).toBeTruthy();
  });

  it('renders the dinosaur illustration with an accessibility label', () => {
    const { getByTestId, getByLabelText } = renderComponent();
    const image = getByTestId('dinosaur-image');
    expect(image).toBeTruthy();
    expect(getByLabelText('Dinosaur illustration')).toBeTruthy();
  });

  it('renders exactly three touchable option buttons', () => {
    const { getAllByRole } = renderComponent();
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('renders only three buttons even when more than three options are provided', () => {
    const extraOptions = ['T-Rex', 'Triceratops', 'Velociraptor', 'Stegosaurus', 'Brachiosaurus'];
    const { getAllByRole } = renderComponent({ options: extraOptions });
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('each button has a minimum height and width of at least 48 pixels (>=48dp)', () => {
    const { getAllByRole } = renderComponent();
    const buttons = getAllByRole('button');

    buttons.forEach((button) => {
      const styleArray = Array.isArray(button.props.style) ? button.props.style : [button.props.style];
      const inlineStyle = styleArray.find(
        (s) => s && typeof s === 'object' && (s.minHeight !== undefined || s.minWidth !== undefined)
      );
      expect(inlineStyle).toBeDefined();
      expect(inlineStyle.minHeight).toBeGreaterThanOrEqual(48);
      expect(inlineStyle.minWidth).toBeGreaterThanOrEqual(48);
    });
  });

  it('each button has an accessibility label describing the answer option', () => {
    const { getAllByRole } = renderComponent();
    const buttons = getAllByRole('button');
    buttons.forEach((button, index) => {
      expect(button.props.accessibilityLabel).toBe(`Answer option: ${mockOptions[index]}`);
    });
  });

  it('calls onOptionSelect with the correct option when a button is pressed', () => {
    const { getByText, onOptionSelect } = renderComponent();
    fireEvent.press(getByText(mockOptions[0]));
    expect(onOptionSelect).toHaveBeenCalledWith(mockOptions[0]);
    expect(onOptionSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onOptionSelect for each respective button when pressed', () => {
    const { getByText, onOptionSelect } = renderComponent();
    fireEvent.press(getByText(mockOptions[1]));
    expect(onOptionSelect).toHaveBeenCalledWith(mockOptions[1]);
    fireEvent.press(getByText(mockOptions[2]));
    expect(onOptionSelect).toHaveBeenCalledWith(mockOptions[2]);
    expect(onOptionSelect).toHaveBeenCalledTimes(2);
  });

  it('does not render any timer element', () => {
    const { queryByText, queryByTestId } = renderComponent();
    expect(queryByText(/timer/i)).toBeNull();
    expect(queryByTestId('timer')).toBeNull();
  });

  it('does not render any countdown element', () => {
    const { queryByText, queryByTestId } = renderComponent();
    expect(queryByText(/countdown/i)).toBeNull();
    expect(queryByTestId('countdown')).toBeNull();
  });

  it('does not render any time-related text or elements', () => {
    const { queryByText, queryByTestId } = renderComponent();
    expect(queryByText(/\b\d{1,2}\s*s\b/i)).toBeNull();
    expect(queryByText(/time remaining/i)).toBeNull();
    expect(queryByText(/seconds? left/i)).toBeNull();
    expect(queryByTestId('timer')).toBeNull();
    expect(queryByTestId('countdown')).toBeNull();
  });
});
