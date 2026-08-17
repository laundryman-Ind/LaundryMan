# 🛵 LAUNDRY MAN — RIDER APP Plan

> **Delivery partner application for Laundry Man**  \
> React + Vite · shares the USER_APP FastAPI backend · PostgreSQL · Capacitor → Android APK

---

## 1. PRODUCT OVERVIEW

| Attribute | Value |
|---|---|
| **Product** | Laundry Man — Rider App |
| **Type** | Companion delivery-partner app (pickup & drop of laundry bags) |
| **Primary Users** | Delivery riders / partners (the people who pick up and drop off bags) |
| **Initial Service Area** | Kolkata, India (same as USER_APP) |
| **Primary Target** | Mobile browser (390 × 844) → Android APK (via Capacitor) |
| **Desktop** | Responsive adaptation of the same UI (no separate app) |
| **Language** | English |

### Product Vision

> The Rider App must feel like **a driver's cockpit that happens to run in a browser** — big tap targets, glanceable status, one-thumb operation, and an always-clear "what do I do next" answer. It is NOT the customer app with a different logo.

### What the Rider App Is NOT

- ❌ A customer-facing storefront (no services catalog, no cart, no checkout)
- ❌ An admin/laundry-ops dashboard (processing, QC, pricing — out of scope)
- ❌ A taxi-style marketplace with surge pricing (simple fixed-payout model first)

### Out of Scope (Initial MVP)

- ❌ iOS
- ❌ Multi-order / batch trips (one active trip at a time, matching USER_APP's "one active order per user" rule)
- ❌ Cash advance / instant payout
- ❌ Referrals / leaderboards
- ❌ Offline operation

---

## 2. TECHNOLOGY STACK

```
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  USER_APP (React + Vite)    │   │  RIDER_APP (React + Vite)   │
│  (Capacitor → user APK)     │   │  (Capacitor → rider APK)    │
└──────────────┬──────────────┘   └──────────────┬──────────────┘
               │            ┌─────────────────────┐             │
               └───────────►│  SHARED BACKEND     │◄────────────┘
                            │  Python + FastAPI    │
                            │  PostgreSQL          │
                            │  Razorpay (via user  │
                            │  app flows)          │
                            └─────────────────────┘
```

**Architecture decision — ONE backend, TWO frontends.**

The Rider App **reuses the USER_APP backend and database**. Orders are the same records; a rider's job is to move an order through its lifecycle. Splitting the backend would fork the order state machine and the OTP system — the two things that MUST stay single-source-of-truth. The backend gains rider-specific routers (`/api/v1/rider/...`), role-aware auth, and a few new tables; nothing in the user-facing API is removed.

**Frontend is separate** (`RIDER_APP/frontend`), because the rider persona, navigation, and screens are genuinely different — but it reuses the same design language and as much component code as practical (see §6).

### Architecture Flow (Android)

```
React → Vite Build → Capacitor → Android → APK   (parallel to USER_APP)
```

---

## 3. GLOBAL AGENT RULES

1. Inspect the existing USER_APP project before touching the shared backend — never break a working user feature.
2. Never destroy working features. Never rewrite the entire project unnecessarily.
3. Reuse existing components, services, and styles wherever they fit — the two apps must LOOK like one product.
4. Keep frontend and backend separated. The rider frontend only talks to the API.
5. Keep API contracts documented; rider endpoints live under `/api/v1/rider/`.
6. Keep the UI mobile-first and **driving-safe**: every feature must remain responsive and usable one-handed.
7. Use **reusable React components** and **reusable Python services**.
8. Do not hardcode business logic inside UI components.
9. Do not hardcode secrets — use **environment variables**.
10. Validate **all** API inputs, and **never trust a client-provided status change or price**.
11. Handle loading states, empty states, errors, and network failures (riders drive through dead zones — this is critical).
12. Keep accessibility in mind: large targets, high contrast, glanceable statuses.
13. Do not implement later-phase features early unless required as infrastructure.
14. Test every completed phase before moving forward.
15. Do not mark a phase complete if its core functionality is broken.
16. **Rider actions must never skip verification**: an order can only advance via valid OTP verification, not because the frontend says so.

---

## 4. RESPONSIVE DESIGN SYSTEM

### Design Targets

| Breakpoint | Width | Layout Notes |
|---|---|---|
| **Mobile** | 360 × 640 → 414 × 896 | Bottom nav, huge touch targets, stacked cards, bottom sheets, one-thumb CTA |
| **Tablet** | 768 × 1024 → 1024 × 768 | Expanded cards, two-column layouts |
| **Desktop** | 1280 × 720 → 1440 × 900 | Centered container, sidebar nav, multi-column (e.g. dashboard metrics grid) |

### Driving-Safe Rules (unique to Rider App)

- Primary CTA (e.g. "Start pickup", "Verify OTP") is **always near the bottom, thumb-reachable**.
- Never require precise interaction while moving — the "action" screen is designed to be used at a standstill, with the **current step** (what to do next) pinned at the top in a bold strip.
- Status pills and ETA text must be readable at a glance (high contrast, no tiny text for the active step).
- Map controls are large (≥44px) and the map never captures a tap meant for a button.

### Test Viewports

```
360 × 640 · 375 × 812 · 390 × 844 · 414 × 896
768 × 1024 · 1024 × 768 · 1280 × 720 · 1440 × 900
```

**Critical rule:** Desktop width must never break the mobile layout.

---

## 5. RELATIONSHIP TO USER_APP

### 5.1 What is shared (single source of truth)

| Thing | Where | Note |
|---|---|---|
| Orders, order items, addresses, payments | `Order`, `OrderItem`, `Address`, `Payment` tables | Rider app reads these; never edits customer-owned fields |
| Order state machine | Backend service | Both apps drive the SAME transitions (§7.3) |
| Single pickup/delivery OTP | Backend service (USER_APP Phase 12) | The rider app is the operational side of this one system |
| Auth + OTP login | Backend `/auth` endpoints | Extended to be role-aware (user vs rider) |
| Design tokens & fonts | `--ink #0E1116`, `--paper #F3F1E9`, `--cell #FFFFFF`, `--cobalt #2540FF`, `--sun #FFC42E`, `--mint #BFEDD4`, `--radius 22px` | Same palette → same product feel |
| Photos attached to items | Storage + `SavedPhoto`-style refs | Riders view photos at pickup for verification |

### 5.2 What the Rider App adds

- `RiderProfile` (name, phone, vehicle, documents, KYC status, online/offline state)
- `RiderLocation` heartbeat table (real GPS to replace the mock map)
- `EarningsEntry` ledger (per-trip payout + tips)
- `PushNotification` queue (assignment, status changes)
- `Order.rider_id` + pickup/delivery verification timestamps
- New `/api/v1/rider/*` router group, role-scoped JWT

### 5.3 Component reuse map

| USER_APP component | Reuse in RIDER_APP |
|---|---|
| `Icon.jsx` + `iconify.js` | ✅ Direct copy — same icon system |
| `Photo.jsx`, `Toast.jsx`, `Modal.jsx`, `PageHeader.jsx`, `SectionLabel.jsx`, `Stepper.jsx` | ✅ Direct copy |
| `utils/popup.js` (scroll lock, swipe dismiss) | ✅ Direct copy |
| `utils/env.js` (Capacitor detection) | ✅ Direct copy |
| `services/phone.js`, `services/image.js`, `services/geo.js` | ✅ Direct copy (geo becomes the map's geocode helper) |
| `BottomNav.jsx` | 🔧 Adapt — tabs become `Dashboard · Trips · Earnings · Profile`, plus an online/offline indicator |
| `TrackTimeline.jsx`, `ActiveOrderCard.jsx` | 🔧 Adapt — statuses are rider-flavored ("Go to pickup", "Waiting for OTP") |
| `Header.jsx` | 🔧 Adapt — add **Online / Offline** toggle, battery-friendly |
| `ImageCrop.jsx` | ✅ Direct copy (profile photo) |
| `App.jsx` shell (state nav, hardware back, pull-to-refresh) | 🔧 Adapt — same pattern, different screens |
| `styles.css` | 🔧 Copy then extend — same tokens, add driver-specific sections (map, OTP hero, online toggle) |
| `mockData.js` | 🔧 New mock dataset (rider-specific), same shape conventions |

---

## 6. FRONTEND STRUCTURE

```
RIDER_APP/
├── frontend/
│   ├── src/
│   │   ├── components/     Reusable UI (copied/adapted from USER_APP)
│   │   ├── pages/          Route-level screens (see §8)
│   │   ├── context/        RiderContext — session, online state, active trip
│   │   ├── services/       Map, OTP, earnings, phone, image, geo
│   │   ├── api/            API client & endpoint definitions
│   │   ├── data/           mockData.js (rider mock data, mirrors USER_APP shape)
│   │   ├── hooks/          useTripState, useRiderLocation, useEarnings, usePolling
│   │   ├── utils/          popup, env, clipboard, phone formatters
│   │   ├── styles/         styles.css (same tokens + driver extensions)
│   │   └── App.jsx         State-based navigation shell (same pattern as USER_APP)
│   ├── android/            Capacitor Android project (generated)
│   ├── capacitor.config.json   appId: com.laundryman.rider
│   ├── vite.config.js          port 3001 (avoids USER_APP's 3000)
│   ├── index.html
│   └── package.json
├── assets/                 Rider logo / icon variants
└── README.md               Run instructions (mirror USER_APP/frontend/README.md)
```

**Backend lives in `USER_APP/backend`** — one repository, two apps. Rider code lands in:

```
backend/app/
├── api/
│   ├── v1/rider_auth.py      Rider OTP login
│   ├── v1/rider_orders.py    Accept, status, OTP verify, report issue
│   ├── v1/rider_trips.py     Trips history
│   ├── v1/rider_earnings.py  Earnings summary
│   ├── v1/rider_profile.py   Profile, documents, online/offline
│   └── v1/rider_location.py  GPS heartbeat
├── models/                   + RiderProfile, RiderLocation, EarningsEntry, PushNotification
├── schemas/                  + rider Pydantic schemas
├── services/                 + rider_order_service.py, otp_service.py (shared), earnings_service.py
└── core/                     + role-aware auth dependency
```

---

## 7. ORDER LIFECYCLE — SINGLE STATE MACHINE

### 7.1 The one state machine (shared by both apps)

```
PLACED → CONFIRMED → RIDER_ASSIGNED → PICKUP_STARTED → PICKED_UP
→ PROCESSING → READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
```

### 7.2 Who moves it

| State | Driven by |
|---|---|
| PLACED → CONFIRMED | Backend (payment/auto-confirm) |
| CONFIRMED → RIDER_ASSIGNED | Backend (dispatch — auto-assign or rider accepts from queue) |
| RIDER_ASSIGNED → PICKUP_STARTED | **Rider app** — "Start pickup" (arrived at door) |
| PICKUP_STARTED → PICKED_UP | **Rider app** — OTP verified by customer |
| PICKED_UP → PROCESSING → READY | Laundry/ops (admin dashboard — out of rider scope) |
| READY → OUT_FOR_DELIVERY | **Rider app** — "Start delivery" |
| OUT_FOR_DELIVERY → DELIVERED | **Rider app** — OTP verified at drop-off |
| DELIVERED → COMPLETED | Backend (settlement/earnings ledger) |

### 7.3 Rider app must only issue valid transitions

- The frontend offers a button; the **backend validates** the current state and the OTP before accepting the transition.
- Invalid transition → `409 Conflict` with a friendly message ("Pickup already verified").
- The rider's **active trip** = the one order in any rider-owned state (`RIDER_ASSIGNED` → `OUT_FOR_DELIVERY`).

---

## 8. SCREENS (ROUTES)

| Screen | Route | Notes |
|---|---|---|
| Splash | `/` | Brand mark, boots into session check |
| Login | `/login` | Phone → OTP (mirrors USER_APP login) |
| OTP | `/otp` | 6-digit code, resend countdown |
| Enter Name | `/enter-name` | First login only |
| Dashboard | `/dashboard` | Today's summary, online toggle, available orders, active trip |
| Available Orders | `/available` | Dispatch queue (accept / decline with countdown) |
| Order Detail | `/order` | Pickup & delivery addresses, items + photos, customer, payment, OTP step |
| Pickup | `/pickup` | Map → arrived → show OTP → verify → bag picked up |
| Delivery | `/delivery` | Map → arrived → show OTP → verify → delivered + COD/tip |
| Trips | `/trips` | Trip history + filters |
| Earnings | `/earnings` | Daily/weekly totals, per-trip ledger, payout status |
| Profile | `/profile` | Name, phone, photo, vehicle, documents/KYC, logout |
| Support | `/support` | Call / WhatsApp / email / FAQs (mirror USER_APP) |

**Mobile bottom nav:** `Dashboard · Trips · Earnings · Profile`  \
**Desktop sidebar:** same four, plus Support.

---

## 9. MONOLITHIC PHASE ROADMAP

Agents must work **in this exact order**. Do not silently continue into another phase — use the handoff report.

```
FOUNDATION → DATABASE → AUTH → APP SHELL → DASHBOARD → DISPATCH
→ ORDER DETAIL → NAVIGATION → PICKUP OTP → DELIVERY OTP → TRIPS
→ EARNINGS → PROFILE → SUPPORT → RESPONSIVE QA → SECURITY
→ PERFORMANCE → PWA → CAPACITOR → ANDROID → FINAL QA
```

---

## 10. PHASE DETAILS

---

### PHASE 0 — Project Foundation

#### Frontend (RIDER_APP/frontend)

```
src/
├── components/  App shell primitives (copied from USER_APP where identical)
├── pages/       Route-level screens
├── context/     RiderContext
├── services/    Map, OTP, earnings, phone, image, geo
├── api/         API client & endpoint definitions
├── utils/       popup, env, clipboard
├── styles/      styles.css (same tokens)
└── App.jsx      State-based navigation shell
```

**Foundation deliverables:**

- App shell + bottom navigation (`Dashboard · Trips · Earnings · Profile`)
- Top header with **Online / Offline** toggle
- Loading / error / empty-state components
- Button system (extra-large primary), input system, card system
- Modal + bottom-sheet system (reuse `utils/popup.js`)
- Global CSS + design tokens (identical to USER_APP)
- API client + environment config (`VITE_API_BASE_URL`)
- Error boundaries
- Vite on port **3001**

> ⚠️ Do **not** build business features yet.

#### Backend (extends USER_APP/backend)

- Role-aware auth dependency (`current_user` vs `current_rider`)
- Keep `GET /api/v1/health` working for both apps

**✅ Completion:** Rider React app and the shared API run independently.

---

### PHASE 1 — Database Extensions

**New entities:**

- `RiderProfile` — user_id (FK→User or separate), name, phone, vehicle_type, vehicle_number, documents (DL photo refs), kyc_status, is_online, rating
- `RiderLocation` — rider_id, lat, lng, accuracy, recorded_at (heartbeat)
- `EarningsEntry` — rider_id, order_id, base_amount, tip_amount, status (pending/paid), settled_at
- `PushNotification` — rider_id, title, body, payload, read_at

**Order changes:**

- `Order.rider_id` (nullable FK → rider)
- `Order.pickup_otp_hash`, `pickup_otp_expires_at`, `pickup_verified_at`
- `Order.delivery_verified_at` (reuses the same OTP)
- `Order.accepted_at`

**Requirements:**

- Alembic migrations — fresh install builds the whole DB including USER_APP tables
- Seed 2–3 test riders (e.g. Rahul, Imran, Suresh — matches USER_APP mock riders) + a few test orders in various states

**✅ Completion:** Database builds from fresh migrations with rider tables.

---

### PHASE 2 — Rider Authentication

**Same OTP flow as USER_APP, role-scoped:**

1. Enter phone → `POST /api/v1/rider/auth/send-otp`
2. Enter OTP → `POST /api/v1/rider/auth/verify-otp`
3. Rider must exist (admin-created) and be approved → otherwise "Partner account not active"
4. First login → Enter Name
5. Stay logged in (token/session persistence), logout

**Security requirements:**

- Rider tokens cannot call user endpoints and vice versa (role claim in JWT, enforced in the auth dependency)
- Safe development OTP mechanism (same dev OTP as USER_APP)
- Rate limiting on OTP endpoints

**✅ Completion:** Full rider OTP login loop works end-to-end.

---

### PHASE 3 — App Shell + Navigation

**Screens:** Splash, Login, OTP, Enter Name, Dashboard, Available Orders, Order Detail, Pickup, Delivery, Trips, Earnings, Profile, Support.

**Navigation behavior:**

- **Mobile:** bottom nav `Dashboard | Trips | Earnings | Profile`
- **Desktop:** sidebar with the same four + Support
- Hardware back button bridge (`window.__lmBack`) — same pattern as USER_APP
- Pull-to-refresh registered per page (same `registerRefresh` pattern)

**✅ Completion:** All routes navigate correctly on mobile & desktop.

---

### PHASE 4 — Dashboard

**Content:**

- **Online/Offline toggle** (drives dispatch availability)
- Today's summary strip: trips completed, earnings today, current rating
- **Active trip card** (if one exists) — big "Continue trip" CTA with current step
- **Available orders** feed (dispatch queue): customer area, pickup window, item count, payout
- Empty state when offline or no orders

**Responsive:**

- Mobile → vertical scroll, summary as stacked cards
- Desktop → metrics grid

**✅ Completion:** Dashboard renders all sections, fully responsive; toggle flips dispatch availability.

---

### PHASE 5 — Dispatch + Order Acceptance

**Flow:**

1. New order appears in the queue (polling first; push notifications in a later phase)
2. Rider taps an available order → full detail: pickup address, delivery address, item list with photos, customer name/phone, payment type (COD vs prepaid), pickup window, ETA, payout
3. **Accept** (locks the order to the rider, creates the active trip) or **Decline** (returns to queue with a cooldown)
4. Accept countdown — offer expires after N seconds (configurable)

**Rules:**

- One active trip at a time — accepting is blocked while a trip is open
- Backend enforces the acceptance (idempotent, race-safe — two riders tapping Accept → exactly one wins)
- No hardcoded payouts in the frontend — amounts come from the backend

**✅ Completion:** Accept/decline works, one winner, active trip created.

---

### PHASE 6 — Navigation + Live Location

**Map:**

- MVP: **Leaflet + OpenStreetMap** tiles (free, no key) with a pickup/delivery route line — replaces the USER_APP mock SVG map with real coordinates
- Provider abstracted so **Google Maps** can swap in without rewriting order logic (mirrors USER_APP Phase 13's "plug in real GPS later" rule — here we DO it now, rider-side)

**Location sharing:**

- GPS heartbeat: `POST /api/v1/rider/location` (throttled, e.g. every 10s while on a trip)
- Heartbeat only while online + on an active trip (privacy: no tracking when offline)
- Feeds the USER_APP tracking screen's "live rider" position later

**Driving UX:**

- "Navigate" button opens turn-by-turn (native maps intent on Android / fallback link on web)
- In-app step strip: "1. Go to pickup · 2. Verify OTP · 3. Go to delivery" — current step pinned on top

**✅ Completion:** Rider can navigate to pickup and delivery; live location streams to the backend.

---

### PHASE 7 — Pickup OTP Verification

**The single OTP system (USER_APP Phase 12, operational side):**

1. On arrival, rider taps **"I'm at pickup"** → `PICKUP_STARTED`
2. Rider taps **"Show pickup OTP"** → backend returns the one-time code (short TTL)
3. Customer confirms the code verbally → rider taps **"Verified"** → backend validates attempt cap + expiry → `PICKED_UP`
4. Photo check: item photos attached by the customer render for pickup verification

**Security:**

- OTP never stored client-side after display; masked in history
- Attempt cap + TTL + rate limiting (shared `otp_service.py`)
- `pickup_verified_at` timestamped server-side

**✅ Completion:** Pickup only completes with a valid, non-expired OTP.

---

### PHASE 8 — Delivery OTP Verification

1. `READY → OUT_FOR_DELIVERY` ("Start delivery" — only after the laundry marks ready)
2. At drop-off, **same OTP** shown again → customer confirms → `DELIVERED`
3. **COD collection** amount shown prominently (if order is cash on delivery)
4. Tip display (matches USER_APP tip sheet; tip is recorded to `EarningsEntry`)

**✅ Completion:** Delivery verified with the same OTP; order completes; earnings entry created.

---

### PHASE 9 — Trips History

- Past trips with filters (All / Completed / Cancelled)
- Per-trip: pickup & delivery addresses, items, payout, timestamps
- Cancelled trips show the reason (customer cancelled / rider declined after accept)

**✅ Completion:** Full trip history works.

---

### PHASE 10 — Earnings

- Today / this week / this month totals
- Per-trip ledger (base payout + tip)
- Payout status (pending / paid) — payment settlement backend-driven, never computed client-side
- Amounts come from the backend (`EarningsEntry`)

**✅ Completion:** Earnings reflect completed trips and settle correctly.

---

### PHASE 11 — Profile + Documents

- Edit name, phone (re-verify), profile photo (reuse `ImageCrop`)
- Vehicle details (type, number)
- Documents: driving licence photo upload (reuse image service), KYC status display
- Online/offline state
- Logout
- **Account deletion is out of scope** for riders (admin-managed); do not build it

**✅ Completion:** Full rider profile management.

---

### PHASE 12 — Support + Safety

- Call / WhatsApp / Email channels (reuse `SUPPORT` pattern from USER_APP)
- FAQ tailored to riders (OTP rules, payout timing, lost bags, safety)
- "Report an issue with this order" → `POST /api/v1/rider/orders/{id}/report-issue`
- Emergency call shortcut pinned in the order/pickup/delivery screens

**✅ Completion:** All support channels reachable with native/browser handling.

---

### PHASE 13 — Responsive System Audit

**Stop adding features. Test every screen at:**

```
360 × 640 · 375 × 812 · 390 × 844 · 414 × 896
768 × 1024 · 1024 × 768 · 1280 × 720 · 1440 × 900
```

**Check (USER_APP list + driver-specific):**

- No horizontal overflow, clipped buttons, overlapping elements, broken cards, unreadable text, unusable forms, broken navigation
- Touch targets ≥44px everywhere, especially map controls and the step-strip CTA
- The "current step" strip is always visible and legible at a glance
- Keyboard never destroys forms; mobile scrolling works; desktop stays clean

---

### PHASE 14 — Security Audit

- Role isolation (rider ↔ user tokens cannot cross)
- OTP security (hashing, TTL, attempt caps, rate limiting)
- Authorization on every `/api/v1/rider/*` endpoint (rider can only act on OWNED orders)
- JWT/session handling, input validation, SQL injection protection
- Location privacy (heartbeat only while online + on trip; API returns only what's needed)
- Error messages never leak internals
- Secrets: none in frontend source

**Never expose:** API secrets, DB credentials, OTP secrets, payout secrets.

---

### PHASE 15 — Performance Audit

**Frontend:**

- Lazy loading of the map screen only (Leaflet chunk)
- Polling intervals tuned (queue 15–30s, trip status 10–15s; push later)
- Image optimization (item photos already downscaled via `services/image.js`)
- Reduced unnecessary renders

**Backend:**

- Indexes on `Order.rider_id`, `RiderLocation(rider_id, recorded_at)`, `EarningsEntry(rider_id, date)`
- Pagination on trips/earnings/queue
- Proper API response sizes (no full item payloads when not needed)

**Rule:** Maps and photos must not slow the mobile experience in weak-signal areas.

---

### PHASE 16 — PWA / Mobile Web Preparation

- Web manifest, app icons, splash, viewport, safe-area support
- Installable PWA behavior, offline UI fallback
- ⚠️ No offline trip processing — network is required for every state change

---

### PHASE 17 — Capacitor + Android

**Only after the web app is stable.**

- Android project, app name ("Laundry Man Rider"), package ID `com.laundryman.rider`
- App icon, splash, status bar, safe areas
- Permissions: location (foreground + background while on trip), camera, file access, network
- Background location: Android foreground service while a trip is active (configurable)
- Test on a real Android device with real GPS

**Rule:** Do not rewrite React components for Android unless a native capability requires it.

---

### PHASE 18 — Android QA

**Test the APK:**

- Login / OTP / navigation
- Online/offline toggle
- Accepting an order, pickup OTP, delivery OTP
- Map + turn-by-turn handoff
- Background location while on a trip
- Earnings + trips history
- Support links
- Logout
- Different Android screen sizes

---

### PHASE 19 — Final Production Audit

- No console errors, broken routes, placeholders, broken images
- Responsive + mobile-first + fast
- All APIs validated, auth secure, migrations working, env vars configured
- DB: production migrations tested, indexes created, backups configured
- Android: APK installs, launches, permissions work, no critical crashes, UI works across sizes

---

## 11. API CONTRACT SUMMARY (Rider — additions to USER_APP v1)

| Method | Endpoint | Purpose | Phase |
|---|---|---|---|
| POST | `/api/v1/rider/auth/send-otp` | Rider login OTP | 2 |
| POST | `/api/v1/rider/auth/verify-otp` | Verify rider OTP | 2 |
| GET | `/api/v1/rider/auth/me` | Current rider | 2 |
| POST | `/api/v1/rider/auth/logout` | Logout | 2 |
| GET | `/api/v1/rider/orders/available` | Dispatch queue | 4–5 |
| GET | `/api/v1/rider/orders/{id}` | Order detail (full, incl. photos) | 5 |
| POST | `/api/v1/rider/orders/{id}/accept` | Accept order (race-safe) | 5 |
| POST | `/api/v1/rider/orders/{id}/decline` | Decline order | 5 |
| POST | `/api/v1/rider/orders/{id}/start-pickup` | `PICKUP_STARTED` | 7 |
| POST | `/api/v1/rider/orders/{id}/pickup-otp` | Show pickup OTP (TTL) | 7 |
| POST | `/api/v1/rider/orders/{id}/pickup-verify` | Verify pickup OTP → `PICKED_UP` | 7 |
| POST | `/api/v1/rider/orders/{id}/start-delivery` | `OUT_FOR_DELIVERY` | 8 |
| POST | `/api/v1/rider/orders/{id}/delivery-verify` | Verify delivery OTP → `DELIVERED` | 8 |
| GET | `/api/v1/rider/trips` | Trip history | 9 |
| GET | `/api/v1/rider/earnings` | Earnings summary + ledger | 10 |
| GET/PUT | `/api/v1/rider/profile` | Read / update rider profile | 11 |
| POST | `/api/v1/rider/profile/documents` | Upload DL / documents | 11 |
| POST | `/api/v1/rider/location` | GPS heartbeat | 6 |
| POST | `/api/v1/rider/orders/{id}/report-issue` | Report order issue | 12 |

> The USER_APP contract (§7 of USER_APP_PLAN.md) remains unchanged — rider endpoints are additive.

---

## 12. DATABASE RELATIONSHIP OVERVIEW (additions)

```
RiderProfile 1 ──── * Order            (rider_id on Order)
RiderProfile 1 ──── * RiderLocation    (GPS heartbeat)
RiderProfile 1 ──── * EarningsEntry    (per-trip payout + tip)
RiderProfile 1 ──── * PushNotification (dispatch & status alerts)
Order        1 ──── 1 EarningsEntry    (one settlement per completed trip)
```

- `Order.pickup_otp_hash` / `pickup_otp_expires_at` / `pickup_verified_at` / `delivery_verified_at` / `accepted_at` extend the existing `Order` entity (USER_APP Phase 1).
- Full column-level schema is defined during Phase 1 migrations.

---

## 13. ENVIRONMENT VARIABLES (TEMPLATE)

**Rider frontend (`.env`):**

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MAP_TILES=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Backend additions (`.env.example` → `.env`, shared with USER_APP):**

```dotenv
# Existing USER_APP vars stay unchanged
RIDER_OTP_TTL_SECONDS=600
RIDER_OTP_MAX_ATTEMPTS=5
ORDER_ACCEPT_TIMEOUT_SECONDS=60
LOCATION_HEARTBEAT_SECONDS=10
GOOGLE_MAPS_API_KEY=          # optional, for turn-by-turn/route provider
PUSH_PROVIDER=                # none (polling) → fcm later
```

---

## 14. AGENT HANDOFF PROTOCOL

At the end of **every phase**, the responsible agent must produce a handoff report:

```text
PHASE:
STATUS:

COMPLETED:
- ...

FILES CREATED:
- ...

FILES MODIFIED:
- ...

API CHANGES:
- ...

DATABASE CHANGES:
- ...

TESTS:
- ...

KNOWN ISSUES:
- ...

NEXT PHASE:
- ...
```

**Rules:**

- The next agent **must** inspect the previous phase's work before modifying it.
- Because the backend is shared, note **any** change that could affect USER_APP, and never break the user API.
- Do not silently continue into another phase.
- Do not mark a phase complete if its core functionality is broken.

---

## 15. AGENT COORDINATION ORDER

```
               ┌─────────────┐
               │  PHASE 0    │
               │  FOUNDATION │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 1    │
               │  DATABASE   │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 2    │
               │  AUTH       │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 3    │
               │  APP SHELL  │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 4    │
               │  DASHBOARD  │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 5    │
               │  DISPATCH   │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 6    │
               │  NAVIGATION │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 7    │
               │  PICKUP OTP │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 8    │
               │  DELIV OTP  │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 9    │
               │  TRIPS      │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 10   │
               │  EARNINGS   │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 11   │
               │  PROFILE    │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 12   │
               │  SUPPORT    │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 13   │
               │  RESPONSIVE │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 14   │
               │  SECURITY   │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 15   │
               │  PERF.      │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 16   │
               │  PWA        │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 17   │
               │  CAPACITOR  │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 18   │
               │  ANDROID QA │
               └──────┬──────┘
                      ↓
               ┌─────────────┐
               │  PHASE 19   │
               │  FINAL QA   │
               └─────────────┘
```

---

## 16. FINAL PRODUCT PRINCIPLE

**Laundry Man Rider must feel like:**

> A driver's cockpit that happens to run in a browser — big targets, one-thumb operation, a pinned "what do I do next" step, and a map that gets you to the door.

**Not:**

> A customer app squeezed into a rider uniform.

**Build mobile first.**  \
**Make the UI responsive and glanceable.**  \
**Keep React responsible for presentation and interaction.**  \
**Keep Python responsible for business logic and every state transition.**  \
**Keep PostgreSQL the single source of truth for orders and the OTP system.**  \
**Let the rider app and user app share one backend — never two forks of the truth.**  \
**Keep the architecture ready for Android packaging.**
