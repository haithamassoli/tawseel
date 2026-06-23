import { useConvexAuth, useMutation } from 'convex/react';
import * as React from 'react';

import { api } from '../../../convex/_generated/api';
import { registerForPushNotificationsAsync } from './register';

/**
 * Mount once inside the authenticated tree (e.g. (app)/_layout.tsx).
 * Captures the Expo push token after auth and persists it via Convex.
 * Renders nothing.
 */
export function PushTokenSync() {
  const { isAuthenticated } = useConvexAuth();
  const updatePushToken = useMutation(api.users.updatePushToken);
  const syncedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isAuthenticated || syncedRef.current) {
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) {
        return;
      }
      try {
        await updatePushToken({ token });
        syncedRef.current = true;
      }
      catch {
        // Swallow; will retry on next mount/auth change.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, updatePushToken]);

  return null;
}
