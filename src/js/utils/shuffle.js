/**
 * Fisher–Yates shuffle (in-place on a copy).
 * @param {Array<*>} arr
 * @returns {Array<*>} a new shuffled array
 */
export function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
