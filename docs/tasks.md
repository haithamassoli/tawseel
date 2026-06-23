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

## M4 — Requests, matching & notifications
**Goal:** the novel cross-matching layer.

- [ ] `createRideRequest` mutation: validate, `status=open`, return inline matches.
- [ ] Matching helper: query opposite-type open records on `by_route_status` within `MATCH_WINDOW_MS` (+ seats check vs trips).
- [ ] On insert (trip or request), schedule push to the pre-existing party in both directions; creator sees matches inline.
- [ ] Push-sending Convex action → Expo push API (match + booking-status payloads).
- [ ] Request-a-ride form + result screen showing inline matched trips.
- [ ] `acceptRequest` mutation: create trip (`seatsTotal=request.seats`, driver-entered price/time) + `confirmed` booking linked to request; request → `matched`.
- [ ] Driver "open requests on my route" view + Accept flow (enter price, confirm time).
- [ ] In-app Notifications screen (match + booking events).

**Exit:** posting a request notifies matching drivers and vice versa (each pair once); a driver accepts a request and it becomes a confirmed booking.

---

## M5 — Completion & ratings
**Goal:** trips close and reputation accrues.

- [ ] `completeTrip` mutation: trip → `completed`, its confirmed bookings → `completed`.
- [ ] `rateBooking` mutation: 1–5 + optional comment; enforce one-per-rater-per-booking via `by_booking`; update ratee `ratingAvg`/`ratingCount`.
- [ ] "Mark completed" action in driver activity.
- [ ] Rate screen post-completion for both parties.
- [ ] Show rating avg + count on profile and trip detail/cards.
- [ ] In-app surfacing (badges) for completion + new-rating events.

**Exit:** a full trip completes and both parties rate each other; averages update on their profiles.

---

## M6 — Launch hardening
**Goal:** production-ready.

- [ ] Audit all mutations for boundary validation (seats>0, price≥0, origin≠dest, future depart) with clear errors.
- [ ] Verify cancellation + seat-release edge cases end-to-end (incl. cancel after `full`).
- [ ] Empty/loading/error states across all screens.
- [ ] Configure bundle IDs / app config / icon / splash (`env.ts`, `app.config.ts`).
- [ ] EAS production build profiles (iOS + Android); resolve push credentials (APNs/FCM).
- [ ] End-to-end QA pass of all PRD flows on device; prepare store assets.
- [ ] `npm run check-all` green (lint, type-check, test).

**Exit:** production EAS build passes, all PRD flows verified on device, ready for TestFlight / Play internal.
