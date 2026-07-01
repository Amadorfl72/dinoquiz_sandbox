import React from 'react';
import { render, screen } from '@testing-library/react';
import BestScoreMessage from '../BestScoreMessage';

describe('BestScoreMessage Component', () => {
  it('should display the new best score message when isNewBest is true', () => {
    render(<BestScoreMessage isNewBest={true} score={500} />);
    
    expect(screen.getByText(/new best score/i)).toBeInTheDocument();
  });

  it('should NOT display the new best score message when isNewBest is false', () => {
    render(<BestScoreMessage isNewBest={false} score={500} />);
    
    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
  });

  it('should NOT display the new best score message on a tie (TRIOFSND-48)', () => {
    // Simulating a tie scenario where the score equals the best score
    // The component should receive isNewBest={false} from the parent
    render(<BestScoreMessage isNewBest={false} score={500} bestScore={500} />);
    
    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
  });

  it('should NOT display the new best score message when score is lower than best score', () => {
    render(<BestScoreMessage isNewBest={false} score={100} bestScore={500} />);
    
    expect(screen.queryByText(/new best score/i)).not.toBeInTheDocument();
  });
});