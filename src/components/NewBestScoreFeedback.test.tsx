import React from 'react';
import { render } from '@testing-library/react-native';
import NewBestScoreFeedback from './NewBestScoreFeedback';

describe('NewBestScoreFeedback Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<NewBestScoreFeedback />);
    expect(getByText('¡Nueva mejor puntuación!')).toBeTruthy();
  });
});