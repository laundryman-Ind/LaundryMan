// Mock data for Laundry Man — static preview (no backend yet)

export const IMG = (id, w) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`

export const formatPrice = (n) => {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return '₹0'
  try {
    return '₹' + num.toLocaleString('en-IN')
  } catch {
    return '₹' + Math.round(num)
  }
}

// ---------- SERVICES ----------
// First 8 (in this order) drive the Home screen — matches the UI file exactly.
export const SERVICES = [
  { id: 'wash-fold', icon: 'shirt', name: 'Wash & Fold', sub: 'By the kilo', price: '₹79/kg', span: 'span-2', photo: IMG('1545173168-9f1947eebb7f', 700), tone: '#16279E' },
  { id: 'wash-iron', icon: 'droplet', name: 'Wash & Iron', sub: 'Pressed & ready', span: 'span-2', photo: IMG('1604335398980-ededcadcc37d', 700), tone: '#0E1116' },
  { id: 'iron-only', icon: 'iron', name: 'Iron Only', sub: 'Crisp finish', price: '₹15', span: 'span-1', photo: IMG('1604335398980-ededcadcc37d', 420), tone: '#2540FF' },
  { id: 'dry-clean', icon: 'hanger', name: 'Dry Clean', sub: 'Delicate care', span: 'span-1', photo: IMG('1567113463300-102a7eb3cb26', 420), tone: '#0E1116' },
  { id: 'premium', icon: 'star', name: 'Premium', sub: 'White-glove', span: 'span-1', tone: '', flat: 'flat-ink' },
  { id: 'shoes', icon: 'shoe', name: 'Shoes', sub: 'Deep clean', span: 'span-1', photo: IMG('1600185365483-26d7a4cc7519', 420), tone: '#16279E' },
  { id: 'bags', icon: 'bag', name: 'Bags', sub: 'Leather-safe', span: 'span-2', photo: IMG('1584917865442-de89df76afd3', 700), tone: '#0E1116' },
  { id: 'blankets', icon: 'calendar', name: 'Blankets', sub: 'Bulky items', price: '₹249', span: 'span-2', photo: IMG('1626806787461-102c1bfaaea1', 700), tone: '#1F7A50' },
  // Additional services (Services page)
  { id: 'curtains', icon: 'iron', name: 'Curtains', sub: 'Fresh & crisp', price: '₹199', span: 'span-2', photo: IMG('1626806787461-102c1bfaaea1', 700), tone: '#2540FF' },
  { id: 'carpets', icon: 'star', name: 'Carpets', sub: 'Deep clean', price: '₹299', span: 'span-2', photo: IMG('1545173168-9f1947eebb7f', 700), tone: '#1F7A50' },
]

// ---------- SERVICE ITEMS (per-piece / per-kg pricing) ----------
// icon values are Iconify names (https://iconify.design) rendered offline via
// src/components/iconify.js — see scripts/fetch-iconify.js to regenerate.
export const SERVICE_ITEMS = {
  'wash-fold': [
    { id: 'wf-kg', name: 'Mixed laundry', icon: 'material-symbols:laundry-outline', price: 79, unit: 'kg' },
  ],
  'wash-iron': [
    { id: 'wi-shirt', name: 'Shirt', icon: 'tabler:shirt', price: 30, unit: 'pc' },
    { id: 'wi-tshirt', name: 'T-Shirt', icon: 'boxicons:t-shirt', price: 25, unit: 'pc' },
    { id: 'wi-jeans', name: 'Jeans', icon: 'dinkie-icons:jeans', price: 45, unit: 'pc' },
    { id: 'wi-kurta', name: 'Kurta', icon: 'hugeicons:kurta', price: 40, unit: 'pc' },
    { id: 'wi-saree', name: 'Saree', icon: 'ph:dress', price: 70, unit: 'pc' },
  ],
  'iron-only': [
    { id: 'io-shirt', name: 'Shirt', icon: 'tabler:shirt', price: 15, unit: 'pc' },
    { id: 'io-tshirt', name: 'T-Shirt', icon: 'boxicons:t-shirt', price: 12, unit: 'pc' },
    { id: 'io-trouser', name: 'Trouser', icon: 'mingcute:trouser-line', price: 20, unit: 'pc' },
    { id: 'io-kurta', name: 'Kurta', icon: 'hugeicons:kurta', price: 18, unit: 'pc' },
  ],
  'dry-clean': [
    { id: 'dc-suit', name: 'Suit', icon: 'hugeicons:suit-02', price: 180, unit: 'pc' },
    { id: 'dc-saree', name: 'Saree', icon: 'ph:dress', price: 140, unit: 'pc' },
    { id: 'dc-dress', name: 'Dress', icon: 'ph:dress', price: 120, unit: 'pc' },
    { id: 'dc-coat', name: 'Coat / Jacket', icon: 'mingcute:coat-line', price: 160, unit: 'pc' },
  ],
  premium: [
    { id: 'pm-suit', name: 'Premium Suit', icon: 'fluent:premium-20-filled', price: 320, unit: 'pc' },
    { id: 'pm-saree', name: 'Premium Saree', icon: 'fluent:premium-20-filled', price: 260, unit: 'pc' },
    { id: 'pm-dress', name: 'Premium Dress', icon: 'fluent:premium-20-filled', price: 220, unit: 'pc' },
  ],
  shoes: [
    { id: 'sh-sneakers', name: 'Sneakers', icon: 'boxicons:sneaker', price: 150, unit: 'pc' },
    { id: 'sh-formal', name: 'Formal shoes', icon: 'maki:shoe', price: 180, unit: 'pc' },
    { id: 'sh-sandals', name: 'Sandals', icon: 'hugeicons:sandals', price: 120, unit: 'pc' },
  ],
  bags: [
    { id: 'bg-handbag', name: 'Handbag', icon: 'lucide:handbag', price: 220, unit: 'pc' },
    { id: 'bg-backpack', name: 'Backpack', icon: 'material-symbols:backpack-outline-rounded', price: 180, unit: 'pc' },
    { id: 'bg-laptop', name: 'Laptop bag', icon: 'fluent:backpack-add-28-regular', price: 200, unit: 'pc' },
  ],
  blankets: [
    { id: 'bl-single', name: 'Blanket (single)', icon: 'griddy-icons:blanket', price: 149, unit: 'pc' },
    { id: 'bl-double', name: 'Blanket (double)', icon: 'griddy-icons:blanket', price: 249, unit: 'pc' },
    { id: 'bl-king', name: 'Blanket (king)', icon: 'griddy-icons:blanket', price: 299, unit: 'pc' },
  ],
  curtains: [
    { id: 'ct-pair', name: 'Curtains (pair)', icon: 'mingcute:curtain-line', price: 199, unit: 'pc' },
    { id: 'ct-3panel', name: 'Curtains (3 panels)', icon: 'mingcute:curtain-line', price: 249, unit: 'pc' },
  ],
  carpets: [
    { id: 'cp-small', name: 'Carpet (small)', icon: 'mdi:carpet', price: 299, unit: 'pc' },
    { id: 'cp-medium', name: 'Carpet (medium)', icon: 'mdi:carpet', price: 449, unit: 'pc' },
    { id: 'cp-large', name: 'Carpet (large)', icon: 'mdi:carpet', price: 599, unit: 'pc' },
  ],
}

export const ITEM_INDEX = Object.entries(SERVICE_ITEMS).flatMap(([serviceId, items]) =>
  items.map((it) => ({ ...it, serviceId }))
)

// ---------- OFFERS ----------
export const OFFERS = [
  { code: 'FRESH20', tag: 'Weekend special', title: '20% off', desc: 'On your next dry cleaning order.', photo: IMG('1545173168-9f1947eebb7f', 900), tone: '#C9821A' },
  { code: 'NEW50', tag: 'Welcome offer', title: '50% off', desc: 'On your very first order. Up to ₹150.', photo: IMG('1604335398980-ededcadcc37d', 900), tone: '#16279E' },
  { code: 'FREEPICK', tag: 'Free delivery', title: 'Free pickup', desc: 'On all orders above ₹499.', photo: IMG('1489274495757-95c7c837b101', 900), tone: '#1F7A50' },
]

// ---------- PAYMENT ----------
export const PAYMENT_METHODS = ['UPI', 'Debit card', 'Credit card', 'Cash on delivery']

// ---------- ORDER TRACKING ----------
// Horizontal progress tracker (Home / active order)
export const TRACK_STEPS = [
  { key: 'placed', label: 'Placed', icon: 'bag' },
  { key: 'assigned', label: 'Assigned', icon: 'check' },
  { key: 'picked', label: 'Picked up', icon: 'check' },
  { key: 'washing', label: 'Washing', icon: 'shirt' },
  { key: 'processing', label: 'Processing', icon: 'star' },
  { key: 'delivery', label: 'Delivery', icon: 'truck' },
]

// Full order lifecycle (vertical timeline)
// Maps rider status keys to timeline steps
export const STATUS_FLOW = [
  { key: 'placed', label: 'Order placed', icon: 'bag' },
  { key: 'assigned', label: 'Assigned to rider', icon: 'check' },
  { key: 'pickup_started', label: 'Pickup started', icon: 'check' },
  { key: 'picked_up', label: 'Picked up', icon: 'check' },
  { key: 'washing', label: 'Washing', icon: 'shirt' },
  { key: 'processing', label: 'Processing', icon: 'star' },
  { key: 'ready_for_delivery', label: 'Ready for delivery', icon: 'star' },
  { key: 'delivery', label: 'Out for delivery', icon: 'truck' },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: 'truck' },
  { key: 'delivered', label: 'Delivered', icon: 'check' },
]

// Map rider status keys to timeline step indices for progress tracking
export const STATUS_TO_FLOW_INDEX = {
  placed: 0,
  assigned: 1,
  pickup_started: 2,
  picked_up: 3,
  washing: 4,
  processing: 5,
  ready_for_delivery: 6,
  delivery: 7,
  out_for_delivery: 7,
  delivered: 9,
}

export const TRACK_ACTIVE = {
  // active = number of TRACK_STEPS whose dot should be filled blue (i < active)
  // Steps: 0=Placed, 1=Assigned, 2=Picked up, 3=Washing, 4=Processing, 5=Delivery
  placed: 1, assigned: 2, pickup_started: 2, picked_up: 3,
  washing: 4, processing: 5, ready_for_delivery: 5, delivery: 6, out_for_delivery: 6,
  delivered: 6, cancelled: 0,
}
export const TRACK_FILL = {
  // fill = width % of the progress line between dots
  placed: 8, assigned: 20, pickup_started: 20, picked_up: 35,
  washing: 55, processing: 75, ready_for_delivery: 75, delivery: 100, out_for_delivery: 100,
  delivered: 100, cancelled: 0,
}

export const ACTIVE_STATUSES = ['placed', 'assigned', 'pickup_started', 'picked_up', 'washing', 'processing', 'ready_for_delivery', 'delivery', 'out_for_delivery']
export const CANCELLABLE_STATUSES = ['placed', 'assigned'] // cancellable only until the rider starts pickup

export const STATUS_LABELS = {
  placed: 'Placed',
  assigned: 'Assigned',
  pickup_started: 'Pickup started',
  picked_up: 'Picked up',
  washing: 'In washing',
  processing: 'Processing',
  ready_for_delivery: 'Ready for delivery',
  delivery: 'Out for delivery',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const STATUS_NOTES = {
  placed: 'Order confirmed',
  assigned: 'Order assigned to rider',
  pickup_started: 'Rider is on the way to pick up',
  picked_up: 'Bag picked up from your door',
  washing: 'Wash in progress',
  processing: 'Quality check & packing',
  ready_for_delivery: 'Items ready for delivery',
  delivery: 'Out for delivery',
  out_for_delivery: 'Rider is on the way to deliver',
  delivered: 'Delivered · OTP verified',
}

// Orders are created at runtime via placeOrder() — no seed history.
// Swap placeOrder/advanceActiveOrder for a real API later (order shape stays the same).

export const USER = { name: 'Alex', phone: '+91 98765 43210', photo: null }

// ---------- RIDER ----------
// Assigned delivery partner for live tracking, contact & tipping (mock).
// An order may carry its own `rider`; otherwise the first one is used.
export const RIDERS = [
  { name: 'Rahul', phone: '+91 98200 12345', phoneHref: 'tel:+919820012345' },
  { name: 'Imran', phone: '+91 98300 45678', phoneHref: 'tel:+919830045678' },
  { name: 'Suresh', phone: '+91 98400 78901', phoneHref: 'tel:+919840078901' },
]
export const RIDER = RIDERS[0]

export const SUPPORT = {
  phone: '+91 1800 123 456',
  phoneHref: 'tel:+911800123456',
  whatsapp: '+91 98765 43210',
  whatsappHref: 'https://wa.me/919876543210',
  email: 'support@laundryman.in',
  emailHref: 'mailto:support@laundryman.in',
  hours: 'Mon–Sat, 9 AM – 9 PM',
}

export const FAQS = [
  { q: 'How do I schedule a pickup?', a: 'Pick a service, add your items and choose a pickup slot during checkout. Our rider will collect the bag from your door and share a single OTP for pickup and delivery.' },
  { q: 'What is the delivery time?', a: 'Standard turnaround is 24–26 hours from pickup. Wash & Fold takes about 24 hours; Dry Cleaning can take up to 48 hours depending on the items.' },
  { q: 'How do I track my order?', a: 'Open the Orders tab from the bottom navigation. Your active order shows live status — pickup, washing, processing and delivery.' },
  { q: 'What if my items are damaged?', a: 'We handle every order with care. If something goes wrong, report it from the order details within 48 hours of delivery and we will make it right.' },
]
