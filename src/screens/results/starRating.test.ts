import { getStarCount } from './starRating';

describe('getStarCount', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [10, 3],
  ])('score %i out of 10 yields %i star(s)', (score, expectedStars) => {
    expect(getStarCount(score, 10)).toBe(expectedStars);
  });
});
