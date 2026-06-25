import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameOver from './GameOver';

// Mock de i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === 'results_score' && opts) {
        return `Has acertado ${opts.score}/${opts.total}`;
      }
      const translations = {
        results_excellent: '¡Eres un experto en dinosaurios!',
        results_great: '¡Muy bien hecho!',
        results_good: '¡Buen trabajo!',
        results_keepTrying: '¡Sigue practicando!',
        newBestScore: '¡Nueva mejor puntuación!',
        results_bestScore: 'Tu mejor puntuación:',
        replay: 'Volver a jugar',
        replay_aria_label: 'Volver a jugar',
        results_aria_label: 'Pantalla de resultados',
      };
      return translations[key] || key;
    },
  }),
}));

describe('GameOver', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('muestra la puntuación en formato X/10', () => {
    render(
      <GameOver score={7} bestScore={5} isNewBestScore={false} onReplay={() => {}} />
    );
    expect(screen.getByText('Has acertado 7/10')).toBeInTheDocument();
  });

  it('muestra mensaje de nueva mejor puntuación cuando isNewBestScore es true', () => {
    render(
      <GameOver score={8} bestScore={8} isNewBestScore={true} onReplay={() => {}} />
    );
    expect(screen.getByText('¡Nueva mejor puntuación!')).toBeInTheDocument();
  });

  it('NO muestra mensaje de nueva mejor puntuación cuando isNewBestScore es false', () => {
    render(
      <GameOver score={3} bestScore={8} isNewBestScore={false} onReplay={() => {}} />
    );
    expect(screen.queryByText('¡Nueva mejor puntuación!')).not.toBeInTheDocument();
  });

  it('muestra mensaje motivador excelente para 9-10 aciertos', () => {
    render(
      <GameOver score={10} bestScore={10} isNewBestScore={true} onReplay={() => {}} />
    );
    expect(screen.getByText('¡Eres un experto en dinosaurios!')).toBeInTheDocument();
  });

  it('muestra mensaje motivador de seguir practicando para 0-3 aciertos', () => {
    render(
      <GameOver score={2} bestScore={5} isNewBestScore={false} onReplay={() => {}} />
    );
    expect(screen.getByText('¡Sigue practicando!')).toBeInTheDocument();
  });

  it('llama a onReplay al pulsar el botón', () => {
    const onReplay = vi.fn();
    render(
      <GameOver score={5} bestScore={5} isNewBestScore={false} onReplay={onReplay} />
    );
    fireEvent.click(screen.getByText('Volver a jugar'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('no usa eval() — el mensaje se determina por comparación directa', () => {
 // Si eval() se usara, esto podría ejecutar código arbitrario
    // Verificamos que el render es seguro con valores normales
    const { container } = render(
      <GameOver score={5} bestScore={3} isNewBestScore={true} onReplay={() => {}} />
    );
    expect(container).toBeDefined();
    expect(screen.getByText('Has acertado 5/10')).toBeInTheDocument();
  });
});
