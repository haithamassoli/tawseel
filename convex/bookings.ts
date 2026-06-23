import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { releaseSeats, reserveSeats } from './lib/seats';
import { recordNotification } from './notifications';

async function requireUser(ctx: MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error('Not authenticated');
  }
  return userId;
}

/**
 * Passenger books seats on a trip.
 * - instant mode: booking is `confirmed` and seats are reserved now.
 * - approve mode: booking is `pending`; no seats held until the driver approves.
 */
export const bookTrip = mutation({
  args: { tripId: v.id('trips'), seats: v.number() },
  handler: async (ctx, args): Promise<Id<'bookings'>> => {
    const passengerId = await requireUser(ctx);
    if (!Number.isInteger(args.seats) || args.seats <= 0) {
      throw new Error('seats must be an integer greater than 0');
    }
    const trip = await ctx.db.get(args.tripId);
    if (trip === null) {
      throw new Error('Trip not found');
    }
    if (trip.driverId === passengerId) {
      throw new Error('You cannot book your own trip');
    }
    if (trip.status !== 'open') {
      throw new Error('This trip is not open for booking');
    }

    if (trip.bookingMode === 'instant') {
      const next = reserveSeats(trip.seatsAvailable, args.seats);
      await ctx.db.patch(trip._id, next);
      return await ctx.db.insert('bookings', {
        tripId: trip._id,
        passengerId,
        seats: args.seats,
        status: 'confirmed',
      });
    }

    // approve mode: pending, no seat hold.
    // ponytail: a passenger can create multiple pending bookings on one trip;
    // dedupe only if it becomes a problem.
    const bookingId = await ctx.db.insert('bookings', {
      tripId: trip._id,
      passengerId,
      seats: args.seats,
      status: 'pending',
    });
    const m = await recordNotification(ctx, {
      userId: trip.driverId,
      type: 'booking_pending',
      tripId: trip._id,
      bookingId,
    });
    if (m) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        messages: [m],
      });
    }
    return bookingId;
  },
});

/** Driver approves a pending booking: re-checks seats, reserves, confirms. */
export const approveBooking = mutation({
  args: { bookingId: v.id('bookings') },
  handler: async (ctx, args): Promise<null> => {
    const driverId = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null) {
      throw new Error('Booking not found');
    }
    const trip = await ctx.db.get(booking.tripId);
    if (trip === null) {
      throw new Error('Trip not found');
    }
    if (trip.driverId !== driverId) {
      throw new Error('Only the driver can approve this booking');
    }
    if (booking.status !== 'pending') {
      throw new Error('Only pending bookings can be approved');
    }
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      throw new Error('This trip is no longer active');
    }
    // Re-check seats at approval time. Convex serializes writes per document, so
    // concurrent approvals on the last seat resolve via OCC retry (re-reads
    // seatsAvailable); reserveSeats throws if short.
    const next = reserveSeats(trip.seatsAvailable, booking.seats);
    await ctx.db.patch(trip._id, next);
    await ctx.db.patch(booking._id, { status: 'confirmed' });
    const m = await recordNotification(ctx, {
      userId: booking.passengerId,
      type: 'booking_confirmed',
      tripId: trip._id,
      bookingId: booking._id,
    });
    if (m) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        messages: [m],
      });
    }
    return null;
  },
});

/** Driver rejects a pending booking. No seat change (pending held nothing). */
export const rejectBooking = mutation({
  args: { bookingId: v.id('bookings') },
  handler: async (ctx, args): Promise<null> => {
    const driverId = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null) {
      throw new Error('Booking not found');
    }
    const trip = await ctx.db.get(booking.tripId);
    if (trip === null) {
      throw new Error('Trip not found');
    }
    if (trip.driverId !== driverId) {
      throw new Error('Only the driver can reject this booking');
    }
    if (booking.status !== 'pending') {
      throw new Error('Only pending bookings can be rejected');
    }
    await ctx.db.patch(booking._id, { status: 'rejected' });
    const m = await recordNotification(ctx, {
      userId: booking.passengerId,
      type: 'booking_rejected',
      tripId: trip._id,
      bookingId: booking._id,
    });
    if (m) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        messages: [m],
      });
    }
    return null;
  },
});

/** Either party cancels before completion. Releases seats if was confirmed. */
export const cancelBooking = mutation({
  args: { bookingId: v.id('bookings') },
  handler: async (ctx, args): Promise<null> => {
    const userId = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null) {
      throw new Error('Booking not found');
    }
    const trip = await ctx.db.get(booking.tripId);
    if (trip === null) {
      throw new Error('Trip not found');
    }
    if (booking.passengerId !== userId && trip.driverId !== userId) {
      throw new Error('You cannot cancel this booking');
    }
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new Error('This booking can no longer be cancelled');
    }
    if (booking.status === 'confirmed') {
      const released = releaseSeats(
        trip.seatsAvailable,
        booking.seats,
        trip.seatsTotal,
      );
      // Only reopen seats on a still-active trip; never resurrect a
      // completed/cancelled trip back to open/full.
      const status
        = trip.status === 'open' || trip.status === 'full'
          ? released.status
          : trip.status;
      await ctx.db.patch(trip._id, {
        seatsAvailable: released.seatsAvailable,
        status,
      });
    }
    await ctx.db.patch(booking._id, { status: 'cancelled' });
    return null;
  },
});

/**
 * Passenger's bookings (newest first) with a trip summary + driver name.
 * PHONE REVEAL: driverPhone is non-null ONLY when the booking is `confirmed`.
 */
export const myBookingsAsPassenger = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    // ponytail: cap at 100; paginate if a user ever exceeds 100 bookings.
    const bookings = await ctx.db
      .query('bookings')
      .withIndex('by_passenger', q => q.eq('passengerId', userId))
      .order('desc')
      .take(100);

    return await Promise.all(
      bookings.map(async (b) => {
        const trip = await ctx.db.get(b.tripId);
        const driver = trip ? await ctx.db.get(trip.driverId) : null;
        const revealed = b.status === 'confirmed';
        return {
          _id: b._id,
          status: b.status,
          seats: b.seats,
          trip: trip
            ? {
                _id: trip._id,
                originGov: trip.originGov,
                destGov: trip.destGov,
                departAt: trip.departAt,
                pricePerSeat: trip.pricePerSeat,
                status: trip.status,
              }
            : null,
          driverName: driver?.name ?? null,
          driverPhone: revealed ? driver?.phone ?? null : null,
        };
      }),
    );
  },
});

/**
 * Driver's trips (newest first), each with its bookings + passenger name.
 * PHONE REVEAL: passengerPhone is non-null ONLY when the booking is `confirmed`.
 */
export const myTripsWithBookings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    // ponytail: cap trips + bookings-per-trip at 100 each; paginate later.
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_driver', q => q.eq('driverId', userId))
      .order('desc')
      .take(100);

    return await Promise.all(
      trips.map(async (t) => {
        const rows = await ctx.db
          .query('bookings')
          .withIndex('by_trip', q => q.eq('tripId', t._id))
          .take(100);
        const bookings = await Promise.all(
          rows.map(async (b) => {
            const passenger = await ctx.db.get(b.passengerId);
            const revealed = b.status === 'confirmed';
            return {
              _id: b._id,
              status: b.status,
              seats: b.seats,
              passengerName: passenger?.name ?? null,
              passengerPhone: revealed ? passenger?.phone ?? null : null,
            };
          }),
        );
        return { trip: t, bookings };
      }),
    );
  },
});
