import { ConvexReactClient } from 'convex/react';
import Env from 'env';

/**
 * Shared Convex client for the app. Created once at module load.
 * `unsavedChangesWarning` is a web-only concept; disable it for React Native.
 */
export const convex = new ConvexReactClient(Env.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});
