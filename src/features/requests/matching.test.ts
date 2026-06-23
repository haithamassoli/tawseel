import {
  isWithinWindow,
  MATCH_WINDOW_MS,
  tripMatchesRequest,
} from '../../../convex/lib/matching';

// Fixed base timestamp (do NOT call Date.now() so the test is deterministic).
const T = 1_700_000_000_000;

describe('trip ↔ request matching', () => {
  it('exact same time matches when seats are ok', () => {
    expect(
      tripMatchesRequest(
        { departAt: T, seatsAvailable: 3 },
        { desiredAt: T, seats: 1 },
      ),
    ).toBe(true);
  });

  it('matches at the +90min boundary but not just over it', () => {
    expect(
      tripMatchesRequest(
        { departAt: T + MATCH_WINDOW_MS, seatsAvailable: 3 },
        { desiredAt: T, seats: 1 },
      ),
    ).toBe(true);
    expect(
      tripMatchesRequest(
        { departAt: T + MATCH_WINDOW_MS + 1, seatsAvailable: 3 },
        { desiredAt: T, seats: 1 },
      ),
    ).toBe(false);
  });

  it('matches within -90min', () => {
    expect(
      tripMatchesRequest(
        { departAt: T - MATCH_WINDOW_MS, seatsAvailable: 3 },
        { desiredAt: T, seats: 1 },
      ),
    ).toBe(true);
  });

  it('respects seat availability even when the time matches', () => {
    // seatsAvailable === seats -> true.
    expect(
      tripMatchesRequest(
        { departAt: T, seatsAvailable: 2 },
        { desiredAt: T, seats: 2 },
      ),
    ).toBe(true);
    // seatsAvailable < seats -> false (time matches).
    expect(
      tripMatchesRequest(
        { departAt: T, seatsAvailable: 1 },
        { desiredAt: T, seats: 2 },
      ),
    ).toBe(false);
  });

  it('isWithinWindow is true at exactly the window and false at window+1', () => {
    expect(isWithinWindow(T, T + MATCH_WINDOW_MS)).toBe(true);
    expect(isWithinWindow(T, T + MATCH_WINDOW_MS + 1)).toBe(false);
  });
});
