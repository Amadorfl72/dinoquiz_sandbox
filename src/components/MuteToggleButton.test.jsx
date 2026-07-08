import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MuteProvider } from '../audio/MuteContext';
import { MuteToggleButton } from './MuteToggleButton';

function renderButton() {
  return render(
    <MuteProvider>
      <MuteToggleButton />
    </MuteProvider>
  );
}

describe('MuteToggleButton', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to unmuted with the "Silenciar sonido" label', () => {
    renderButton();
    const button = screen.getByRole('button', { name: 'Silenciar sonido' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to the "Activar sonido" label and persists the muted state on click', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar sonido' }));
    const button = screen.getByRole('button', { name: 'Activar sonido' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('dinoquiz.audio.muted')).toBe('true');
  });

  it('toggles back to "Silenciar sonido" on a second click', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar sonido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar sonido' }));
    const button = screen.getByRole('button', { name: 'Silenciar sonido' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem('dinoquiz.audio.muted')).toBe('false');
  });
});
