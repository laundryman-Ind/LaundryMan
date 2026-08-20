# RIDER APP — BETA IMPLEMENTATION PHASE

> **Step-by-step build plan for the Rider App beta.**
>
> Every unchecked item from `list.md` that falls under the rider side, organized into build order.
> Mark each task `[x]` when it works on a physical device.

---

## OVERVIEW

The Rider App is the **second half** of the two-phone beta. Phone 1 (User App) is complete. Phone 2 runs the Rider App. The goal: a rider can log in, receive orders, accept them, drive the full order lifecycle (pickup → processing → delivery), and see earnings — all synced through Supabase.

**Stack:** React + Vite (same conventions as User App), Supabase (auth + DB + realtime), Capacitor for APK.

---

## BUILD ORDER

Work through these phases in order. Each phase is a logical chunk that can be tested on-device before moving on.

---

### PHASE A: FOUNDATION & AUTH

> Get the rider app bootable and authenticated on Phone 2.

#### A1. Rider Auth — Supabase Setup

- [ ] Add `is_rider` boolean column to `riders` table (or create `rider_auth` table mapping `auth.uid` → `rider_id`)
- [ ] Enable beta/test auth for riders (same pattern as user app: test phone `9749117663` = OTP `123456`, or a second test number)
- [ ] RLS policies: riders can read their own row, riders can update own `active`/`online` status

#### A2. Rider Login & OTP

- [ ] Login screen — phone number input (reuse `RIDER_APP/frontend/src/pages/Login.jsx`)
- [ ] OTP screen — 6-digit code input (reuse `RIDER_APP/frontend/src/pages/Otp.jsx`)
- [ ] Beta session creation (`createBetaSession`) for rider auth
- [ ] Test login on physical Phone 2

#### A3. Rider Name & Profile Setup

- [ ] Name entry screen (reuse `RIDER_APP/frontend/src/pages/Name.jsx` pattern)
- [ ] Insert rider profile row on first login
- [ ] Redirect to Dashboard after profile setup

#### A4. Rider Session Management

- [ ] Auto-recover session on app restart (`ensureSession` pattern from user app)
- [ ] Persist rider auth state in `RiderContext`
- [ ] Logout action

---

### PHASE B: RIDER DASHBOARD

> The rider's home screen — shows today's work at a glance.

#### B1. Dashboard Layout

- [ ] Rider home screen with header (rider name, photo)
- [ ] Online/offline toggle button (`OnlineToggle.jsx`)
- [ ] Today's stats card: active order, completed count, earnings
- [ ] Bottom navigation: Dashboard | Available | Trips | Earnings | Profile

#### B2. Online/Offline Status

- [ ] Toggle updates `riders.active` (or a new `online` column) in Supabase
- [ ] Offline riders should NOT receive new order assignments
- [ ] Persist online state across app restarts

#### B3. Active Order Card

- [ ] If rider has an in-progress order, show it prominently on dashboard
- [ ] Tap to open order details / continue workflow

---

### PHASE C: AVAILABLE ORDERS

> Show unassigned orders the rider can accept.

#### C1. Order List Query

- [ ] Query `orders` table where `status_key = 'placed'` AND `rider_id IS NULL`
- [ ] Realtime subscription to `orders` — new orders appear instantly
- [ ] Show order card: order ID, customer name, pickup address, item count, order amount, timestamp

#### C2. Accept Order

- [ ] "Accept" button on each order card
- [ ] Update order: set `rider_id` to current rider, change `status_key` to `assigned`
- [ ] Prevent duplicate assignment (atomic update or DB-level guard)
- [ ] Save assignment timestamp in order `data` jsonb or a dedicated column
- [ ] Remove accepted order from available list
- [ ] Navigate to order detail / active order

#### C3. Database Requirement

- [ ] Add `rider_id uuid` column to `orders` table (references `riders.id`)
- [ ] Add `assigned_at timestamptz` column (or store in `data` jsonb)
- [ ] RLS: riders can read all orders where `rider_id = their id` OR `status_key = 'placed'`
- [ ] RLS: riders can update orders where `rider_id = their id`

---

### PHASE D: ORDER DETAIL & STATE MACHINE (RIDER SIDE)

> Let the rider see full order info and perform valid state transitions.

#### D1. Order Detail Screen

- [ ] Customer name & phone
- [ ] Pickup address (with map link)
- [ ] Delivery address (with map link)
- [ ] Laundry items list with quantities
- [ ] Order total
- [ ] Current status indicator
- [ ] Order timeline / history

#### D2. Rider State Actions

Valid transitions the rider can perform:

| Current Status     | Rider Action           | Next Status           |
|--------------------|------------------------|-----------------------|
| `assigned`         | Start Pickup           | `pickup_started`      |
| `pickup_started`   | Confirm Pickup         | `picked_up`           |
| `picked_up`        | Mark Processing        | `processing`          |
| `processing`       | Mark Ready             | `ready_for_delivery`  |
| `ready_for_delivery`| Start Delivery        | `out_for_delivery`    |
| `out_for_delivery` | Confirm Delivery       | `delivered`           |

- [ ] Action buttons shown based on current status (only the valid next action)
- [ ] Each action updates `status_key` + `updated_at` in Supabase
- [ ] Prevent invalid transitions (DB-level or app-level guard)

---

### PHASE E: RIDER PICKUP SCREEN

> Dedicated pickup workflow screen.

#### E1. Pickup UI

- [ ] Customer name & phone (tap to call)
- [ ] Pickup address with map button
- [ ] List of items to collect
- [ ] "Start Pickup" button → updates status to `pickup_started`
- [ ] "Confirm Pickup" button → updates status to `picked_up`

#### E2. Navigation

- [ ] Accessible from Dashboard active order card OR from Available orders after accept
- [ ] After pickup confirmed → auto-navigate to processing or order detail

---

### PHASE F: LAUNDRY PROCESSING (RIDER SIDE)

> Simple status actions — no warehouse system needed for beta.

#### F1. Processing Actions

- [ ] From `picked_up`: show "Mark as Processing" button
- [ ] From `processing`: show "Mark as Ready" button
- [ ] Both update `status_key` in Supabase
- [ ] Confirm dialog before status change

---

### PHASE G: RIDER DELIVERY SCREEN

> Dedicated delivery workflow screen.

#### G1. Delivery UI

- [ ] Customer name & phone (tap to call)
- [ ] Delivery address with map button
- [ ] "Start Delivery" button → updates status to `out_for_delivery`
- [ ] "Confirm Delivery" button → updates status to `delivered`

#### G2. Post-Delivery

- [ ] After delivery confirmed → show completion screen or navigate to Trips
- [ ] Update earnings summary

---

### PHASE H: RIDER ORDER HISTORY (TRIPS)

> List of completed orders for the rider.

#### H1. Trips Screen

- [ ] Query orders where `rider_id = current rider` AND `status_key = 'delivered'`
- [ ] List sorted by most recent
- [ ] Each row: order ID, customer name, date, amount, status
- [ ] Tap to view order details

#### H2. Order Detail (Historical)

- [ ] Full breakdown of delivered order
- [ ] Items, quantities, total
- [ ] Timeline of status changes

---

### PHASE I: RIDER EARNINGS

> Beta-only earnings calculation (no bank integration, no payouts).

#### I1. Earnings Dashboard

- [ ] Today's earnings = sum of `total` for delivered orders today
- [ ] Completed order count today
- [ ] Weekly earnings (Mon–Sun)
- [ ] Earnings per order (list view)

#### I2. Earnings Data

- [ ] Query: `SELECT SUM(total), COUNT(*) FROM orders WHERE rider_id = ? AND status_key = 'delivered' AND delivered_at >= <start>`
- [ ] Store delivered timestamp in order `data` jsonb or `delivered_at` column

---

### PHASE J: RIDER PROFILE & SETTINGS

> Edit rider info, toggle status, logout.

#### J1. Profile Screen

- [ ] Rider name (editable)
- [ ] Rider photo (with upload/crop)
- [ ] Rider phone (read-only)
- [ ] Active/inactive status indicator

#### J2. Settings

- [ ] Edit name → update `riders.name`
- [ ] Edit photo → upload to Supabase Storage, update `riders.photo`
- [ ] Online/offline toggle (same as dashboard)
- [ ] Logout → clear session, return to login

---

### PHASE K: REAL-TIME SYNC (RIDER ↔ USER)

> Ensure status changes on the rider app are visible to the user in real-time.

#### K1. Rider → User Direction

- [ ] Rider accepts order → user sees "Assigned" status
- [ ] Rider starts pickup → user sees "Pickup Started"
- [ ] Rider confirms pickup → user sees "Picked Up"
- [ ] Rider marks processing → user sees "Processing"
- [ ] Rider marks ready → user sees "Ready"
- [ ] Rider starts delivery → user sees "Out for Delivery"
- [ ] Rider confirms delivery → user sees "Delivered"

#### K2. User → Rider Direction

- [ ] User creates order → order appears in rider's Available list (realtime subscription on `orders` table filtered by `status_key = 'placed' AND rider_id IS NULL`)

#### K3. Implementation

- [ ] Rider app subscribes to Supabase Realtime on `orders` table
- [ ] Filter: `rider_id = current rider OR (rider_id IS NULL AND status_key = 'placed')`
- [ ] On change: re-fetch or patch local state
- [ ] Test across two physical phones

---

### PHASE L: DATABASE MIGRATIONS

> All schema changes needed to support the rider app.

- [ ] Add `rider_id uuid REFERENCES riders(id)` to `orders` table
- [ ] Add `assigned_at timestamptz` to `orders` table (or store in `data` jsonb)
- [ ] Add `online boolean default false` to `riders` table
- [ ] Add `photo text` to `riders` table (if not present)
- [ ] Add `user_id uuid REFERENCES auth.users(id)` to `riders` table (links auth account to rider row)
- [ ] RLS policies for rider access to `orders`:
  - Riders can SELECT orders where `rider_id = auth.uid()` OR (`rider_id IS NULL` AND `status_key = 'placed'`)
  - Riders can UPDATE orders where `rider_id = auth.uid()`
- [ ] RLS policies for rider own-row access:
  - Riders can SELECT/UPDATE their own row (`user_id = auth.uid()`)
- [ ] Realtime enabled on `orders` table for rider subscriptions

---

### PHASE M: APK BUILD & TESTING

> Package and verify on Phone 2.

#### M1. Build

- [ ] Capacitor APK build pipeline configured for Rider App
- [ ] App name: "LaundryMan Rider" (or similar)
- [ ] App icon: distinct from user app
- [ ] Package name: different from user app (e.g., `com.laundryman.rider`)

#### M2. Device Verification

- [ ] Verify Rider APK installs on Phone 2
- [ ] Verify login flow on Phone 2
- [ ] Verify no horizontal overflow
- [ ] Verify UI sizing & safe areas
- [ ] Verify Android back button navigation
- [ ] Verify keyboard behavior

---

### PHASE N: TWO-PHONE END-TO-END TEST

> The final beta milestone. Full flow across both phones.

#### Phone 1: USER

- [x] Login
- [x] Create order
- [x] Order shows as PLACED

#### Phone 2: RIDER

- [ ] Login
- [ ] Go online
- [ ] Receive new order (appears in Available)
- [ ] Open order details
- [ ] Accept order
- [ ] Start pickup
- [ ] Confirm pickup
- [ ] Mark processing
- [ ] Mark ready
- [ ] Start delivery
- [ ] Confirm delivery

#### Phone 1: USER (verify real-time)

- [x] See rider assignment
- [x] See pickup status
- [x] See picked-up status
- [x] See processing status
- [x] See ready status
- [x] See out-for-delivery status
- [x] See delivered status

---

## FILES TO CREATE / FILL

All files exist as empty placeholders in `RIDER_APP/frontend/src/`:

```
src/
├── App.jsx                          ← Main app shell, routing, auth flow
├── main.jsx                         ← Entry point
├── context/
│   └── RiderContext.jsx             ← Auth state, rider profile, online status
├── pages/
│   ├── Login.jsx                    ← Phone number input
│   ├── Otp.jsx                      ← OTP verification
│   ├── Name.jsx                     ← Name entry (first login)
│   ├── Dashboard.jsx                ← Home screen with stats & active order
│   ├── Available.jsx                ← List of unassigned orders
│   ├── OrderDetail.jsx              ← Full order view + state actions
│   ├── Pickup.jsx                   ← Pickup workflow
│   ├── Delivery.jsx                 ← Delivery workflow
│   ├── Trips.jsx                    ← Order history
│   ├── Earnings.jsx                 ← Earnings summary
│   ├── Profile.jsx                  ← Rider profile & settings
│   └── Support.jsx                  ← Support / help
├── components/
│   ├── BottomNav.jsx                ← Bottom tab navigation
│   ├── Header.jsx                   ← Top bar with rider name
│   ├── ActiveOrderCard.jsx          ← In-progress order card for dashboard
│   ├── OnlineToggle.jsx             ← Online/offline switch
│   ├── Stepper.jsx                  ← Order status stepper
│   ├── TrackTimeline.jsx            ← Order timeline display
│   ├── MapView.jsx                  ← Map for addresses
│   ├── Modal.jsx                    ← Confirmation dialogs
│   ├── Toast.jsx                    ← Toast notifications
│   ├── Icon.jsx                     ← Icon component
│   ├── PageHeader.jsx               ← Reusable page header
│   ├── SectionLabel.jsx             ← Section dividers
│   ├── Photo.jsx                    ← Photo display
│   ├── ImageCrop.jsx                ← Photo crop for profile
│   └── OtpDisplay.jsx               ← OTP display (if needed)
├── services/
│   └── api.js                       ← Supabase queries (orders, rider profile)
├── hooks/
│   └── (custom hooks as needed)
├── styles/
│   └── rider.css                    ← Rider-specific styles (or share with user app)
├── utils/
│   └── (helpers as needed)
└── data/
    └── (static data if needed)
```

---

## DATABASE SCHEMA ADDITIONS

```sql
-- Add to orders table:
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES public.riders(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- Add to riders table:
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo text default '';

-- Unique index: one auth user maps to one rider row
CREATE UNIQUE INDEX IF NOT EXISTS riders_user_id_idx ON public.riders (user_id);

-- RLS: riders see placed orders + their own assigned orders
CREATE POLICY "Riders can view available and own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  (rider_id IS NULL AND status_key = 'placed')
  OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

-- RLS: riders can update their own assigned orders
CREATE POLICY "Riders can update own assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
WITH CHECK (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- RLS: riders manage their own profile
CREATE POLICY "Riders can manage own profile"
ON public.riders FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## KEY CONVENTIONS (match User App)

| Aspect | Convention |
|--------|-----------|
| Navigation | Screen-based state (`screen` + `params`), not React Router |
| State | Context provider (`RiderContext`) wrapping entire app |
| API | Supabase client via `@supabase/supabase-js` |
| Styles | Single CSS file, mobile-first, 480px viewport |
| Auth | Beta test auth (`9749117663` = `123456`) |
| Back button | `window.__lmBack` for Android hardware back |
| Keyboard | Hide bottom nav when keyboard is open |
| Pull-to-refresh | Touch + wheel driven, ref-based indicator |
| Toast | Simple string state, 1.7s auto-dismiss |

---

## BETA DEFINITION OF DONE (RIDER)

The Rider App beta is complete when this flow works on **two physical Android phones**:

```
PHONE 1 (USER)                    PHONE 2 (RIDER)
    │                                  │
    ├── Login                          ├── Login
    ├── Create order                   ├── Go online
    ├── Order placed ──────────────────├── Order appears
    │                                  ├── Accept order
    │   ←── rider assigned ────────────├── Start pickup
    │   ←── pickup started ────────────├── Confirm pickup
    │   ←── picked up ─────────────────├── Mark processing
    │   ←── processing ────────────────├── Mark ready
    │   ←── ready ─────────────────────├── Start delivery
    │   ←── out for delivery ──────────├── Confirm delivery
    │   ←── delivered ─────────────────│
    │                                  │
    ├── Order shows "Delivered"        ├── See completed order in Trips
    │                                  ├── See earnings update
```
