import type { DataModel } from './_generated/dataModel';
import { Password } from '@convex-dev/auth/providers/Password';

import { convexAuth } from '@convex-dev/auth/server';

/**
 * Phone-based password auth for the ride app.
 *
 * IMPORTANT — why a synthetic email:
 * The installed @convex-dev/auth Password provider (v0.0.94) hardcodes the
 * auth account identifier to `profile().email` and passes
 * `shouldLinkViaPhone: false`. It cannot key the password account on a phone
 * field directly. So we use the documented ACCEPTABLE FALLBACK: the UI collects
 * a phone number, and we derive a synthetic, internal account id email of the
 * form `${phone}@phone.local`. The real phone is also stored on users.phone so
 * the rest of the app can use it.
 *
 * No SMS / OTP / phone verification is performed (no `verify` or `reset` email
 * provider is configured), per M1 scope.
 *
 * The sign-in params we expect from the client (passed to `signIn("password", …)`):
 *   - flow: "signUp" | "signIn"
 *   - phone: string   (e.g. "+9627…")
 *   - password: string
 *   - name: string    (required on signUp; collected in the sign-up form)
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Build the user document created on sign-up from the provided params.
      // Convex Auth creates the users row from this return value, so every
      // REQUIRED users field (ratingAvg, ratingCount) MUST be present here.
      profile(params) {
        const phone = params.phone as string;
        return {
          // Synthetic account id email — NOT shown to users, used only so the
          // Password provider has a stable account identifier keyed on phone.
          email: `${phone}@phone.local`,
          phone,
          name: params.name as string,
          ratingAvg: 0,
          ratingCount: 0,
        };
      },
    }),
  ],
});
