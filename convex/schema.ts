import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// 12 Jordanian governorates. Reused by trips and rideRequests.
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

export default defineSchema({
  // Spread all Convex Auth system tables (authSessions, authAccounts,
  // authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits,
  // and the default users table) ...
  ...authTables,
  // ... then OVERRIDE the users table so it keeps every authTables user field
  // (so Convex Auth keeps working) plus our app-specific fields. All authTables
  // user fields stay optional. We re-declare the email + phone indexes that the
  // default authTables.users had, because overriding the table replaces its
  // index set too.
  users: defineTable({
    // --- authTables.users fields (must be preserved, all optional) ---
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // --- app fields ---
    pushToken: v.optional(v.string()),
    vehicle: v.optional(
      v.object({
        make: v.string(),
        color: v.string(),
        plate: v.string(),
      }),
    ),
    // Required: every newly created user gets these seeded to 0 by the auth
    // provider's profile() (see convex/auth.ts). Kept required so reads never
    // have to null-check; if profile() ever stops returning them, make these
    // v.optional instead.
    ratingAvg: v.number(),
    ratingCount: v.number(),
  })
    // Convex Auth's account-linking looks up users by email; keep this index.
    .index('email', ['email'])
    // Required by the task; also lets us look users up by phone number.
    .index('phone', ['phone']),

  trips: defineTable({
    driverId: v.id('users'),
    originGov: GOV,
    destGov: GOV,
    departAt: v.number(),
    originArea: v.optional(v.string()),
    destArea: v.optional(v.string()),
    stops: v.optional(v.array(v.string())),
    seatsTotal: v.number(),
    seatsAvailable: v.number(),
    pricePerSeat: v.number(),
    bookingMode: v.union(v.literal('instant'), v.literal('approve')),
    status: v.union(
      v.literal('open'),
      v.literal('full'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    note: v.optional(v.string()),
  })
    .index('by_route_status', ['originGov', 'destGov', 'status'])
    .index('by_driver', ['driverId']),

  rideRequests: defineTable({
    passengerId: v.id('users'),
    originGov: GOV,
    destGov: GOV,
    desiredAt: v.number(),
    originArea: v.optional(v.string()),
    destArea: v.optional(v.string()),
    seats: v.number(),
    status: v.union(
      v.literal('open'),
      v.literal('matched'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    note: v.optional(v.string()),
  })
    .index('by_route_status', ['originGov', 'destGov', 'status'])
    .index('by_passenger', ['passengerId']),

  bookings: defineTable({
    tripId: v.id('trips'),
    passengerId: v.id('users'),
    requestId: v.optional(v.id('rideRequests')),
    seats: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('confirmed'),
      v.literal('rejected'),
      v.literal('cancelled'),
      v.literal('completed'),
    ),
  })
    .index('by_trip', ['tripId'])
    .index('by_passenger', ['passengerId']),

  ratings: defineTable({
    bookingId: v.id('bookings'),
    raterId: v.id('users'),
    rateeId: v.id('users'),
    stars: v.number(),
    comment: v.optional(v.string()),
  })
    .index('by_ratee', ['rateeId'])
    .index('by_booking', ['bookingId']),

  notifications: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('match_passenger'),
      v.literal('match_driver'),
      v.literal('booking_pending'),
      v.literal('booking_confirmed'),
      v.literal('booking_rejected'),
      v.literal('trip_completed'),
      v.literal('new_rating'),
    ),
    tripId: v.optional(v.id('trips')),
    requestId: v.optional(v.id('rideRequests')),
    bookingId: v.optional(v.id('bookings')),
    read: v.boolean(),
  }).index('by_user', ['userId']),
});
