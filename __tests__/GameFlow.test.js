import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GameFlow } from '../src/screens/GameFlow';

// Mock child components to isolate the flow logic
jest.mock('../src/screens/QuestionScreen', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ question, onAnswer }) => (
    <View testID="question-screen">
      <Text>{question.text}</Text>
      <TouchableOpacity testID="answer-correct" onPress={() => onAnswer(true)}>
        <Text>Correct</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="answer-incorrect" onPress={() => onAnswer(false)}>
        <Text>Incorrect</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/screens/FunFactScreen', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ fact, onNext }) => (
    <View testID="fun-fact-screen">
      <Text>{fact}</Text>
      <TouchableOpacity testID="fun-fact-next" onPress={onNext}>
        <Text>Next</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/screens/ResultsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="results-screen">
      <Text>Results</Text>
    </View>
  );
});

describe('TRIOFSND-28: Integrate Fun Fact screen into game flow', () => {
  const mockQuestions = [
    { id: 1, text: 'Question 1', fact: 'Fact 1' },
    { id: 2, text: 'Question 2', fact: 'Fact 2' },
  ];

  it('transitions to Fun Fact screen after a correct answer', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow questions={mockQuestions} />);
    
    expect(getByTestId('question-screen')).toBeTruthy();
    
    fireEvent.press(getByTestId('answer-correct'));
    
    await waitFor(() => {
      expect(getByTestId('fun-fact-screen')).toBeTruthy();
      expect(queryByTestId('question-screen')).toBeNull();
    });
  });

  it('transitions to Fun Fact screen after an incorrect answer', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow questions={mockQuestions} />);
    
    expect(getByTestId('question-screen')).toBeTruthy();
    
    fireEvent.press(getByTestId('answer-incorrect'));
    
    await waitFor(() => {
      expect(getByTestId('fun-fact-screen')).toBeTruthy();
      expect(queryByTestId('question-screen')).toBeNull();
    });
  });

  it('routes Next button to the next question if not the last question', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<GameFlow questions={mockQuestions} />);
    
    // Answer first question
    fireEvent.press(getByTestId('answer-correct'));
    await waitFor(() => expect(getByTestId('fun-fact-screen')).toBeTruthy());
    
    // Click Next on Fun Fact screen
    fireEvent.press(getByTestId('fun-fact-next'));
    
    await waitFor(() => {
      expect(getByTestId('question-screen')).toBeTruthy();
      expect(getByText('Question 2')).toBeTruthy();
      expect(queryByTestId('fun-fact-screen')).toBeNull();
    });
  });

  it('routes Next button to the results screen if it was the last question', async () => {
    const { getByTestId, queryByTestId } = render(<GameFlow questions={mockQuestions} />);
    
    // Answer first question and go to next
    fireEvent.press(getByTestId('answer-correct'));
    await waitFor(() => expect(getByTestId('fun-fact-screen')).toBeTruthy());
    fireEvent.press(getByTestId('fun-fact-next'));
    await waitFor(() => expect(getByTestId('question-screen')).toBeTruthy());
    
    // Answer second (last) question
    fireEvent.press(getByTestId('answer-incorrect'));
    await waitFor(() => expect(getByTestId('fun-fact-screen')).toBeTruthy());
    
    // Click Next on Fun Fact screen
    fireEvent.press(getByTestId('fun-fact-next'));
    
    await waitFor(() => {
      expect(getByTestId('results-screen')).toBeTruthy();
      expect(queryByTestId('fun-fact-screen')).toBeNull();
      expect(queryByTestId('question-screen')).toBeNull();
    });
  });
});
