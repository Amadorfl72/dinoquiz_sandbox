import React from 'react';
import { render } from '@testing-library/react';
import NewBestScoreFeedback from './NewBestScoreFeedback';

describe('NewBestScoreFeedback', () => {
  it('renders nothing when isNewBestScore is false', () => {
    const { container } = render(<NewBestScoreFeedback isNewBestScore={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders feedback message when isNewBestScore is true', () => {
    const { getByText } = render(<NewBestScoreFeedback isNewBestScore={true} />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });
});