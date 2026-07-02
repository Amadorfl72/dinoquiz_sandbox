import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResultsScreen from '../components/ResultsScreen';
import { isNewBestScore, setBestScore } from '../utils/score';
import { strings } from '../strings';

jest.mock('../utils/score');

describe('Best Score Feedback (TRIOFSND-33)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    isNewBestScore.mockReturnValue(false);
    setBestScore.mockImplementation(() => true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the "¡Nueva mejor puntuación!" message when score beats persisted best', () => {
    isNewBestScore.mockReturnValue(true);
    render(<ResultsScreen score={8} onRestart={() => {}} />);
    expect(screen.getByText(strings.newBestScore)).toBeInTheDocument();
  });

  it('renders nothing visible when score does not beat persisted best', () => {
    isNewBestScore.mockReturnValue(false);
    render(<ResultsScreen score={3} onRestart={() => {}} />);
    expect(screen.queryByText(strings.newBestScore)).not.toBeInTheDocument();
  });

  it('persists the new best score via setBestScore when it is a new best', () => {
    isNewBestScore.mockReturnValue(true);
    render(<ResultsScreen score={9} onRestart={() => {}} />);
    expect(setBestScore).toHaveBeenCalledWith(9);
  });

  it('does not call setBestScore when score is not a new best', () => {
    isNewBestScore.mockReturnValue(false);
    render(<ResultsScreen score={2} onRestart={() => {}} />);
    expect(setBestScore).not.toHaveBeenCalled();
  });

  it('auto-dismisses the feedback after 3 seconds', () => {
    isNewBestScore.mockReturnValue(true);
    render(<ResultsScreen score={7} onRestart={() => {}} />);
    expect(screen.getByText(strings.newBestScore)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(strings.newBestScore)).not.toBeInTheDocument();
  });

  it('keeps feedback visible before the 3-second timeout elapses', () => {
    isNewBestScore.mockReturnValue(true);
    render(<ResultsScreen score={7} onRestart={() => {}} />);
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(screen.getByText(strings.newBestScore)).toBeInTheDocument();
  });

  it('renders the results title', () => {
    render(<ResultsScreen score={5} onRestart={() => {}} />);
    expect(screen.getByText(strings.resultsTitle)).toBeInTheDocument();
  });

  it('renders the score in the results text', () => {
    render(<ResultsScreen score={5} onRestart={() => {}} />);
    expect(screen.getByText('Puntuación: 5/10')).toBeInTheDocument();
  });

  it('calls onRestart when the play again button is clicked', () => {
    const onRestart = jest.fn();
    render(<ResultsScreen score={5} onRestart={onRestart} />);
    fireEvent.click(screen.getByRole('button', { name: strings.playAgain }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('does not block rendering when setBestScore throws', () => {
    isNewBestScore.mockReturnValue(true);
    setBestScore.mockImplementation(() => { throw new Error('Storage failure'); });
    expect(() => render(<ResultsScreen score={6} onRestart={() => {}} />)).not.toThrow();
    expect(screen.getByText(strings.resultsTitle)).toBeInTheDocument();
  });

  it('does not show new-best feedback when setBestScore throws', () => {
    isNewBestScore.mockReturnValue(true);
    setBestScore.mockImplementation(() => { throw new Error('Storage failure'); });
    render(<ResultsScreen score={6} onRestart={() => {}} />);
    expect(screen.queryByText(strings.newBestScore)).not.toBeInTheDocument();
  });
});
