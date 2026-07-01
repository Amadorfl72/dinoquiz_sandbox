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
      expect(correctOption.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: expect.any(String) }),
        ])
      );
    });

    it('applies a distinct highlight style to the correct option after incorrect tap', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const correctOption = getByTestId('option-opt2');
      const correctHighlight = getByTestId('correct-highlight-opt2');
      expect(correctHighlight).toBeTruthy();
    });

    it('does not highlight the correct option before any tap', () => {
      const { queryByTestId } = renderWithProviders();
      const correctHighlight = queryByTestId('correct-highlight-opt2');
      expect(correctHighlight).toBeNull();
    });

    it('visually marks the tapped incorrect option as incorrect', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      const incorrectHighlight = getByTestId('incorrect-highlight-opt1');
      expect(incorrectHighlight).toBeTruthy();
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

      const gentleKeywords = ['nice', 'try', 'close', 'almost', 'good', 'great', 'learning', 'keep', 'practice', 'oops', 'let', 'see'];
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
        expect.objectContaining({ funFact: 'Paris has been the capital of France since 987 AD.' })
      );
      });
    });
  });

  describe('Score is not subtracted on incorrect answer', () => {
      it('does not call subtractScore when an incorrect option is tapped', () => {
      const { getByTestId, scoreContextValue } = renderWithProviders(100);

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      expect(scoreContextValue.subtractScore).not.toHaveBeenCalled();
    });

    it('does not call addScore when an incorrect option is tapped', () => {
      const { getByTestId, scoreContextValue } = renderWithProviders(100);

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      expect(scoreContextValue.addScore).not.toHaveBeenCalled();
    });

    it('maintains the same score value after incorrect answer', () => {
      const { getByTestId, scoreContextValue } = renderWithProviders(250);

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      expect(scoreContextValue.score).toBe(250);
    });

    it('does not subtract score even when score is zero', () => {
      const { getByTestId, scoreContextValue } = renderWithProviders(0);

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      expect(scoreContextValue.subtractScore).not.toHaveBeenCalled();
    });
  });

  describe('Interaction with multiple incorrect options', () => {
    it('highlights correct option regardless of which incorrect option is tapped', () => {
      const { getByTestId, rerender } = renderWithProviders();

      const incorrectOption3 = getByTestId('option-opt3');
      fireEvent.press(incorrectOption3);

      const correctHighlight = getByTestId('correct-highlight-opt2');
      expect(correctHighlight).toBeTruthy();
    });

    it('shows feedback message for any incorrect option tapped', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption4 = getByTestId('option-opt4');
      fireEvent.press(incorrectOption4);

      const feedbackMessage = getByTestId('feedback-message');
      expect(feedbackMessage).toBeTruthy();
    });

    it('navigates to fun fact screen regardless of which incorrect option is tapped', async () => {
      const { getByTestId } = renderWithProviders();
      const { navigate } = require('../../src/navigation/navigationRef');

      const incorrectOption4 = getByTestId('option-opt4');
      fireEvent.press(incorrectOption4);

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('FunFact', expect.anything());
      });
    });
  });

  describe('State after incorrect answer interaction', () => {
    it('disables all options after an incorrect option is tapped', () => {
      const { getByTestId } = renderWithProviders();

      const incorrectOption = getByTestId('option-opt1');
      fireEvent.press(incorrectOption);

      mockOptions.forEach((opt) => {
        const option = getByTestId(`option-${opt.id}`);
        expect(option.props.disabled).toBe(true);
      });
    });

    it('prevents multiple taps on options after first incorrect tap', () => {
      const { getByTestId, scoreContextValue } = renderWithProviders();
      const { navigate } = require('../../src/navigation/navigationRef');

      const incorrectOption1 = getByTestId('option-opt1');
      fireEvent.press(incorrectOption1);

      const incorrectOption3 = getByTestId('option-opt3');
      fireEvent.press(incorrectOption3);

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(scoreContextValue.subtractScore).not.toHaveBeenCalled();
    });
  });
});
