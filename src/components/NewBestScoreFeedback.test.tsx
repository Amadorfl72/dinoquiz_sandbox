import React from 'react';
import { render } from '@testing-library/react-native';
import { NewBestScoreFeedback } from './NewBestScoreFeedback';

describe('TRIOFSND-45: NewBestScoreFeedback mini-feedback UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<NewBestScoreFeedback />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays the ¡Nueva mejor puntuación! feedback text', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });

  it('renders an accessible container for the feedback', () => {
    const { getByTestId } = render(<NewBestScoreFeedback />);
    const container = getByTestId('new-best-score-feedback');
    expect(container).toBeTruthy();
  });

  it('matches the snapshot', () => {
    const { toJSON } = render(<NewBestScoreFeedback />);
    expect(toJSON()).toMatchSnapshot();
  });
});
