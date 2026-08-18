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
- [ ] Verify login on physical Android device

## User Profile

- [x] Profile screen
- [x] Profile CRUD
- [x] Edit profile
- [ ] Profile testing on physical device

## Address

- [x] Address UI
- [x] Add address
- [x] Edit address
- [x] Delete address
- [x] Address selection during order
- [ ] Physical-device testing

## Services

- [x] Service/category UI
- [x] Service selection
- [x] Service pricing
- [x] Connect services to database
- [x] Replace hardcoded service data where required
- [ ] Verify service pricing on physical device

## Order Creation

- [x] Order UI
- [x] Item selection
- [x] Quantity selection
- [x] Photo attachment
- [x] Image crop
- [x] Order summary
- [ ] Create real order in Supabase
- [ ] Save all selected items
- [ ] Save pickup address
- [ ] Save delivery address
- [ ] Save order total
- [ ] Test complete order creation on physical device

## User Order Tracking

- [x] Orders screen
- [x] Order details
- [x] Order timeline
- [ ] Real-time order status
- [ ] Assigned rider information
- [ ] Pickup status
- [ ] Processing status
- [ ] Ready status
- [ ] Out-for-delivery status
- [ ] Delivered status

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

- [ ] Create `riders` table
- [ ] Add `rider_id` to orders
- [ ] Assign order to rider
- [ ] Prevent duplicate rider assignment
- [ ] Save assignment timestamp
- [ ] Remove accepted order from available orders
- [ ] Display assigned rider to user

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

- [ ] Define all order statuses
- [ ] Define valid status transitions
- [ ] Prevent invalid status transitions
- [ ] Save status changes
- [ ] Save status timestamps
- [ ] User can see status changes
- [ ] Rider can perform only valid next actions
- [ ] Test complete state machine

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
- [ ] User sees pickup confirmation

---

# PHASE 5: LAUNDRY PROCESSING

- [ ] Rider sees picked-up order
- [ ] Mark order as processing
- [ ] User sees processing status
- [ ] Mark order as ready
- [ ] User sees ready status

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
- [ ] User sees delivered status

No delivery OTP is required during beta.

---

# PHASE 7: REAL-TIME USER ↔ RIDER SYSTEM

This is a critical beta milestone.

The two phones must communicate through Supabase.

### User → Rider

- [ ] User creates order
- [ ] Order appears on Rider App automatically
- [ ] Rider receives new order without manual refresh

### Rider → User

- [ ] Rider accepts order
- [ ] User sees assignment
- [ ] Rider starts pickup
- [ ] User sees pickup status
- [ ] Rider confirms pickup
- [ ] User sees picked-up status
- [ ] Rider marks processing
- [ ] User sees processing status
- [ ] Rider marks ready
- [ ] User sees ready status
- [ ] Rider starts delivery
- [ ] User sees out-for-delivery status
- [ ] Rider confirms delivery
- [ ] User sees delivered status

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

# PHASE 11: DATABASE

Required beta database work:

- [ ] `riders` table
- [ ] `rider_id` on orders
- [ ] `assigned_at`
- [ ] `accepted_at`
- [ ] `picked_up_at`
- [ ] `delivered_at`
- [ ] Proper order status
- [ ] Rider availability
- [ ] Rider location fields if required by the current UI

Do not create unnecessary production tables yet.

---

# PHASE 12: USER APP PRODUCTION-GAP CLEANUP

Only beta-critical items:

- [ ] Remove demo-mode behavior that prevents real Supabase testing
- [ ] Replace fake order creation with real database operations
- [ ] Replace fake order status with real database status
- [ ] Add real Privacy Policy page
- [ ] Add real Terms of Service page
- [ ] Remove tracking demo toggle
- [ ] Verify all existing pages work with real data
- [ ] Test navigation between all pages

---

# PHASE 13: APK TESTING

- [x] Capacitor APK build pipeline
- [x] 480px APK viewport patch
- [x] APK native-feel CSS injection
- [x] PDF font trimming
- [x] Verify latest APK on Phone 1
- [ ] Verify Rider APK on Phone 2
- [ ] Verify no horizontal overflow
- [x] Verify UI sizing
- [ ] Verify safe areas
- [ ] Verify Android back button
- [ ] Verify keyboard behavior

---

# PHASE 14: TWO-PHONE END-TO-END TEST

This is the main Beta milestone.

### Phone 1: USER

- [ ] Login
- [ ] Create order
- [ ] Select services/items
- [ ] Add address
- [ ] Submit order
- [ ] See order as `PLACED`

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

- [ ] See rider assignment
- [ ] See pickup status
- [ ] See picked-up status
- [ ] See processing status
- [ ] See ready status
- [ ] See out-for-delivery status
- [ ] See delivered status

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
