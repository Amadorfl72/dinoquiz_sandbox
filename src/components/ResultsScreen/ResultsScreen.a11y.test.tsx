import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ResultsScreen } from './ResultsScreen';

expect.extend(toHaveNoViolations);

describe('ResultsScreen accessibility', () => {
  const mockOnPlayAgain = jest.fn();

  it.each([0, 3, 4, 6, 7, 8, 9, 10])(
    'has no accessibility violations for score %i',
    async (score) => {
      const { container } = render(<ResultsScreen score={score} onPlayAgain={mockOnPlayAgain} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  );
});
