// Pure rating-average accounting. No Convex imports, so it can be unit-tested
// with plain Jest (see src/features/ratings/rating-math.test.ts).
// convex/ratings.ts calls this, then patches the ratee's users document.

/**
 * The ratee's running average + count after adding one new `stars` rating to a
 * current (avg, count). Throws on an out-of-range or non-integer star value
 * (callers surface the error). Uses the incremental mean so we never re-scan
 * every past rating: newAvg = (avg*count + stars) / (count+1).
 */
export function addRating(
  avg: number,
  count: number,
  stars: number,
): { ratingAvg: number; ratingCount: number } {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('stars must be an integer from 1 to 5');
  }
  const ratingCount = count + 1;
  const ratingAvg = (avg * count + stars) / ratingCount;
  return { ratingAvg, ratingCount };
}
