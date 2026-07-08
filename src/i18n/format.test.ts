import { formatString } from './format';

describe('formatString', () => {
  it('replaces known placeholders with values', () => {
    expect(formatString('Puntuación: {score} de {total}', { score: 7, total: 10 })).toBe(
      'Puntuación: 7 de 10'
    );
  });

  it('leaves unknown placeholders untouched', () => {
    expect(formatString('Hola {name}', {})).toBe('Hola {name}');
  });
});
