import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactScreen } from '../../src/screens/FunFactScreen';
import { NavigationContainer } from '@react-navigation/native';

describe('TRIOFSND-19: Fun Fact Screen (Incorrect Answer Flow)', () => {
  const defaultProps = {
    route: { params: { funFact: 'Paris is known as the City of Light.' } },
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
  };

  const renderScreen = (props = defaultProps) =>
    render(
      <NavigationContainer>
        <FunFactScreen {...props} />
      </NavigationContainer>
    );

  it('displays the fun fact passed from the answer screen', () => {
    const { getByTestId } = renderScreen();
    const funFactText = getByTestId('fun-fact-text');
    expect(funFactText.props.children).toContain('Paris is known as the City of Light.');
  });

  it('does not display any score penalty indicator on the fun fact screen', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('score-penalty')).toBeNull();
    expect(queryByTestId('penalty-indicator')).toBeNull();
  });

  it('displays a positive or neutral heading consistent with non-punitive tone', () => {
    const { getByTestId } = renderScreen();
    const heading = getByTestId('fun-fact-heading');
    const headingText = heading.props.children;
    expect(headingText).not.toMatch(/wrong|penalty|incorrect|fail/i);
  });
});
