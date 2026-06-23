import { releaseSeats, reserveSeats } from '../../../convex/lib/seats';

describe('seat accounting', () => {
  it('reserves seats and stays open', () => {
    expect(reserveSeats(3, 1)).toEqual({ seatsAvailable: 2, status: 'open' });
  });
  it('reserving the last seat marks the trip full', () => {
    expect(reserveSeats(2, 2)).toEqual({ seatsAvailable: 0, status: 'full' });
  });
  it('throws when not enough seats', () => {
    expect(() => reserveSeats(1, 2)).toThrow();
  });
  it('throws on non-positive or non-integer seats', () => {
    expect(() => reserveSeats(3, 0)).toThrow();
    expect(() => reserveSeats(3, 1.5)).toThrow();
  });
  it('releasing seats reopens a full trip', () => {
    expect(releaseSeats(0, 1, 4)).toEqual({ seatsAvailable: 1, status: 'open' });
  });
  it('releasing never exceeds seatsTotal', () => {
    expect(releaseSeats(3, 5, 4)).toEqual({ seatsAvailable: 4, status: 'open' });
  });
});
