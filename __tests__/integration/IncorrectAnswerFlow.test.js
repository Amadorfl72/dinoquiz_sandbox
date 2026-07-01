import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../../src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { ScoreProvider } from '../../src/context/ScoreContext';

jest.mock('../../src/api/trivia', () => ({
  fetchQuestion: jest.fn().mockResolvedValue({
    id: 'q1',
    question: 'What is the capital of France?',
    options: [
      { id: 'a', text: 'London', isCorrect: false },
      { id: 'b', text: 'Paris', isCorrect: true },
      { id: 'c', text: 'Berlin', isCorrect: false },
    ],
    funFact: 'Paris is known as the City of Light.',
  }),
}));

describe('TRIOFSND-19: Integration - Incorrect Answer Full Flow', () => {
  it('completes the full incorrect answer flow: tap -> highlight -> message -> fun fact', async () => {
    const { findByText, getByTestId } = render(
      <ScoreProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ScoreProvider>
    );

    // Wait for the question to load and tap an incorrect option
    const incorrectOption = await findByText('London');
    fireEvent.press(incorrectOption);

    // Correct option should be highlighted
    const correctOption = getByTestId('option-b');
    expect(correctOption.props.accessibilityValue?.text).toContain('correct');

    // Gentle message should be visible
    const feedbackMessage = getByTestId('incorrect-feedback-message');
    expect(feedbackMessage).toBeTruthy();

    // Should navigate to fun fact screen
    await waitFor(() => {
      const funFactText = getByTestId('fun-fact-text');
      expect(funFactText).toBeTruthy();
      expect(funFactText.props.children).toContain('Paris is known as the City of Light.');
    });
  });
});
