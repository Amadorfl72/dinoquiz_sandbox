import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ResultsScreen from '../src/screens/ResultsScreen';
import { setBestScore } from '../src/storage/scoreStorage';

jest.mock('../src/storage/scoreStorage', () => ({
  setBestScore: jest.fn(),
}));

describe('TRIOFSND-33: Best Score Persistence and Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing when setBestScore rejects', () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));

    expect(() =>
      render(<ResultsScreen route={{ params: { score: 8 } }} />)
    ).not.toThrow();
  });

  it('displays error feedback when setBestScore rejects', async () => {
    setBestScore.mockRejectedValue(new Error('Storage failure'));

    const { findByText } = render(
      <ResultsScreen route={{ params: { score: 8 } }} />
    );

    expect(
      await findByText('Could not save your best score. Try again later.')
    ).toBeTruthy();
  });

  it('calls setBestScore with the score from route params', () => {
    setBestScore.mockResolvedValue(undefined);

    render(<ResultsScreen route={{ params: { score: 7 } }} />);

    expect(setBestScore).toHaveBeenCalledWith(7);
  });

  it('does not display error feedback when setBestScore resolves', async () => {
    setBestScore.mockResolvedValue(undefined);

    const { queryByText, findByText } = render(
      <ResultsScreen route={{ params: { score: 9 } }} />
    );

    await findByText('Your Score: 9/10');

    expect(
      queryByText('Could not save your best score. Try again later.')
    ).toBeNull();
  });

  it('displays the score', async () => {
    setBestScore.mockResolvedValue(undefined);

    const { findByText } = render(
      <ResultsScreen route={{ params: { score: 6 } }} />
    );

    expect(await findByText('Your Score: 6/10')).toBeTruthy();
  });
});
