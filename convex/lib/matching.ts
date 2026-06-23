// Match window: a trip and a request match if their times are within ±90 min
// AND the trip has enough open seats. Pure logic so it is unit-testable.
export const MATCH_WINDOW_MS = 90 * 60 * 1000;

export function isWithinWindow(
  aMs: number,
  bMs: number,
  windowMs: number = MATCH_WINDOW_MS,
): boolean {
  return Math.abs(aMs - bMs) <= windowMs;
}

export function tripMatchesRequest(
  trip: { departAt: number; seatsAvailable: number },
  request: { desiredAt: number; seats: number },
  windowMs: number = MATCH_WINDOW_MS,
): boolean {
  return (
    isWithinWindow(trip.departAt, request.desiredAt, windowMs)
    && trip.seatsAvailable >= request.seats
  );
}
