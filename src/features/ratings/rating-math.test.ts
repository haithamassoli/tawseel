import { addRating } from '../../../convex/lib/ratings';

describe('rating accounting', () => {
  it('first rating sets the average to that rating', () => {
    expect(addRating(0, 0, 5)).toEqual({ ratingAvg: 5, ratingCount: 1 });
  });
  it('second rating averages the two', () => {
    expect(addRating(5, 1, 3)).toEqual({ ratingAvg: 4, ratingCount: 2 });
  });
  it('converges to a non-integer average', () => {
    // (4 avg over 2) + a 5 -> (4*2 + 5) / 3 = 13/3 = 4.333...
    const next = addRating(4, 2, 5);
    expect(next.ratingCount).toBe(3);
    expect(next.ratingAvg).toBeCloseTo(4.3333333);
  });
  it('throws on out-of-range or non-integer stars', () => {
    expect(() => addRating(0, 0, 0)).toThrow();
    expect(() => addRating(0, 0, 6)).toThrow();
    expect(() => addRating(0, 0, 2.5)).toThrow();
  });
});
