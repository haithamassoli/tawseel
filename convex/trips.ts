import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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

// Shared shape for the public driver fields we attach to trips. Mirrors
// users.getUserPublic so clients see a consistent driver object. searchTrips
// omits `vehicle` (list view); getTrip includes it (detail view).
async function driverPublic(
  ctx: QueryCtx,
  driverId: Id<'users'>,
): Promise<{
  name: string | null;
  ratingAvg: number;
  ratingCount: number;
  vehicle: { make: string; color: string; plate: string } | null;
}> {
  const driver = await ctx.db.get(driverId);
  if (driver === null) {
    return { name: null, ratingAvg: 0, ratingCount: 0, vehicle: null };
  }
  return {
    name: driver.name ?? null,
    ratingAvg: driver.ratingAvg,
    ratingCount: driver.ratingCount,
    vehicle: driver.vehicle ?? null,
  };
}

/**
 * Create a trip offered by the signed-in driver.
 * Derives driverId from the auth session (never trusts a client-supplied id).
 * Seeds seatsAvailable = seatsTotal and status = 'open'.
 */
export const createTrip = mutation({
  args: {
    originGov: GOV,
    destGov: GOV,
    departAt: v.number(),
    originArea: v.optional(v.string()),
    destArea: v.optional(v.string()),
    stops: v.optional(v.array(v.string())),
    seatsTotal: v.number(),
    pricePerSeat: v.number(),
    bookingMode: v.union(v.literal('instant'), v.literal('approve')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'trips'>> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }

    if (!Number.isInteger(args.seatsTotal) || args.seatsTotal <= 0) {
      throw new Error('seatsTotal must be an integer greater than 0');
    }
    if (args.pricePerSeat < 0) {
      throw new Error('pricePerSeat must be 0 or greater');
    }
    if (args.originGov === args.destGov) {
      throw new Error('originGov and destGov must be different');
    }
    if (args.departAt <= Date.now()) {
      throw new Error('departAt must be in the future');
    }

    return await ctx.db.insert('trips', {
      driverId: userId,
      originGov: args.originGov,
      destGov: args.destGov,
      departAt: args.departAt,
      originArea: args.originArea,
      destArea: args.destArea,
      stops: args.stops,
      seatsTotal: args.seatsTotal,
      seatsAvailable: args.seatsTotal,
      pricePerSeat: args.pricePerSeat,
      bookingMode: args.bookingMode,
      status: 'open',
      note: args.note,
    });
  },
});

/**
 * Search open, future-dated trips for a route, newest-departing last
 * (ascending departAt). Optional `date` (ms epoch anywhere within the target
 * calendar day) restricts results to that local day. Each result carries the
 * driver's public info (name + rating).
 */
export const searchTrips = query({
  args: {
    originGov: GOV,
    destGov: GOV,
    date: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<'trips'> & {
      driver: { name: string | null; ratingAvg: number; ratingCount: number };
    })[]
  > => {
    const now = Date.now();

    // Index lookup only (no .filter()): originGov + destGov + status='open'.
    const trips = await ctx.db
      .query('trips')
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
    const filtered = trips
      .filter(t => t.departAt >= now)
      .filter(t =>
        dayStart === null || dayEnd === null
          ? true
          : t.departAt >= dayStart && t.departAt < dayEnd,
      )
      .sort((a, b) => a.departAt - b.departAt);

    // Join each trip with its driver's public fields (list view: no vehicle).
    return await Promise.all(
      filtered.map(async (t) => {
        const driver = await driverPublic(ctx, t.driverId);
        return {
          ...t,
          driver: {
            name: driver.name,
            ratingAvg: driver.ratingAvg,
            ratingCount: driver.ratingCount,
          },
        };
      }),
    );
  },
});

/**
 * Fetch a single trip plus its driver's public info (detail view: includes
 * vehicle). Returns null if the trip does not exist.
 */
export const getTrip = query({
  args: { tripId: v.id('trips') },
  handler: async (
    ctx,
    args,
  ): Promise<
    | (Doc<'trips'> & {
      driver: {
        name: string | null;
        ratingAvg: number;
        ratingCount: number;
        vehicle: { make: string; color: string; plate: string } | null;
      };
    })
    | null
  > => {
    const trip = await ctx.db.get(args.tripId);
    if (trip === null) {
      return null;
    }
    const driver = await driverPublic(ctx, trip.driverId);
    return { ...trip, driver };
  },
});
