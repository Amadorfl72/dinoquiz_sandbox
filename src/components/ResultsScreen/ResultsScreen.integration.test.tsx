import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GameFlow } from './GameFlow';
import * as storage from '../../utils/storage';

jest.mock('../../utils/storage');

describe('ResultsScreen integration - best score on game completion', () => {
  const mockGetItem = storage.getItem as jest.MockedFunction<typeof storage.getItem>;
  const mockSetItem = storage.setItem as jest.MockedFunction<typeof storage.setItem>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null);
    mockSetItem.mockImplementation(() => {});
  });

  it('shows the persisted best score on the results screen after game completion', () => {
    mockGetItem.mockReturnValue('175');
    render(<GameFlow initialGameState='completed' currentScore={90} />);
    expect(screen.getByTestId('best-score')).toHaveTextContent('175');
    expect(screen.getByTestId('current-score')).toHaveTextContent('90');
  });

  it('updates and displays the new best score when the child beats their record', () => {
    mockGetItem.mockReturnValue('50');
    render(<GameFlow initialGameState='completed' currentScore={120} />);
    expect(mockSetItem).toHaveBeenCalledWith('bestScore', '120');
    expect(screen.getByTestId('best-score')).toHaveTextContent('120');
    expect(screen.getByTestId('current-score')).toHaveTextContent('120');
  });

  it('keeps the old best score displayed when the child does not beat their record', () => {
    mockGetItem.mockReturnValue('200');
    render(<GameFlow initialGameState='completed' currentScore={80} />);
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('best-score')).toHaveTextContent('200');
    expect(screen.getByTestId('current-score')).toHaveTextContent('80');
  });

  it('displays best score of 0 on first game completion with no prior record', () => {
    mockGetItem.mockReturnValue(null);
    render(<GameFlow initialGameState='completed' currentScore={30} />);
    expect(mockSetItem).toHaveBeenCalledWith('bestScore', '30');
    expect(screen.getByTestId('best-score')).toHaveTextContent('30');
  });

  it('renders both score elements with accessible labels for screen readers', () => {
    mockGetItem.mockReturnValue('100');
    render(<GameFlow initialGameState='completed' currentScore={50} />);
    const bestScoreEl = screen.getByTestId('best-score');
    const currentScoreEl = screen.getByTestId('current-score');
    expect(bestScoreEl).toHaveAttribute('aria-label');
    expect(currentScoreEl).toHaveAttribute('aria-label');
  });
});
