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

## M1 — Foundation & app shell
**Goal:** a user can sign up, log in, and navigate a localized RTL shell on device.

- [ ] Init Convex; wire `ConvexProvider` + client in app root; set `EXPO_PUBLIC_CONVEX_URL`.
- [ ] Write `convex/schema.ts`: `GOV` union + `users`, `trips`, `rideRequests`, `bookings`, `ratings` tables with all PRD indexes.
- [ ] Set up Convex Auth Password provider keyed on phone; signup writes minimal `users` profile (`name`, `phone`, `ratingAvg=0`, `ratingCount=0`).
- [ ] `getCurrentUser` helper resolving auth identity → `users` row for queries/mutations.
- [ ] Signup screen (phone, password, name) — TanStack Form + Zod.
- [ ] Login screen (phone, password) — TanStack Form + Zod.
- [ ] Auth gate: unauthenticated → auth stack, authenticated → tabs; persist session.
- [ ] Force RTL + Arabic default; `ar.json`/`en.json` with shared keys; localized governorate labels keyed off `GOV`.
- [ ] Language toggle (ar/en) in profile.
- [ ] Tab navigation skeleton (Find, Post, Request, Activity, Profile) with placeholder screens.
- [ ] Profile screen: name, phone, optional vehicle fields, logout.
- [ ] Request notification permission, obtain Expo push token, store on `users.pushToken`.
- [ ] Send one test push to validate Expo/EAS credentials.

**Exit:** sign up with phone+password on device, land in a fully RTL Arabic shell, push token persisted.

---

## M2 — Driver trips & browse
**Goal:** supply exists and is discoverable.

- [ ] `createTrip` mutation: validate (seats>0, price≥0, origin≠dest, depart in future); set `seatsAvailable=seatsTotal`, `status=open`.
- [ ] Post-a-trip form: route pickers, datetime, seats, price, booking mode, optional area/stops/note.
- [ ] `searchTrips` query by route + date via `by_route_status` (status=open), time window filtered in JS.
- [ ] Find-a-ride screen: origin/dest governorate pickers + date → results list.
- [ ] Trip card component (route, time, price, seats, driver name + rating).
- [ ] `getTrip` query (with driver profile + vehicle) + Trip detail screen.

**Exit:** one user posts a trip; another finds it by route+date and opens its detail.

---

## M3 — Bookings (core loop)
**Goal:** the first complete marketplace loop.

- [ ] `bookTrip` mutation: instant → `confirmed` (decrement seats, full check); approve → `pending` (no seat hold).
- [ ] `approveBooking` mutation: re-check `seatsAvailable≥seats`, decrement, `full`/`open` transition.
- [ ] `rejectBooking` mutation: no seat change.
- [ ] `cancelBooking` mutation: release seats if was confirmed; `full`→`open`.
- [ ] Book action on Trip detail with seat-count selector, respecting booking mode.
- [ ] "My activity" — driver view: my trips + pending bookings with approve/reject.
- [ ] "My activity" — passenger view: my bookings + status.
- [ ] Phone reveal: counterpart phone exposed only when booking `confirmed` (query-side guard + UI).

**Exit:** passenger books, driver approves, both see phone numbers, seat counts move correctly including the last-seat race.

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
