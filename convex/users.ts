import type { Doc } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * The signed-in user's full document, or null if not authenticated.
 * Never trusts a client-supplied id — derives identity from the auth session.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<Doc<'users'> | null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

/**
 * Store/refresh the Expo push token for the current user.
 * Throws if the caller is not authenticated.
 */
export const updatePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    await ctx.db.patch(userId, { pushToken: args.token });
    return null;
  },
});

/**
 * Public, safe-to-share profile fields for any user (e.g. a trip's driver).
 * Returns null if the user does not exist. Never exposes phone/email/pushToken.
 */
export const getUserPublic = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user === null) {
      return null;
    }
    return {
      name: user.name ?? null,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      vehicle: user.vehicle ?? null,
    };
  },
});
