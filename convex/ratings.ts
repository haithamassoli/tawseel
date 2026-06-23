import type { Doc } from './_generated/dataModel';

import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { addRating } from './lib/ratings';
import { recordNotification } from './notifications';

/**
 * Either party rates the other after a completed trip. This is the trust
 * boundary, so it re-verifies everything itself (getRateContext is advisory):
 * caller must be a party to the booking, the booking must be completed, stars
 * must be 1..5, and each rater may rate a given booking only once.
 */
export const rateBooking = mutation({
  args: {
    bookingId: v.id('bookings'),
    stars: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const rater = await getAuthUserId(ctx);
    if (rater === null) {
      throw new Error('Not authenticated');
    }
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null) {
      throw new Error('Booking not found');
    }
    const trip = await ctx.db.get(booking.tripId);
    if (trip === null) {
      throw new Error('Trip not found');
    }
    const isPassenger = booking.passengerId === rater;
    const isDriver = trip.driverId === rater;
    if (!isPassenger && !isDriver) {
      throw new Error('You are not part of this booking');
    }
    if (booking.status !== 'completed') {
      throw new Error('You can only rate a completed trip');
    }
    if (!Number.isInteger(args.stars) || args.stars < 1 || args.stars > 5) {
      throw new Error('stars must be an integer from 1 to 5');
    }
    // One rating per rater per booking. ponytail: scan up to 10 ratings on this
    // booking (a booking has at most 2 raters) instead of a composite index.
    const existing = await ctx.db
      .query('ratings')
      .withIndex('by_booking', q => q.eq('bookingId', booking._id))
      .take(10);
    if (existing.some(r => r.raterId === rater)) {
      throw new Error('You already rated this trip');
    }
    const rateeId = isPassenger ? trip.driverId : booking.passengerId;
    await ctx.db.insert('ratings', {
      bookingId: booking._id,
      raterId: rater,
      rateeId,
      stars: args.stars,
      comment: args.comment,
    });

    // Update the ratee's running average. Convex serializes writes per document,
    // so concurrent ratings of the same ratee resolve via OCC retry (each re-reads
    // ratingAvg/ratingCount before patching).
    const ratee = await ctx.db.get(rateeId);
    if (ratee !== null) {
      const next = addRating(ratee.ratingAvg, ratee.ratingCount, args.stars);
      await ctx.db.patch(ratee._id, next);
    }

    const m = await recordNotification(ctx, {
      userId: rateeId,
      type: 'new_rating',
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

/**
 * Read-only context the rate screen needs: the counterpart's name, the route,
 * and whether the signed-in user has already rated. Never exposes phone. Returns
 * null if the user is not signed in or not a party to the booking. Advisory only:
 * rateBooking re-checks everything before writing.
 */
export const getRateContext = query({
  args: { bookingId: v.id('bookings') },
  handler: async (
    ctx,
    args,
  ): Promise<{
    status: Doc<'bookings'>['status'];
    counterpartName: string | null;
    originGov: Doc<'trips'>['originGov'];
    destGov: Doc<'trips'>['destGov'];
    alreadyRated: boolean;
    canRate: boolean;
  } | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const booking = await ctx.db.get(args.bookingId);
    if (booking === null) {
      return null;
    }
    const trip = await ctx.db.get(booking.tripId);
    if (trip === null) {
      return null;
    }
    const isPassenger = booking.passengerId === userId;
    const isDriver = trip.driverId === userId;
    if (!isPassenger && !isDriver) {
      return null;
    }
    const counterpartId = isPassenger ? trip.driverId : booking.passengerId;
    const counterpart = await ctx.db.get(counterpartId);
    const ratings = await ctx.db
      .query('ratings')
      .withIndex('by_booking', q => q.eq('bookingId', booking._id))
      .take(10);
    const alreadyRated = ratings.some(r => r.raterId === userId);
    return {
      status: booking.status,
      counterpartName: counterpart?.name ?? null,
      originGov: trip.originGov,
      destGov: trip.destGov,
      alreadyRated,
      canRate: booking.status === 'completed' && !alreadyRated,
    };
  },
});
