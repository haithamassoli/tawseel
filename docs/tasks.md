# Servees Jordan — Milestones & Tasks

Derived from `PRD.md`. Milestones are shippable vertical slices; tasks are the checklist under each.

**Conventions** (apply to every task, not repeated below): Convex reactive hooks (`useQuery`/`useMutation`) for Convex data — not React Query; TanStack Form + Zod for forms; `@/` absolute imports; read `convex/_generated/ai/guidelines.md` before writing Convex functions.

| # | Milestone | Closes | Depends on |
|---|---|---|---|
| M1 | Foundation & app shell | Can a user exist and move around? | — |
| M2 | Driver trips & browse | Can supply be posted and found? | M1 |
| M3 | Bookings (core loop) | Can a seat be booked end-to-end? | M2 |
| M4 | Requests, matching & notifications | Does the novel match push work both ways? | M3 |
| M5 | Completion & ratings | Does a trip close and build reputation? | M3 |
| M6 | Launch hardening | Is it shippable? | M4, M5 |

**Ordering principle:** foundations and expensive cross-cutting choices (RTL, auth, push tokens) first; the basic post→find→book loop proves the data model before the novel matching layer is built on top.

---

## M1 — Foundation & app shell ✅
**Goal:** a user can sign up, log in, and navigate a localized RTL shell on device.

- [x] Init Convex; wire `ConvexAuthProvider` + client in app root; set `EXPO_PUBLIC_CONVEX_URL`.
- [x] Write `convex/schema.ts`: `GOV` union + `users`, `trips`, `rideRequests`, `bookings`, `ratings` tables with all PRD indexes.
- [x] Set up Convex Auth Password provider keyed on phone; signup writes minimal `users` profile (`name`, `phone`, `ratingAvg=0`, `ratingCount=0`).
- [x] `getCurrentUser` helper resolving auth identity → `users` row for queries/mutations.
- [x] Signup screen (phone, password, name) — TanStack Form + Zod.
- [x] Login screen (phone, password) — TanStack Form + Zod.
- [x] Auth gate: unauthenticated → auth stack, authenticated → tabs; persist session.
- [x] Force RTL + Arabic default; `ar.json`/`en.json` with shared keys; localized governorate labels keyed off `GOV`.
- [x] Language toggle (ar/en) — in Settings tab (existing language-item).
- [x] Tab navigation skeleton + Profile tab. *(Tabs are still the template's demo Feed/Style/Settings; the Find/Post/Request/Activity tabs land in M2–M4.)*
- [x] Profile screen: name, phone, rating, optional vehicle fields, logout.
- [x] Push permission + obtain Expo push token, store on `users.pushToken` (`<PushTokenSync/>`).
- [ ] Send one test push to validate Expo/EAS credentials — *deferred: needs a physical device + dev build (see runtime notes).*

**Exit:** sign up with phone+password on device, land in a fully RTL Arabic shell, push token persisted.

> **Status:** Implemented & verified — `type-check`, `lint`, `lint:translations` green; Convex schema + phone Password auth deployed to the `tawseel` dev deployment. Native rebuild + on-device sign-in/push verification still pending (see runtime steps).

---

## M2 — Driver trips & browse ✅
**Goal:** supply exists and is discoverable.

- [x] `createTrip` mutation: validate (seats>0, price≥0, origin≠dest, depart in future); set `seatsAvailable=seatsTotal`, `status=open`. → `convex/trips.ts`
- [x] Post-a-trip form: route pickers, datetime, seats, price, booking mode, optional area/stops/note. → `src/features/trips/post-trip-screen.tsx` + `(app)/post-trip.tsx` tab
- [x] `searchTrips` query by route + date via `by_route_status` (status=open), time window filtered in JS.
- [x] Find-a-ride screen: origin/dest governorate pickers + date → results list. → `src/features/trips/find-screen.tsx` (home/index tab)
- [x] Trip card component (route, time, price, seats, driver name + rating). → `src/features/trips/components/trip-card.tsx`
- [x] `getTrip` query (with driver profile + vehicle) + Trip detail screen. → `src/features/trips/trip-detail-screen.tsx` + `src/app/trip/[id].tsx`

**Exit:** one user posts a trip; another finds it by route+date and opens its detail.

> **Status:** Implemented & verified — `type-check`, `lint`, `lint:translations` green; 40/40 tests pass. Tabs restructured to **Find / Post / Settings / Profile**; demo template removed (`features/feed`, `app/feed`, `features/style-demo`, `(app)/style.tsx`, `lib/api` + React Query `APIProvider`). Added dep `@react-native-community/datetimepicker`. **Runtime pending:** run `npx convex dev` to deploy `convex/trips.ts` to the `tawseel` deployment, and rebuild the native app (datetimepicker is a native module) for on-device post→find→detail verification.

---

## M3 — Bookings (core loop) ✅
**Goal:** the first complete marketplace loop.

- [x] `bookTrip` mutation: instant → `confirmed` (decrement seats, full check); approve → `pending` (no seat hold). → `convex/bookings.ts`
- [x] `approveBooking` mutation: re-check `seatsAvailable≥seats`, decrement, `full`/`open` transition. → `convex/bookings.ts`
- [x] `rejectBooking` mutation: no seat change. → `convex/bookings.ts`
- [x] `cancelBooking` mutation: release seats if was confirmed; `full`→`open` (guarded so completed/cancelled trips aren't resurrected). → `convex/bookings.ts`
- [x] Book action on Trip detail with seat-count selector, respecting booking mode (own-trip + full guards). → `src/features/trips/trip-detail-screen.tsx`
- [x] "My activity" — driver view: my trips + pending bookings with approve/reject. → `convex/bookings.ts` `myTripsWithBookings` + `src/features/trips/activity-screen.tsx` (Activity tab)
- [x] "My activity" — passenger view: my bookings + status. → `convex/bookings.ts` `myBookingsAsPassenger` + same screen
- [x] Phone reveal: counterpart phone exposed only when booking `confirmed` (query-side guard + UI). → `driverPhone`/`passengerPhone` returned `null` unless `confirmed`

**Exit:** passenger books, driver approves, both see phone numbers, seat counts move correctly including the last-seat race.

> **Status:** Implemented & verified — `type-check`, `lint` (0 errors), `lint:translations` green; **46/46 tests pass** (6 suites, incl. new `seat-math.test.ts`). Seat accounting extracted to a pure, unit-tested helper (`convex/lib/seats.ts`); the last-seat race relies on Convex per-document OCC re-reading `seatsAvailable` at approve time. Added a new **Activity** tab + localized `trips.status.*` and booking-status labels (ar/en). **Runtime pending:** run `npx convex dev` to deploy `convex/bookings.ts` to the `tawseel` deployment for on-device book→approve→phone-reveal verification (`npx convex codegen` already updated local types).

---

## M4 — Requests, matching & notifications ✅
**Goal:** the novel cross-matching layer.

- [x] `createRideRequest` mutation: validate, `status=open`, return inline matches. → `convex/requests.ts`
- [x] Matching helper: query opposite-type open records on `by_route_status` within `MATCH_WINDOW_MS` (+ seats check vs trips). → pure `convex/lib/matching.ts` (`tripMatchesRequest`, ±90 min + seats), unit-tested
- [x] On insert (trip or request), schedule push to the pre-existing party in both directions; creator sees matches inline. → `createRideRequest` (match_passenger) + `createTrip` edit (match_driver)
- [x] Push-sending Convex action → Expo push API (match + booking-status payloads). → `convex/notifications.ts` `sendPush` internalAction; booking pushes wired into `convex/bookings.ts`
- [x] Request-a-ride form + result screen showing inline matched trips. → `src/features/requests/request-form-screen.tsx` (+ `/request-ride` route, link on Find)
- [x] `acceptRequest` mutation: create trip (`seatsTotal=request.seats`, driver-entered price/time) + `confirmed` booking linked to request; request → `matched`. → `convex/requests.ts`
- [x] Driver "open requests on my route" view + Accept flow (enter price, confirm time). → `browse-requests-screen.tsx` (`/open-requests`, link on Post) + `request-detail-screen.tsx` (`/request/[id]`)
- [x] In-app Notifications screen (match + booking events). → `convex/notifications.ts` `myNotifications`/`markAllRead` + `src/features/notifications/notifications-screen.tsx` (Notifications tab)

**Exit:** posting a request notifies matching drivers and vice versa (each pair once); a driver accepts a request and it becomes a confirmed booking.

> **Status:** Implemented & verified — `type-check` (0), `lint` (0 errors), `lint:translations` (clean), **51/51 tests pass** (7 suites, incl. new `matching.test.ts`). Matching is a pure, unit-tested helper (`tripMatchesRequest`: ±90 min window + seat check); each (trip,request) pair is evaluated once at the second insert (no stored match table). Push text is Arabic-only in the backend; the in-app **Notifications** tab renders localized text client-side from the notification `type`. Instant bookings notify the driver via the live Activity tab (no push) per PRD scope. New `notifications` table + `by_user` index added to the schema. Concurrent accept of the same request is resolved by Convex per-document OCC (re-reads `status` at accept). **Runtime pending:** run `npx convex dev` to deploy `convex/{requests,notifications}.ts` + the new table to the `tawseel` deployment; on-device push delivery needs a physical device + dev build (`npx convex codegen` already updated local types).

---

## M5 — Completion & ratings ✅
**Goal:** trips close and reputation accrues.

- [x] `completeTrip` mutation: trip → `completed`, its confirmed bookings → `completed`. → `convex/trips.ts` (driver-only, active-only guard; notifies each confirmed passenger via `trip_completed`)
- [x] `rateBooking` mutation: 1–5 + optional comment; enforce one-per-rater-per-booking via `by_booking`; update ratee `ratingAvg`/`ratingCount`. → `convex/ratings.ts` + pure `convex/lib/ratings.ts` (`addRating`, incremental mean, unit-tested)
- [x] "Mark completed" action in driver activity. → `src/features/trips/activity-screen.tsx` (`DriverTripCard`)
- [x] Rate screen post-completion for both parties. → `src/features/ratings/rate-screen.tsx` (+ `/rate/[id]` route) + `convex/ratings.ts` `getRateContext`; Rate buttons on completed bookings in both Activity views
- [x] Show rating avg + count on profile and trip detail/cards. → already implemented in M2 (`profile-screen.tsx`, `trip-card.tsx`, `trip-detail-screen.tsx`) via `profile.rating_value`; verified still rendering, no change
- [x] In-app surfacing (badges) for completion + new-rating events. → two new notification types (`trip_completed`, `new_rating`) flow through the existing Notifications tab (unread dot + localized `type_*` labels)

**Exit:** a full trip completes and both parties rate each other; averages update on their profiles.

> **Status:** Implemented & verified — `type-check` (0), `lint` (0 errors), `lint:translations` (clean, 213 keys ×2 identical), **55/55 tests pass** (8 suites, incl. new `rating-math.test.ts`). The rating-average recompute is a pure, unit-tested helper (`addRating`: incremental mean, throws on out-of-range/non-integer). `rateBooking` is the trust boundary — re-verifies party membership, completed status, 1–5 integer, and one-per-rater (via `by_booking`) before writing; concurrent ratings of the same ratee resolve by Convex per-document OCC. `getRateContext` is an advisory read (never exposes phone). Completion notifies confirmed passengers; rating notifies the ratee; both surface as unread badges on the Notifications tab. Rating display on profile/detail/cards was already shipped in M2. **Runtime pending:** run `npx convex dev` to deploy `convex/{ratings,trips,notifications,schema}.ts` (new `ratings` functions + 2 notification literals) to the `tawseel` deployment; on-device push delivery needs a physical device + dev build (`npx convex codegen` already updated local types).

---

## M6 — Launch hardening
**Goal:** production-ready.

- [x] Audit all mutations for boundary validation (seats>0, price≥0, origin≠dest, future depart) with clear errors. → audited all 12 mutations in `convex/{trips,bookings,requests,ratings,users,notifications}.ts`; every applicable PRD boundary is already enforced with a clear thrown `Error`. **0 changes needed.**
- [x] Verify cancellation + seat-release edge cases end-to-end (incl. cancel after `full`). → `cancelBooking` releases seats only on `confirmed`, flips `full`→`open`, and never resurrects a completed/cancelled trip; pure `releaseSeats` helper now has edge-case tests (release-from-`full`→`open`, increment-stay-`open`, never exceed `seatsTotal`). Non-confirmed-no-op lives in the mutation gate (verified by reading; DB-level exercise belongs to device QA / a future convex-test suite).
- [x] Empty/loading/error states across all screens. → audited all 8 query-backed screens + 4 forms; loading (`undefined`→spinner), empty (localized message), and error (`showErrorMessage`) states all present. One genuine gap fixed: `profile-screen.tsx` logout had an unhandled rejection → now `try/catch` + `auth.logout_error` (both locales).
- [x] Configure bundle IDs / app config / icon / splash (`env.ts`, `app.config.ts`). → verified launch-ready: distinct bundle IDs/packages/schemes per env (production unsuffixed), all referenced icon/splash/adaptive/favicon assets exist, EAS projectId + `updates.url` consistent. **0 changes needed.**
- [ ] EAS production build profiles (iOS + Android); resolve push credentials (APNs/FCM). → **profiles verified ✓** (`eas.json`: production AAB + preview APK + development + simulator; channels/distribution/env set; submit profiles present). **Push credentials (APNs/FCM) still need your Apple/Google accounts — runtime.**
- [ ] End-to-end QA pass of all PRD flows on device; prepare store assets. → **needs a physical device + creative assets (screenshots, descriptions, privacy URL) — runtime.**
- [x] `npm run check-all` green (lint, type-check, test). → green: lint 0 errors (1 pre-existing `_layout.tsx` warning), type-check clean, `lint:translations` clean, **56/56 tests** (8 suites).

**Exit:** production EAS build passes, all PRD flows verified on device, ready for TestFlight / Play internal.

> **Status:** Code & config hardening complete and **independently verified** — `npm run check-all` green (lint 0 errors, type-check clean, translations clean, **56/56 tests**, 8 suites). Ran as a 3-agent `/workflows` audit (backend validation / frontend states / release config, in parallel) under a strict "fix genuine gaps only" discipline, then I re-ran every gate and read every diff myself. Findings: the backend was already fully validated (**0 convex changes** — every PRD boundary enforced at every applicable mutation, matching an independent pre-audit read); added one seat-release edge-case test (+1 → 56); fixed one genuine frontend gap (profile logout error handling); `env.ts`/`app.config.ts`/`eas.json` + assets verified launch-ready (**0 config changes**). **Release execution pending (needs you — not doable in a headless session):** resolve push credentials (APNs/FCM), run the EAS production build, on-device QA of all PRD flows, prepare store-listing assets. Also still pending from M1–M5: `npx convex dev` to deploy the backend to the `tawseel` deployment.
