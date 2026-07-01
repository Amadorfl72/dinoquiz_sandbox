import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NewBestScoreToast } from '../NewBestScoreToast';

expect.extend(toHaveNoViolations);

describe('NewBestScoreToast accessibility (TRIOFSND-45)', () => {
  it('has no axe violations when visible', async () => {
    const { container } = render(
      <NewBestScoreToast visible={true} onDismiss={jest.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is announced politely without interrupting screen reader users', () => {
    render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).not.toHaveAttribute('aria-live', 'assertive');
  });

  it('is not focusable so it does not steal focus from the results actions', () => {
    render(<NewBestScoreToast visible={true} onDismiss={jest.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).not.toHaveAttribute('tabindex');
    expect(toast).not.toHaveAttribute('tabindex', '0');
  });
});
