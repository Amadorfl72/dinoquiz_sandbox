/**
 * Utilidades de almacenamiento local para DinoQuiz.
 * Maneja de forma elegante los casos en los que localStorage
 * no está disponible (modo privado, almacenamiento lleno, etc.)
 * y valida que los valores sean numéricos antes de usarlos.
 */

const BEST_SCORE_KEY = 'dinoquiz_bestScore';

/**
 * Comprueba si localStorage está disponible y funcional.
 * En algunos navegadores (modo privado de Safari) puede existir
 * el objeto pero lanzar al escribir.
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    const testKey = '__dinoquiz_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene la mejor puntuación guardada en localStorage.
 * Retorna 0 si no hay valor previo, si el valor no es numérico
 * o si localStorage no está disponible.
 * @returns {number} mejor puntuación (entero ≥ 0)
 */
export function getBestScore() {
  if (!isLocalStorageAvailable()) {
    return 0;
  }

  const raw = localStorage.getItem(BEST_SCORE_KEY);

  // Si no existe valor previo, retornar valor por defecto
  if (raw === null || raw === undefined) {
    return 0;
  }

  // Parsear con radix explícito y validar que sea un número válido
  const parsed = parseInt(raw, 10);

  // Si el valor almacenado no es numérico (manipulación manual, corrupción),
 // retornar 0 en lugar de NaN para evitar comparaciones erróneas
  if (Number.isNaN(parsed)) {
    return 0;
  }

  // Asegurar que no sea negativo
  return Math.max(0, parsed);
}

/**
 * Guarda la mejor puntuación en localStorage.
 * No lanza errores si el almacenamiento no está disponible;
 * la app sigue funcionando sin persistencia.
 * @param {number} score - puntuación a guardar
 * @returns {boolean} true si se guardó correctamente, false si no
 */
export function setBestScore(score) {
  // Validar que score sea numérico antes de guardar
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) {
    return false;
  }

  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(numericScore)));
    return true;
  } catch {
    // Almacenamiento lleno o deshabilitado: degradar elegantemente
    return false;
  }
}

/**
 * Compara la puntuación actual con la mejor guardada y, si es mayor,
 * actualiza localStorage y retorna información sobre el resultado.
 *
 * Lógica:
 *   1. Obtener bestScore de localStorage (con validación numérica)
 *   2. Asegurar que currentScore sea numérico
 *   3. Si currentScore > bestScore: guardar y marcar como nueva mejor
 *   4. Si no: omitir mensaje (no actualizar)
 *
 * @param {number} currentScore - puntuación de la partida recién terminada
 * @returns {{ isNewBestScore: boolean, bestScore: number, currentScore: number }}
 */
export function evaluateBestScore(currentScore) {
  // Asegurar que currentScore sea numérico
  const numericCurrentScore = parseInt(currentScore, 10);

  // Si currentScore no es numérico, no actualizar nada
  if (Number.isNaN(numericCurrentScore)) {
    return {
      isNewBestScore: false,
      bestScore: getBestScore(),
      currentScore: 0,
    };
  }

  const storedBestScore = getBestScore();

  // CRÍTICO: la comparación debe ser currentScore > bestScore (no invertida)
  if (numericCurrentScore > storedBestScore) {
    const saved = setBestScore(numericCurrentScore);
    // Solo marcar como nueva mejor si se guardó correctamente
    return {
      isNewBestScore: saved,
      bestScore: saved ? numericCurrentScore : storedBestScore,
      currentScore: numericCurrentScore,
    };
  }

  // La puntuación actual no supera la mejor: omitir mensaje
  return {
    isNewBestScore: false,
    bestScore: storedBestScore,
    currentScore: numericCurrentScore,
  };
}

export { BEST_SCORE_KEY };
