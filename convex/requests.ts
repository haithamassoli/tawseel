import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { PushMessage } from './notifications';

import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { tripMatchesRequest } from './lib/matching';
import { recordNotification } from './notifications';

// 12 Jordanian governorates. Re-declared here to keep this file self-contained
// and mirror exactly the GOV validator in convex/schema.ts (the schema declares
// it as a non-exported local const). Keeping the literal sets in sync is
// required; if this list ever drifts from schema.ts, inserts/queries break.
const GOV = v.union(
  v.literal('amman'),
  v.literal('irbid'),
  v.literal('zarqa'),
  v.literal('balqa'),
  v.literal('mafraq'),
  v.literal('jerash'),
  v.literal('ajloun'),
  v.literal('madaba'),
  v.literal('karak'),
  v.literal('tafilah'),
  v.literal('maan'),
  v.literal('aqaba'),
);

async function requireUser(ctx: MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error('Not authenticated');
  }
  return userId;
}

// Public, phone-free profile fields. Used both for the passenger attached to a
// request and (same shape) for the driver attached to a matched trip — so the
// client renders a consistent person object in either direction.
async function passengerPublic(
  ctx: QueryCtx,
  id: Id<'users'>,
): Promise<{ name: string | null; ratingAvg: number; ratingCount: number }> {
  const user = await ctx.db.get(id);
  if (user === null) {
    return { name: null, ratingAvg: 0, ratingCount: 0 };
  }
  return {
    name: user.name ?? null,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
  };
}

// Driver public join for matched trips: identical shape to passengerPublic so
// the client renders the same person object regardless of direction.
const driverPublic = passengerPublic;

/**
 * Create a ride request from the signed-in passenger, then eagerly find open
 * trips already on the route that match (±90 min, enough seats). Each matching
 * driver gets a `match_passenger` notification, and the matched trips are
 * returned shaped exactly like a searchTrips item so the client can render
 * <TripCard/> immediately.
 */
export const createRideRequest = mutation({
  args: {
    originGov: GOV,
    destGov: GOV,
    desiredAt: v.number(),
    originArea: v.optional(v.string()),
    destArea: v.optional(v.string()),
    seats: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<'trips'> & {
      driver: { name: string | null; ratingAvg: number; ratingCount: number };
    })[]
  > => {
    const passengerId = await requireUser(ctx);

    if (!Number.isInteger(args.seats) || args.seats <= 0) {
      throw new Error('seats must be an integer greater than 0');
    }
    if (args.originGov === args.destGov) {
      throw new Error('originGov and destGov must be different');
    }
    if (args.desiredAt <= Date.now()) {
      throw new Error('desiredAt must be in the future');
    }

    const requestId = await ctx.db.insert('rideRequests', {
      passengerId,
      originGov: args.originGov,
      destGov: args.destGov,
      desiredAt: args.desiredAt,
      originArea: args.originArea,
      destArea: args.destArea,
      seats: args.seats,
      status: 'open',
      note: args.note,
    });

    // Index lookup only (no .filter()): open trips already on this exact route.
    // ponytail: .collect() is bounded per governorate-pair for MVP (mirrors searchTrips).
    const trips = await ctx.db
      .query('trips')
      .withIndex('by_route_status', q =>
        q
          .eq('originGov', args.originGov)
          .eq('destGov', args.destGov)
          .eq('status', 'open'))
      .collect();

    const matched = trips.filter(t =>
      tripMatchesRequest(t, { desiredAt: args.desiredAt, seats: args.seats }),
    );

    const messages: PushMessage[] = [];
    for (const t of matched) {
      const m = await recordNotification(ctx, {
        userId: t.driverId,
        type: 'match_passenger',
        tripId: t._id,
        requestId,
      });
      if (m) {
        messages.push(m);
      }
    }
    if (messages.length) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        messages,
      });
    }

    // Return matched trips shaped exactly like a searchTrips item (driver public,
    // name + rating only), ascending by departAt so the soonest is first.
    const sorted = matched.sort((a, b) => a.departAt - b.departAt);
    return await Promise.all(
      sorted.map(async (t) => {
        const driver = await driverPublic(ctx, t.driverId);
        return { ...t, driver };
      }),
    );
  },
});

/**
 * Drivers browse open, future-dated ride requests on a route (mirror of
 * searchTrips). Optional `date` (ms epoch anywhere within the target calendar
 * day) restricts results to that local day. Each result carries the passenger's
 * public info (name + rating).
 */
export const searchRideRequests = query({
  args: {
    originGov: GOV,
    destGov: GOV,
    date: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<'rideRequests'> & {
      passenger: {
        name: string | null;
        ratingAvg: number;
        ratingCount: number;
      };
    })[]
  > => {
    const now = Date.now();

    // Index lookup only (no .filter()): originGov + destGov + status='open'.
    // ponytail: .collect() is bounded per governorate-pair for MVP (mirrors searchTrips).
    const requests = await ctx.db
      .query('rideRequests')
      .withIndex('by_route_status', q =>
        q
          .eq('originGov', args.originGov)
          .eq('destGov', args.destGov)
          .eq('status', 'open'))
      .collect();

    // Compute optional [startOfDay, nextDay) window from the provided ms epoch.
    let dayStart: number | null = null;
    let dayEnd: number | null = null;
    if (args.date !== undefined) {
      const d = new Date(args.date);
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      dayStart = start;
      dayEnd = start + 24 * 60 * 60 * 1000;
    }

    // JS-side filtering: future only, and within the chosen day if given.
    const filtered = requests
      .filter(r => r.desiredAt >= now)
      .filter(r =>
        dayStart === null || dayEnd === null
          ? true
          : r.desiredAt >= dayStart && r.desiredAt < dayEnd,
      )
      .sort((a, b) => a.desiredAt - b.desiredAt);

    return await Promise.all(
      filtered.map(async (r) => {
        const passenger = await passengerPublic(ctx, r.passengerId);
        return { ...r, passenger };
      }),
    );
  },
});

/**
 * Fetch a single ride request plus its passenger's public info. Never exposes
 * phone. Returns null if the request does not exist.
 */
export const getRideRequest = query({
  args: { requestId: v.id('rideRequests') },
  handler: async (
    ctx,
    args,
  ): Promise<
    | (Doc<'rideRequests'> & {
      passenger: {
        name: string | null;
        ratingAvg: number;
        ratingCount: number;
      };
    })
    | null
  > => {
    const request = await ctx.db.get(args.requestId);
    if (request === null) {
      return null;
    }
    const passenger = await passengerPublic(ctx, request.passengerId);
    return { ...request, passenger };
  },
});

/** The signed-in passenger's own ride requests, newest first. */
export const myRideRequests = query({
  args: {},
  handler: async (ctx): Promise<Doc<'rideRequests'>[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    // ponytail: cap at 100; paginate if a user ever exceeds 100 requests.
    return await ctx.db
      .query('rideRequests')
      .withIndex('by_passenger', q => q.eq('passengerId', userId))
      .order('desc')
      .take(100);
  },
});

/**
 * A driver accepts a ride request: creates a trip dedicated to it (already full,
 * seatsAvailable = 0), a confirmed booking linking request → trip, marks the
 * request 'matched', and notifies the passenger their booking is confirmed
 * (phone now revealed). Returns the new trip id.
 */
export const acceptRequest = mutation({
  args: {
    requestId: v.id('rideRequests'),
    pricePerSeat: v.number(),
    departAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<'trips'>> => {
    const driverId = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (request === null) {
      throw new Error('Request not found');
    }
    if (request.status !== 'open') {
      throw new Error('This request is no longer open');
    }
    if (request.passengerId === driverId) {
      throw new Error('You cannot accept your own request');
    }
    if (args.pricePerSeat < 0) {
      throw new Error('pricePerSeat must be 0 or greater');
    }
    if (args.departAt <= Date.now()) {
      throw new Error('departAt must be in the future');
    }

    const tripId = await ctx.db.insert('trips', {
      driverId,
      originGov: request.originGov,
      destGov: request.destGov,
      departAt: args.departAt,
      originArea: request.originArea,
      destArea: request.destArea,
      stops: undefined,
      seatsTotal: request.seats,
      seatsAvailable: 0,
      pricePerSeat: args.pricePerSeat,
      bookingMode: 'instant',
      status: 'full',
      note: undefined,
    });
    const bookingId = await ctx.db.insert('bookings', {
      tripId,
      passengerId: request.passengerId,
      requestId: request._id,
      seats: request.seats,
      status: 'confirmed',
    });
    await ctx.db.patch(request._id, { status: 'matched' });

    const m = await recordNotification(ctx, {
      userId: request.passengerId,
      type: 'booking_confirmed',
      tripId,
      bookingId,
    });
    if (m) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        messages: [m],
      });
    }

    return tripId;
  },
});

/** Passenger cancels their own still-open ride request. */
export const cancelRideRequest = mutation({
  args: { requestId: v.id('rideRequests') },
  handler: async (ctx, args): Promise<null> => {
    const userId = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (request === null) {
      throw new Error('Request not found');
    }
    if (request.passengerId !== userId) {
      throw new Error('You cannot cancel this request');
    }
    if (request.status !== 'open') {
      // ponytail: matched requests are cancelled via their booking, which releases seats.
      throw new Error('Only open requests can be cancelled');
    }
    await ctx.db.patch(request._id, { status: 'cancelled' });
    return null;
  },
});
