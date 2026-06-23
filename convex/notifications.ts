import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internalAction, mutation, query } from './_generated/server';

export type NotifType
  = | 'match_passenger'
    | 'match_driver'
    | 'booking_pending'
    | 'booking_confirmed'
    | 'booking_rejected'
    | 'trip_completed'
    | 'new_rating';

// Push text is Arabic (app is Arabic-first). The in-app Notifications screen
// renders its OWN localized text from `type` via i18n — this map is ONLY for the
// ephemeral push payload.
// ponytail: per-user-language push needs storing the user's locale; Arabic-only for MVP.
const PUSH_TEXT: Record<NotifType, { title: string; body: string }> = {
  match_passenger: { title: 'راكب محتمل', body: 'يوجد راكب محتمل على مسارك' },
  match_driver: { title: 'سائق محتمل', body: 'يوجد سائق محتمل لرحلتك' },
  booking_pending: { title: 'طلب حجز جديد', body: 'لديك طلب حجز جديد بانتظار الموافقة' },
  booking_confirmed: { title: 'تم تأكيد الحجز', body: 'تم تأكيد حجزك. رقم الهاتف ظاهر الآن.' },
  booking_rejected: { title: 'تم رفض الحجز', body: 'عذراً، تم رفض طلب حجزك' },
  trip_completed: { title: 'اكتملت الرحلة', body: 'اكتملت رحلتك. قيّم سائقك من نشاطي.' },
  new_rating: { title: 'تقييم جديد', body: 'لقد حصلت على تقييم جديد' },
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: {
    type: NotifType;
    tripId?: Id<'trips'>;
    requestId?: Id<'rideRequests'>;
    bookingId?: Id<'bookings'>;
  };
};

/**
 * Insert an in-app notification row for `userId` and, if that user has a push
 * token, return a ready-to-send Expo push message (else null). Plain helper that
 * shares the caller's mutation transaction — call it from a mutation, collect the
 * non-null returns, and schedule `internal.notifications.sendPush` ONCE.
 */
export async function recordNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    type: NotifType;
    tripId?: Id<'trips'>;
    requestId?: Id<'rideRequests'>;
    bookingId?: Id<'bookings'>;
  },
): Promise<PushMessage | null> {
  await ctx.db.insert('notifications', {
    userId: args.userId,
    type: args.type,
    tripId: args.tripId,
    requestId: args.requestId,
    bookingId: args.bookingId,
    read: false,
  });
  const user = await ctx.db.get(args.userId);
  if (!user?.pushToken) {
    return null;
  }
  const t = PUSH_TEXT[args.type];
  return {
    to: user.pushToken,
    title: t.title,
    body: t.body,
    data: {
      type: args.type,
      tripId: args.tripId,
      requestId: args.requestId,
      bookingId: args.bookingId,
    },
  };
}

/** Send a batch of Expo push messages. Scheduled from mutations; never call directly. */
export const sendPush = internalAction({
  args: {
    messages: v.array(
      v.object({
        to: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.any(),
      }),
    ),
  },
  handler: async (_ctx, args): Promise<null> => {
    // ponytail: Expo accepts up to 100 messages/request; send the first 100 and
    // log overflow. Add chunking + receipt polling only if delivery issues appear.
    const batch = args.messages.slice(0, 100);
    if (batch.length === 0) {
      return null;
    }
    if (args.messages.length > 100) {
      console.warn(
        `sendPush: dropping ${args.messages.length - 100} messages over the 100 cap`,
      );
    }
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(batch),
      });
      // ponytail: if Expo "Enhanced Push Security" is enabled, add
      // `Authorization: Bearer <EXPO_ACCESS_TOKEN>`. Off by default.
    }
    catch (e) {
      console.error('sendPush failed', e);
    }
    return null;
  },
});

/**
 * The recipient's notifications, newest first, each enriched with the route
 * (originGov/destGov) of its related trip or request so the client can render a
 * one-line summary without extra round-trips.
 */
export const myNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    // ponytail: cap at the 100 newest; paginate if a user ever exceeds 100.
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc')
      .take(100);

    return await Promise.all(
      rows.map(async (n) => {
        let route: { originGov: string; destGov: string } | null = null;
        if (n.tripId) {
          const trip = await ctx.db.get(n.tripId);
          route = trip
            ? { originGov: trip.originGov, destGov: trip.destGov }
            : null;
        }
        else if (n.requestId) {
          const request = await ctx.db.get(n.requestId);
          route = request
            ? { originGov: request.originGov, destGov: request.destGov }
            : null;
        }
        return {
          _id: n._id,
          type: n.type,
          read: n.read,
          createdAt: n._creationTime,
          tripId: n.tripId ?? null,
          requestId: n.requestId ?? null,
          route,
        };
      }),
    );
  },
});

/** Mark the signed-in user's notifications as read. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    // ponytail: marks up to the 100 newest; fine for MVP.
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(100);
    for (const row of rows) {
      if (row.read === false) {
        await ctx.db.patch(row._id, { read: true });
      }
    }
    return null;
  },
});
