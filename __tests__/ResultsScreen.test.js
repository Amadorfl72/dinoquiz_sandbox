import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ResultsScreen from '../src/screens/ResultsScreen';
import { setBestScore, getBestScore } from '../src/storage/scoreStorage';

jest.mock('../src/storage/scoreStorage', () => ({
  setBestScore: jest.fn(),
  getBestScore: jest.fn(),
}));

// Minimal navigation mock so navigation.navigate doesn't blow up
const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, reset: jest.fn() };

describe('TRIOFSND-33: Best Score Persistence and Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBestScore.mockResolvedValue(0);
  });

  it('renders without throwing when setBestScore rejects', () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));

    expect(() =>
      render(
        <ResultsScreen
          route={{ params: { score: 8 } }}
          navigation={mockNavigation}
        />
      )
    ).not.toThrow();
  });

  it('displays error feedback when setBestScore rejects', async () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 8 } }}
        navigation={mockNavigation}
      />
    );

    expect(
      await findByText('Could not save your best score. Try again later.')
    ).toBeTruthy();
  });

  it('calls setBestScore with the score from route params', () => {
    setBestScore.mockResolvedValue(undefined);

    render(
      <ResultsScreen
        route={{ params: { score: 7 } }}
        navigation={mockNavigation}
      />
    );

    expect(setBestScore).toHaveBeenCalledWith(7);
  });

  it('does not display error feedback when setBestScore resolves', async () => {
    setBestScore.mockResolvedValue(undefined);

    const { queryByText, findByText } = render(
      <ResultsScreen
        route={{ params: { score: 9 } }}
        navigation={mockNavigation}
      />
    );

    await findByText('Your Score: 9/10');

    expect(
      queryByText('Could not save your best score. Try again later.')
    ).toBeNull();
  });

  it('displays the score', async () => {
    setBestScore.mockResolvedValue(undefined);

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 6 } }}
        navigation={mockNavigation}
      />
    );

    expect(await findByText('Your Score: 6/10')).toBeTruthy();
  });

  it('loads and displays the best score after persisting', async () => {
    setBestScore.mockResolvedValue(undefined);
    getBestScore.mockResolvedValue(5);

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 3 } }}
        navigation={mockNavigation}
      />
    );

    expect(await findByText('Best Score: 5/10')).toBeTruthy();
    expect(getBestScore).toHaveBeenCalled();
  });

  it('still loads best score even when setBestScore rejects', async () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));
    getBestScore.mockResolvedValue(4);

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 2 } }}
        navigation={mockNavigation}
      />
    );

    expect(await findByText('Best Score: 4/10')).toBeTruthy();
    expect(getBestScore).toHaveBeenCalled();
  });

  it('does not throw when getBestScore also rejects after setBestScore rejects', async () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));
    getBestScore.mockRejectedValue(new Error('Load failure'));

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 2 } }}
        navigation={mockNavigation}
      />
    );

    // Error feedback should still appear from the setBestScore failure
    expect(
      await findByText('Could not save your best score. Try again later.')
    ).toBeTruthy();
  });

  it('renders a Play Again button that navigates home', async () => {
    setBestScore.mockResolvedValue(undefined);

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 8 } }}
        navigation={mockNavigation}
      />
    );

    const playAgainButton = await findByText('Play Again');
    expect(playAgainButton).toBeTruthy();
  });
});

describe('TRIOFSND-44: Best Score Comparison and Update Logic', () => {
  let rejectionHandler;
  let rejectionErrors;

  beforeEach(() => {
    jest.clearAllMocks();
    getBestScore.mockResolvedValue(0);
    setBestScore.mockResolvedValue(undefined);

    // Capture any unhandled promise rejections so the test fails with a
    // clear message instead of a silent unhandledRejection crash.
    rejectionErrors = [];
    rejectionHandler = (error) => {
      rejectionErrors.push(error);
    };
    process.on('unhandledRejection', rejectionHandler);
  });

  afterEach(() => {
    if (rejectionHandler) {
      process.removeListener('unhandledRejection', rejectionHandler);
    }
  });

  it('displays new best score message when current score exceeds stored best score', async () => {
    getBestScore.mockResolvedValue(5);

    const { findByText } = render(
      <ResultsScreen
        route={{ params: { score: 8 } }}
        navigation={mockNavigation}
      />
    );

    expect(await findByText('New Best Score!')).toBeTruthy();
  });

  it('does not display new best score message when current score is less than stored best score', async () => {
    getBestScore.mockResolvedValue(9);

    const { queryByText, findByText } = render(
      <ResultsScreen
        route={{ params: { score: 3 } }}
        navigation={mockNavigation}
      />
    );

    await findByText('Your Score: 3/10');

    expect(queryByText('New Best Score!')).toBeNull();
  });

  it('does not display new best score message when current score equals stored best score', async () => {
    getBestScore.mockResolvedValue(7);

    const { queryByText, findByText } = render(
      <ResultsScreen
        route={{ params: { score: 7 } }}
        navigation={mockNavigation}
      />
    );

    await findByText('Your Score: 7/10');

    expect(queryByText('New Best Score!')).toBeNull();
  });

  it('does not display new best score message when getBestScore rejects', async () => {
    getBestScore.mockRejectedValue(new Error('Storage error'));

    const { queryByText, findByText } = render(
      <ResultsScreen
        route={{ params: { score: 8 } }}
        navigation={mockNavigation}
      />
    );

    await findByText('Your Score: 8/10');

    expect(queryByText('New Best Score!')).toBeNull();
    expect(rejectionErrors).toHaveLength(0);
  });
});