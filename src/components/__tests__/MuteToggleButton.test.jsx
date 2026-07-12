import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MuteToggleButton from '../MuteToggleButton';

describe('MuteToggleButton', () => {
  test('renders with an accessible label reflecting the muted state', () => {
    render(<MuteToggleButton muted={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Silenciar sonido' })).toBeInTheDocument();
  });

  test('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    render(<MuteToggleButton muted={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('button has minimum touch target size of 48x48px', () => {
    render(<MuteToggleButton muted={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    expect(parseInt(styles.minWidth, 10)).toBeGreaterThanOrEqual(48);
    expect(parseInt(styles.minHeight, 10)).toBeGreaterThanOrEqual(48);
  });

  test('reflects muted state via aria-pressed', () => {
    render(<MuteToggleButton muted onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
