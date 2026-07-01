import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GameFlow from '../GameFlow';

jest.mock('../FunFactScreen', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ onNext }) => (
    <TouchableOpacity testID="fun-fact-next-button" onPress={onNext}>
      <Text>Next</Text>
    </TouchableOpacity>
  );
});

jest.mock('../QuestionScreen', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return ({ onAnswer }) => (
    <>
      <TouchableOpacity testID="correct-answer-button" onPress={() => onAnswer(true)}>
        <Text>Correct Answer</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="incorrect-answer-button" onPress={() => onAnswer(false)}>
        <Text>Incorrect Answer</Text>
      </TouchableOpacity>
    </>
  );
});

jest.mock('../ResultsScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>Results</Text>;
});

describe('GameFlow', () => {
  it('navigates to Fun Fact screen after a correct answer', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow totalQuestions={3} />);
    
    fireEvent.press(getByTestId('correct-answer-button'));
    
    await waitFor(() => {
      expect(getByTestId('fun-fact-next-button')).toBeTruthy();
      expect(queryByTestId('correct-answer-button')).toBeNull();
    });
  });

  it('navigates to Fun Fact screen after an incorrect answer', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow totalQuestions={3} />);
    
    fireEvent.press(getByTestId('incorrect-answer-button'));
    
    await waitFor(() => {
      expect(getByTestId('fun-fact-next-button')).toBeTruthy();
      expect(queryByTestId('incorrect-answer-button')).toBeNull();
    });
  });

  it('navigates to the next question when Next is pressed on Fun Fact screen', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow totalQuestions={3} />);
    
    fireEvent.press(getByTestId('correct-answer-button'));
    await waitFor(() => expect(getByTestId('fun-fact-next-button')).toBeTruthy());
    
    fireEvent.press(getByTestId('fun-fact-next-button'));
    
    await waitFor(() => {
      expect(getByTestId('correct-answer-button')).toBeTruthy();
      expect(queryByTestId('fun-fact-next-button')).toBeNull();
    });
  });

  it('navigates to the Results screen when Next is pressed on the last question', async () => {
    const { getByTestId, getByText, queryByTestId } = render(<GameFlow totalQuestions={1} />);
    
    fireEvent.press(getByTestId('correct-answer-button'));
    await waitFor(() => expect(getByTestId('fun-fact-next-button')).toBeTruthy());
    
    fireEvent.press(getByTestId('fun-fact-next-button'));
    
    await waitFor(() => {
      expect(getByText('Results')).toBeTruthy();
      expect(queryByTestId('fun-fact-next-button')).toBeNull();
      expect(queryByTestId('correct-answer-button')).toBeNull();
    });
  });
});