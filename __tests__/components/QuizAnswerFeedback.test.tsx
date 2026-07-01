import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuizScreen } from '../../src/screens/QuizScreen';
import { ScoreContext } from '../../src/context/ScoreContext';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('../../src/navigation/navigationRef', () => ({
  navigate: jest.fn(),
}));

const mockOptions = [
  { id: 'opt1', text: 'Option A', isCorrect: false },
  { id: 'opt2', text: 'Option B', isCorrect: true },
  { id: 'opt3', text: 'Option C', isCorrect: false },
  { id: 'opt4', text: 'Option D', isCorrect: false },
];

const mockQuestion = {
  id: 'q1',
  text: 'What is the capital of France?',
  options: mockOptions,
  funFact: 'Paris has been the capital of France since 987 AD.',
};

const renderWithProviders = (initialScore = 100) => {
  const scoreContextValue = {
    score: initialScore,
    subtractScore: jest.fn(),
    addScore: jest.fn(),
  };

  return {
    ...render(
      <NavigationContainer>
        <ScoreContext.Provider value={scoreContextValue}>
          <QuizScreen question={mockQuestion} />
        </ScoreContext.Provider>
      </NavigationContainer>
    ),
    scoreContextValue,
  };
};

describe('TRIOFSND-19: Incorrect Answer Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visual highlight of correct option', () => {
    it('highlights the correct option when an incorrect option is tapped', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const correctOption = getByTestId('option-opt2');
      expect(correctOption.props.className).toContain('correct');
    });

    it('does not highlight the correct option before any tap', () => {
      const { queryByTestId } = renderWithProviders();
      const correctOption = queryByTestId('option-opt2');
      expect(correctOption.props.className).not.toContain('correct');
    });
  });

  describe('Gentle non-punitive message', () => {
    it('displays a non-punitive feedback message after tapping an incorrect option', () => {
      const { getByTestId, getByText } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const feedbackMessage = getByTestId('feedback-message');
      expect(feedbackMessage).toBeTruthy();
    });

    it('uses gentle, encouraging language in the feedback message', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const feedbackMessage = getByTestId('feedback-message');
      const messageText = feedbackMessage.props.children;

      const punitiveWords = ['wrong', 'stupid', 'fail', 'incorrect', 'bad', 'no', 'error'];
      const messageLower = String(messageText).toLowerCase();
      punitiveWords.forEach((word) => {
        expect(messageLower).not.toContain(word);
      });
    });

    it('does not show the feedback message before an option is tapped', () => {
      const { queryByTestId } = renderWithProviders();
      expect(queryByTestId('feedback-message')).toBeNull();
    });

    it('shows feedback message with positive or neutral tone keywords', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const feedbackMessage = getByTestId('feedback-message');
      const messageText = String(feedbackMessage.props.children).toLowerCase();

      const gentleKeywords = ['nice', 'try', 'close', 'almost', 'good', 'great', 'learning', 'keep', 'practice', 'oops', 'let', 'see', 'casi', 'sigamos'];
      const containsGentleKeyword = gentleKeywords.some((kw) => messageText.includes(kw));
      expect(containsGentleKeyword).toBe(true);
    });
  });

  describe('Transition to fun fact screen', () => {
    it('navigates to the fun fact screen after tapping an incorrect option', async () => {
      const { getByTestId } = renderWithProviders();
      const { navigate } = require('../../src/navigation/navigationRef');

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('FunFact', expect.objectContaining({
          funFact: mockQuestion.funFact,
        }));
      });
    });

    it('waits a brief delay before transitioning to fun fact screen', async () => {
      jest.useFakeTimers();
      const { getByTestId } = renderWithProviders();
      const { navigate } = require('../../src/navigation/navigationRef');

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      expect(navigate).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('FunFact', expect.anything());
      });

      jest.useRealTimers();
    });

    it('passes the correct fun fact content to the fun fact screen', async () => {
      const { getByTestId } = renderWithProviders();
      const { navigate } = require('../../src/navigation/navigationRef');

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(
          'FunFact',
          expect.objectContaining({
            funFact: mockQuestion.funFact,
          })
        );
      });
    });
  });

  describe('Score behavior', () => {
    it('does not subtract score when an incorrect option is tapped', async () => {
      const { getByTestId, scoreContextValue } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      await waitFor(() => {
        expect(scoreContextValue.subtractScore).not.toHaveBeenCalled();
      });
    });

    it('does not add score when an incorrect option is tapped', async () => {
      const { getByTestId, scoreContextValue } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      await waitFor(() => {
        expect(scoreContextValue.addScore).not.toHaveBeenCalled();
      });
    });
  });

  describe('Option interaction behavior', () => {
    it('disables all options after an incorrect option is tapped to prevent multiple selections', () => {
      const { getByTestId, getAllByRole } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const allOptions = getAllByRole('button');
      allOptions.forEach(option => {
        expect(option.props.disabled).toBe(true);
      });
    });

    it('does not allow selecting another option after an incorrect selection', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const correctOption = getByTestId('option-opt2');
      fireEvent.press(correctOption);

      // The correct option should still have the correct class
      expect(correctOption.props.className).toContain('correct');
      // The incorrect option should still have the incorrect class
      expect(incorrectOption.props.className).toContain('incorrect');
    });
  });
});