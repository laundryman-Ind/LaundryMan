# Laundry Man — Frontend (static preview)

Mobile-first laundry service app built with **React + Vite**. This is a **static app**: no backend, all data is mocked in `src/data/mockData.js` and persisted locally to `localStorage` (keys `lm2_*`).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build → dist/
```

## Screens

| Route | Screen |
|---|---|
| `home` | Home (bento grid, hero, services, active order, offers & stats, payment) |
| `services` | All 10 services |
| `service` | Service detail + item quantity stepper |
| `cart` | Bag with line items, totals, remove |
| `address` | Saved addresses + add form |
| `checkout` | Order summary, address, payment method |
| `tracking` | Order details + 4-step tracking timeline |
| `orders` | Current order + history |
| `offers` | Coupon codes (tap to copy) |
| `profile` | Account, stats, menu, payment, sign out |
| `support` | Call / WhatsApp / email + FAQs |

Navigation is state-based (`src/App.jsx`); the bottom nav mirrors the design file: `Home · Orders · + · Offers · Profile`. Desktop (≥760px) hides the bottom nav and widens the container, exactly like the design file.

## Structure

```
src/
├── components/   Icon, Photo, Header, PageHeader, BottomNav, Toast, Stepper,
│                 ServiceCard, TrackTimeline, ActiveOrderCard, Modal, SectionLabel
├── pages/        One file per screen (see table above)
├── context/      AppContext — cart, addresses, payment, orders (localStorage)
├── data/         mockData.js — services, items, offers, orders, FAQs
└── styles.css    Design tokens + all styles (ported from the design file)
```

## Next steps (per APP_PLAN.md)

Wire the real API (`/api/v1`), replace mock data with backend responses, then add auth (OTP), photos, invoice, and Capacitor packaging.
