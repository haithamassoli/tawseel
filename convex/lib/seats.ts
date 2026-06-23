// Pure seat-accounting transitions for trips. No Convex imports, so the logic
// can be unit-tested with plain Jest (see src/features/trips/seat-math.test.ts).
// convex/bookings.ts calls these, then patches the trip document.

type OpenOrFull = { seatsAvailable: number; status: 'open' | 'full' };

/**
 * Seats after confirming `seats` on a trip that currently has `available` left.
 * Throws if seats are non-positive or exceed availability (callers surface the
 * error to the user). Derives status: 0 left -> 'full', otherwise 'open'.
 */
export function reserveSeats(available: number, seats: number): OpenOrFull {
  if (!Number.isInteger(seats) || seats <= 0) {
    throw new Error('seats must be an integer greater than 0');
  }
  if (seats > available) {
    throw new Error('Not enough seats available');
  }
  const next = available - seats;
  return { seatsAvailable: next, status: next === 0 ? 'full' : 'open' };
}

/**
 * Seats after releasing `seats` back to a trip (cancel/reject of a CONFIRMED
 * booking), capped at `seatsTotal` so it can never exceed capacity. A trip that
 * was 'full' becomes 'open' as soon as a seat frees up.
 */
export function releaseSeats(
  available: number,
  seats: number,
  seatsTotal: number,
): OpenOrFull {
  const next = Math.min(seatsTotal, available + seats);
  return { seatsAvailable: next, status: next === 0 ? 'full' : 'open' };
}
