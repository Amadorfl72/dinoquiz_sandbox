import React from 'react';
import { render, screen } from '@testing-library/react';
import { logGameCompleted } from '../../logging/gameCompleted';
import { ResultsScreen } from '../ResultsScreen';

jest.mock('../../logging/gameCompleted');

describe('ResultsScreen', () => {
  const mockLogGameCompleted = logGameCompleted as jest.MockedFunction<typeof logGameCompleted>;

  afterEach(() => {
    mockLogGameCompleted.mockReset();
  });

  const defaultProps = {
    score: 2000,
    duration_ms: 150000,
    appVersion: '2.0.1',
  };

  it('renders the results screen with the final score', () => {
    render(<ResultsScreen {...defaultProps} />);
    expect(screen.getByText(/2,000/)).toBeInTheDocument();
  });

  it('emits the game_completed event on mount', () => {
    render(<ResultsScreen {...defaultProps} />);
    expect(mockLogGameCompleted).toHaveBeenCalledTimes(1);
  });

  it('passes score, duration_ms, and app_version to the logging function', () => {
    render(<ResultsScreen {...defaultProps} />);
    expect(mockLogGameCompleted).toHaveBeenCalledWith({
      score: 2000,
      duration_ms: 150000,
      app_version: '2.0.1',
    });
  });

  it('does not emit the event more than once when re-rendering with the same props', () => {
    const { rerender } = render(<ResultsScreen {...defaultProps} />);
    rerender(<ResultsScreen {...defaultProps} />);
    expect(mockLogGameCompleted).toHaveBeenCalledTimes(1);
  });

  it('emits the event again if the score changes', () => {
    const { rerender } = render(<ResultsScreen {...defaultProps} />);
    rerender(<ResultsScreen {...defaultProps} score={2500} />);
    expect(mockLogGameCompleted).toHaveBeenCalledTimes(2);
    expect(mockLogGameCompleted).toHaveBeenLastCalledWith({
      score: 2500,
      duration_ms: 150000,
      app_version: '2.0.1',
    });
  });
});