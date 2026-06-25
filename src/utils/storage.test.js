import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBestScore,
  setBestScore,
  evaluateBestScore,
  BEST_SCORE_KEY,
} from './storage';

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getBestScore', () => {
    it('retorna 0 cuando no hay valor previo en localStorage', () => {
      expect(getBestScore()).toBe(0);
    });

    it('retorna el valor numérico guardado', () => {
      localStorage.setItem(BEST_SCORE_KEY, '7');
      expect(getBestScore()).toBe(7);
    });

    it('retorna 0 cuando el valor almacenado no es numérico', () => {
      localStorage.setItem(BEST_SCORE_KEY, 'not-a-number');
      expect(getBestScore()).toBe(0);
    });

    it('retorna 0 cuando el valor es null (manipulación)', () => {
      localStorage.setItem(BEST_SCORE_KEY, 'null');
      expect(getBestScore()).toBe(0);
    });

    it('no retorna valores negativos', () => {
      localStorage.setItem(BEST_SCORE_KEY, '-5');
      expect(getBestScore()).toBe(0);
    });
  });

  describe('setBestScore', () => {
    it('guarda el valor numérico en localStorage', () => {
      const result = setBestScore(8);
      expect(result).toBe(true);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('8');
    });

    it('no guarda valores no numéricos', () => {
      const result = setBestScore('not-a-number');
      expect(result).toBe(false);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBeNull();
    });

    it('trunca decimales al guardar', () => {
      setBestScore(7.9);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('7');
    });
  });

  describe('evaluateBestScore', () => {
    it('marca como nueva mejor cuando currentScore > bestScore', () => {
      localStorage.setItem(BEST_SCORE_KEY, '5');
      const result = evaluateBestScore(7);
      expect(result.isNewBestScore).toBe(true);
      expect(result.bestScore).toBe(7);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('7');
    });

    it('NO marca como nueva mejor cuando currentScore === bestScore', () => {
      localStorage.setItem(BEST_SCORE_KEY, '7');
      const result = evaluateBestScore(7);
      expect(result.isNewBestScore).toBe(false);
      expect(result.bestScore).toBe(7);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('7');
    });

    it('NO marca como nueva mejor cuando currentScore < bestScore', () => {
      localStorage.setItem(BEST_SCORE_KEY, '8');
      const result = evaluateBestScore(3);
      expect(result.isNewBestScore).toBe(false);
      expect(result.bestScore).toBe(8);
      // localStorage no debe haberse actualizado
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('8');
    });

    it('marca como nueva mejor cuando no hay valor previo (score > 0)', () => {
      const result = evaluateBestScore(5);
      expect(result.isNewBestScore).toBe(true);
      expect(result.bestScore).toBe(5);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('5');
    });

    it('no marca como nueva mejor cuando no hay valor previo y score es 0', () => {
      const result = evaluateBestScore(0);
      expect(result.isNewBestScore).toBe(false);
      expect(result.bestScore).toBe(0);
    });

    it('maneja currentScore como string numérico', () => {
      localStorage.setItem(BEST_SCORE_KEY, '3');
      const result = evaluateBestScore('6');
      expect(result.isNewBestScore).toBe(true);
      expect(result.bestScore).toBe(6);
    });

    it('no actualiza cuando currentScore no es numérico', () => {
      localStorage.setItem(BEST_SCORE_KEY, '5');
      const result = evaluateBestScore('invalid');
      expect(result.isNewBestScore).toBe(false);
      expect(result.bestScore).toBe(5);
      expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('5');
    });

    it('no actualiza cuando el valor almacenado es corrupto', () => {
      localStorage.setItem(BEST_SCORE_KEY, 'corrupt');
      const result = evaluateBestScore(3);
      // bestScore se trata como 0, así que 3 > 0 = nueva mejor
      expect(result.isNewBestScore).toBe(true);
      expect(result.bestScore).toBe(3);
    });
  });
});
