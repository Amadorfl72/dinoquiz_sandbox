export function getStarCount(score: number, totalQuestions: number): 1 | 2 | 3 {
  const ratio = totalQuestions > 0 ? score / totalQuestions : 0;

  if (ratio > 0.6) return 3;
  if (ratio > 0.3) return 2;
  return 1;
}
