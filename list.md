# LAUNDRYMAN BETA PHASE CHECKLIST

> **Official development checklist and progress tracker for the LaundryMan Beta Phase.**
>
> Updated whenever a task is completed. Do not mark something complete unless it actually works.

---

## IMPORTANT BETA RULE

This is a **BETA / TESTING PHASE**, NOT the production launch.

Do NOT ask me to configure or purchase any external production service just to continue development.

Specifically, do NOT block development waiting for:

- SMS provider
- OTP provider
- Twilio
- MSG91
- Firebase SMS
- Cashfree production account
- Razorpay production account
- Payment gateway
- Bank account
- Rider payout system
- FCM push notifications
- Play Store account
- Production hosting
- Production domain
- Release signing
- KYC
- Rider verification
- Any subscription
- Any paid API
- Any other production infrastructure

For authentication during beta, use a **temporary/test authentication mechanism** so the entire application can be tested using two physical phones.

The priority is to make the complete application workflow work.

---

# PHASE 1: USER APP

## Authentication

- [x] User login UI
- [x] User OTP screen UI
- [x] User name setup
- [x] Supabase authentication integration
- [x] Replace production OTP dependency with beta/test authentication
- [x] Supabase test phone number / OTP setup configured for `9749117663` = `123456`
- [x] Session auto-recovery (`ensureSession`) on expired/stale tokens
- [x] Verify login on physical Android device

## User Profile

- [x] Profile screen
- [x] Profile CRUD
- [x] Edit profile (name, phone, avatar)
- [x] Complete profile photo deletion & local state reset (no photo bleeding into new profiles)
- [x] Delete account server-side cleanup via Supabase Edge Function (`delete-account`) and `delete_own_account` PostgreSQL RPC
- [x] Cross-device account deletion synchronization (realtime subscription, multi-tab sync, and automatic signout when profile is deleted on another device)
- [x] Delete account clears local stored app data & Supabase Auth user
- [x] Soft-delete order history ("Clear order history" hides rows from user view while preserving accounting records)
- [x] Profile testing on physical device

## Address

- [x] Address UI
- [x] Add address
- [x] Edit address
- [x] Delete address
- [x] Address selection during checkout/order
- [x] Database persistence with Supabase `addresses` table
- [x] Back button no longer loops to the wrong screen
- [x] Physical-device testing

## Services & Catalog

- [x] Service/category UI
- [x] Service selection & category browsing
- [x] Service pricing
- [x] Connect services to database (`services` + `service_items` tables)
- [x] Dynamic service list loading with fallback to bundled mock catalog
- [x] Replace hardcoded service data where required
- [x] Verify service pricing on physical device

## Cart & Bag

- [x] Persistent shopping cart synced with Supabase `carts` table
- [x] Cross-device cart synchronization
- [x] Item quantity management & subtotal calculations
- [x] Item photo proof attachment support
- [x] Clear cart and item removal actions

## Order Creation & Checkout

- [x] Order UI
- [x] Item selection & quantity selection
- [x] Photo attachment with image preview
- [x] Order summary with subtotal, taxes, and discounts
- [x] Create real order in Supabase `orders` table
- [x] Save all selected items with quantities & photos
- [x] Save pickup address and delivery address
- [x] Save order total and payment method
- [x] Interactive checkout coupon section
- [x] Real database coupon catalog from Supabase `coupons` table
- [x] Coupon eligibility checks (min total, service type matching, free delivery coupon support)
- [x] Single-use coupon enforcement with Supabase `coupon_uses` table and `redeem_coupon` RPC
- [x] Robust order placement with atomic RPC fallback when Edge functions are unconfigured
- [x] Test complete order creation on physical device

## User Order Tracking & Invoicing

- [x] Orders screen with active vs. completed tabs
- [x] Order details with full breakdown
- [x] Order timeline & activity history
- [x] Real-time order status tracking
- [x] Assigned rider information card
- [x] Pickup status tracking
- [x] Processing status tracking
- [x] Ready status tracking
- [x] Out-for-delivery status tracking
- [x] Delivered status tracking
- [x] MapLibre GL live GPS tracking map (`TrackingMap.jsx`) with pickup, rider, and delivery pins
- [x] Order rating & review system persisted to Supabase `reviews` table
- [x] Printable & downloadable A4 PDF invoice generator (`pdfmake`)
- [x] Native Android invoice file download plugin (`InvoiceDownloaderPlugin.java`) saving to `Documents/LaundryMan/invoice`

---

# PHASE 2: RIDER APP

## Rider Authentication

- [ ] Rider login screen
- [ ] Beta/test authentication
- [ ] Rider session management
- [ ] Rider logout
- [ ] Rider profile creation
- [ ] Test login on second physical Android phone

## Rider Profile

- [ ] Rider name
- [ ] Rider phone
- [ ] Rider photo
- [ ] Rider ID
- [ ] Active/inactive status
- [ ] Online/offline status

## Rider Dashboard

- [ ] Rider home screen
- [ ] Today's orders
- [ ] New orders count
- [ ] Active order
- [ ] Completed orders
- [ ] Today's earnings
- [ ] Online/offline toggle

## Available Orders

- [ ] New order list
- [ ] Order ID
- [ ] Customer name
- [ ] Pickup address
- [ ] Delivery address
- [ ] Number of items
- [ ] Order amount
- [ ] Order date/time
- [ ] Order details
- [ ] Accept order

## Order Assignment

- [x] Create `riders` table in Supabase
- [ ] Add `rider_id` foreign key link on orders
- [ ] Assign order to rider
- [ ] Prevent duplicate rider assignment
- [ ] Save assignment timestamp
- [ ] Remove accepted order from available orders
- [x] Display assigned rider to user

## Rider Order Details

- [ ] Customer information
- [ ] Customer phone
- [ ] Pickup address
- [ ] Delivery address
- [ ] Laundry items
- [ ] Quantities
- [ ] Order total
- [ ] Current status
- [ ] Order timeline

---

# PHASE 3: ORDER STATE MACHINE

Implement a controlled order lifecycle.

```
PLACED
  ↓
ASSIGNED
  ↓
RIDER_ACCEPTED
  ↓
PICKUP_STARTED
  ↓
PICKED_UP
  ↓
PROCESSING
  ↓
READY_FOR_DELIVERY
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED
```

Tasks:

- [x] Define all order statuses
- [x] Define valid status transitions
- [x] Prevent invalid status transitions
- [x] Save status changes to Supabase
- [x] Save status timestamps (`placed_at`, `updated_at`, `hiddenAt`)
- [x] User can see status changes in real-time
- [ ] Rider can perform only valid next actions
- [ ] Test complete state machine across 2 devices

---

# PHASE 4: RIDER PICKUP

- [ ] Pickup screen
- [ ] Customer details
- [ ] Pickup address
- [ ] Call customer button
- [ ] Map button
- [ ] Start pickup
- [ ] Confirm pickup
- [ ] Update order to `PICKED_UP`
- [x] User sees pickup confirmation

---

# PHASE 5: LAUNDRY PROCESSING

- [ ] Rider sees picked-up order
- [ ] Mark order as processing
- [x] User sees processing status
- [ ] Mark order as ready
- [x] User sees ready status

For beta, this can be a simple status action.

Do not build a complicated laundry warehouse/admin system yet.

---

# PHASE 6: RIDER DELIVERY

- [ ] Delivery screen
- [ ] Customer details
- [ ] Delivery address
- [ ] Call customer
- [ ] Map button
- [ ] Start delivery
- [ ] Update to `OUT_FOR_DELIVERY`
- [ ] Confirm delivery
- [ ] Update to `DELIVERED`
- [x] User sees delivered status

No delivery OTP is required during beta.

---

# PHASE 7: REAL-TIME USER ↔ RIDER SYSTEM

This is a critical beta milestone.

The two phones must communicate through Supabase.

### User → Rider

- [x] User creates order in Supabase
- [ ] Order appears on Rider App automatically
- [ ] Rider receives new order without manual refresh

### Rider → User

- [ ] Rider accepts order
- [x] User sees assignment
- [ ] Rider starts pickup
- [x] User sees pickup status
- [ ] Rider confirms pickup
- [x] User sees picked-up status
- [ ] Rider marks processing
- [x] User sees processing status
- [ ] Rider marks ready
- [x] User sees ready status
- [ ] Rider starts delivery
- [x] User sees out-for-delivery status
- [ ] Rider confirms delivery
- [x] User sees delivered status

---

# PHASE 8: RIDER ORDER HISTORY

- [ ] Completed orders
- [ ] Order ID
- [ ] Customer
- [ ] Date
- [ ] Amount
- [ ] Status
- [ ] Order details

---

# PHASE 9: RIDER EARNINGS

Beta-only calculation.

- [ ] Today's earnings
- [ ] Completed order count
- [ ] Weekly earnings
- [ ] Earnings per order

Do NOT implement:

- Bank integration
- Automatic payouts
- Payment settlement
- Rider withdrawal system

---

# PHASE 10: RIDER SETTINGS

- [ ] Rider profile
- [ ] Edit name
- [ ] Edit photo
- [ ] Online/offline status
- [ ] Logout

---

# PHASE 11: DATABASE & BACKEND (SUPABASE)

Required beta database work:

- [x] `profiles` table with RLS & cascades
- [x] `addresses` table with RLS & user index
- [x] `carts` table with RLS & per-user cart JSON sync
- [x] `orders` table with RLS (`id`, `user_id`, `status_key`, `total`, `placed_at`, `data` jsonb)
- [x] `reviews` table with RLS & unique constraint per user/order
- [x] `services` table with public read RLS
- [x] `service_items` table with public read RLS
- [x] `coupons` table with discount rules & public read RLS
- [x] `coupon_uses` table with user redemption tracking & RLS
- [x] `riders` table with public read RLS
- [x] `payments` table with saved instruments & RLS
- [x] `notifications` table with RLS
- [x] `push_tokens` table with RLS
- [x] Server-side Edge Function: `delete-account` (service role JWT verification & auth user deletion)
- [x] PostgreSQL RPC `delete_own_account()` and RLS DELETE policy for atomic multi-table account wipe
- [x] PostgreSQL RPC `redeem_coupon()` with atomic single-use locking & discount computation
- [x] Soft-delete order history mechanism (`hiddenAt` timestamp in jsonb)
- [ ] Direct `rider_id` column and assignment timestamps on orders table
- [ ] Rider location live tracking updates in database

---

# PHASE 12: USER APP PRODUCTION-GAP CLEANUP

- [x] Remove demo-mode behavior that prevents real Supabase testing
- [x] Replace fake order creation with real database operations (`orders` table)
- [x] Replace fake order status with real database status
- [x] Cross-device sync on app foregrounding (`visibilitychange` listener), periodic polling, and realtime change events
- [x] Full review & rating system connected to Supabase `reviews` table
- [x] Coupon system integrated with Supabase catalog, single-use tracking & free delivery coupon support
- [x] MapLibre live GPS tracking component integrated for order tracking (`TrackingMap.jsx`)
- [x] A4 PDF Invoice generation (`pdfmake`) with custom native Android download plugin (`InvoiceDownloaderPlugin.java`) to `Documents/LaundryMan/invoice`
- [x] Remove tracking demo toggle
- [x] Verify all existing pages work with real data
- [x] Test navigation between all pages & fix history/back-button loops
- [ ] Add real Privacy Policy page
- [ ] Add real Terms of Service page

---

# PHASE 13: APK TESTING & PACKAGING

- [x] Capacitor APK build pipeline
- [x] 480px APK viewport patch (`<meta name="viewport" content="width=480">`)
- [x] APK native-feel CSS injection
- [x] PDF font trimming (`pdfmake` build optimization)
- [x] Native Invoice Downloader Capacitor Plugin (`InvoiceDownloaderPlugin.java`)
- [x] FileProvider configuration for Android document downloads
- [x] Verify latest APK on Phone 1 (`LaundryMan-v1.0.1.apk` built and packaged)
- [x] Verify no horizontal overflow
- [x] Verify UI sizing
- [x] Verify safe areas & visualViewport adjustments
- [x] Verify Android back button (smooth navigation without history loops)
- [x] Verify keyboard behavior (fixed bottom nav hides when keyboard opens)
- [ ] Verify Rider APK on Phone 2

---

# PHASE 14: TWO-PHONE END-TO-END TEST

This is the main Beta milestone.

### Phone 1: USER

- [x] Login
- [x] Create order
- [x] Select services/items
- [x] Add address
- [x] Submit order
- [x] See order as `PLACED`

### Phone 2: RIDER

- [ ] Login
- [ ] Go online
- [ ] Receive new order
- [ ] Open order
- [ ] Accept order
- [ ] Start pickup
- [ ] Confirm pickup
- [ ] Mark processing
- [ ] Mark ready
- [ ] Start delivery
- [ ] Confirm delivery

### Phone 1: USER

- [x] See rider assignment
- [x] See pickup status
- [x] See picked-up status
- [x] See processing status
- [x] See ready status
- [x] See out-for-delivery status
- [x] See delivered status

---

# EXPLICITLY OUT OF BETA SCOPE

Do NOT add these to the required beta checklist:

- [ ] Real SMS provider
- [ ] Twilio
- [ ] MSG91
- [ ] Firebase SMS
- [ ] Production OTP
- [ ] Production payment gateway
- [ ] Cashfree production
- [ ] Razorpay production
- [ ] Bank integration
- [ ] Rider payouts
- [ ] FCM push notifications
- [ ] Rider KYC
- [ ] Rider document verification
- [ ] Rider subscription
- [ ] Production hosting
- [ ] Production domain
- [ ] Play Store account
- [ ] Play Store submission
- [ ] Release signing
- [ ] Production analytics
- [ ] Advanced coupons
- [ ] Reviews
- [ ] Advanced admin system

These are **POST-BETA tasks**.

---

# BETA DEFINITION OF DONE

The LaundryMan Beta is considered functional when this complete flow works using **two physical Android phones**:

```
USER PHONE
    ↓
Login
    ↓
Create Order
    ↓
Order Placed
    ↓
SUPABASE
    ↓
RIDER PHONE
    ↓
Receive Order
    ↓
Accept
    ↓
Pickup
    ↓
Picked Up
    ↓
Processing
    ↓
Ready
    ↓
Out for Delivery
    ↓
Delivered
    ↓
SUPABASE
    ↓
USER PHONE
    ↓
Order shows "Delivered"
```

No production SMS provider, payment provider, subscription, or other paid service is required to reach this milestone.
