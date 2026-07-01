import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AnswerScreen } from '../../src/screens/AnswerScreen';
import { ScoreContext } from '../../src/context/ScoreContext';
import { NavigationContainer } from '@react-navigation/native';

// --- Mocks ---
const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, dispatch: jest.fn() };

jest.mock('../../src/api/trivia', () => ({
  fetchQuestion: jest.fn().mockResolvedValue({
    id: 'q1',
    question: 'What is the capital of France?',
    options: [
      { id: 'a', text: 'London', isCorrect: false },
      { id: 'b', text: 'Paris', isCorrect: true },
      { id: 'c', text: 'Berlin', isCorrect: false },
      { id: 'd', text: 'Madrid', isCorrect: false },
    ],
    funFact: 'Paris is known as the City of Light.',
  }),
}));

const renderWithProviders = (ui, { score = 100 } = {}) => {
  const setScore = jest.fn();
  const subtractScore = jest.fn();
  const scoreValue = { score, setScore, subtractScore };
  return render(
    <ScoreContext.Provider value={scoreValue}>
      <NavigationContainer>{ui}</NavigationContainer>
    </ScoreContext.Provider>
  );
};

// --- Tests ---
describe('TRIOFSND-19: Incorrect Answer Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visually highlights the correct option when an incorrect option is tapped', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    // Wait for question to load
    const incorrectOption = await findByText('London');
    fireEvent.press(incorrectOption);

    // The correct option should receive a highlight style / testID
    const correctOption = getByTestId('option-b');
    expect(correctOption.props.style).toMatchObject({
      borderColor: expect.stringMatching(/#|green|correct/i),
    });
    // Alternatively check for a highlight-specific testID or accessibility state
    expect(correctOption.props.accessibilityValue?.text).toContain('correct');
  });

  it('shows a gentle non-punitive message after tapping an incorrect option', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const incorrectOption = await findByText('Berlin');
    fireEvent.press(incorrectOption);

    const feedbackMessage = getByTestId('incorrect-feedback-message');
    expect(feedbackMessage).toBeTruthy();

    const messageText = feedbackMessage.props.children;
    // Message should be gentle and non-punitive
    expect(messageText).not.toMatch(/wrong|stupid|fail|penalty|incorrect/i);
    expect(messageText).toMatch(/nice try|good effort|almost|keep going|don't worry|not quite|learning/i);
  });

  it('transitions to the fun fact screen after tapping an incorrect option', async () => {
    const { findByText } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const incorrectOption = await findByText('Madrid');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FunFact', expect.anything());
    });
  });

  it('passes the fun fact data when navigating to the fun fact screen', async () => {
    const { findByText } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const incorrectOption = await findByText('London');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'FunFact',
        expect.objectContaining({
          funFact: expect.stringContaining('Paris'),
        })
      );
    });
  });

  it('does not subtract score when an incorrect option is tapped', async () => {
    const subtractScore = jest.fn();
    const scoreValue = { score: 100, setScore: jest.fn(), subtractScore };

    const { findByText } = render(
      <ScoreContext.Provider value={scoreValue}>
        <NavigationContainer>
          <AnswerScreen navigation={mockNavigation} />
        </NavigationContainer>
      </ScoreContext.Provider>
    );

    const incorrectOption = await findByText('London');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    expect(subtractScore).not.toHaveBeenCalled();
  });

  it('does not change the score value when an incorrect option is tapped', async () => {
    const setScore = jest.fn();
    const scoreValue = { score: 100, setScore, subtractScore: jest.fn() };

    const { findByText } = render(
      <ScoreContext.Provider value={scoreValue}>
        <NavigationContainer>
          <AnswerScreen navigation={mockNavigation} />
        </NavigationContainer>
      </ScoreContext.Provider>
    );

    const incorrectOption = await findByText('Berlin');
    fireEvent.press(incorrectOption);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    expect(setScore).not.toHaveBeenCalled();
  });

  it('highlights the tapped incorrect option differently from the correct option', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const incorrectOption = await findByText('London');
    fireEvent.press(incorrectOption);

    const tappedOption = getByTestId('option-a');
    const correctOption = getByTestId('option-b');

    // Tapped incorrect option should have an "incorrect" visual state
    expect(tappedOption.props.accessibilityValue?.text).toContain('incorrect');
    // Correct option should have a "correct" visual state
    expect(correctOption.props.accessibilityValue?.text).toContain('correct');
  });

  it('disables all options after an incorrect option is tapped to prevent multiple selections', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const firstIncorrect = await findByText('London');
    fireEvent.press(firstIncorrect);

    const secondOption = getByTestId('option-c');
    expect(secondOption.props.disabled).toBe(true);
  });

  it('shows the gentle message before transitioning to the fun fact screen', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <AnswerScreen navigation={mockNavigation} />
    );

    const incorrectOption = await findByText('Madrid');
    fireEvent.press(incorrectOption);

    // Feedback message should appear immediately
    const feedbackMessage = getByTestId('incorrect-feedback-message');
    expect(feedbackMessage).toBeTruthy();

    // Navigation should happen after a short delay (allowing user to read the message)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FunFact', expect.anything());
    });
  });
});
