-- Laundry Man — Seed data (idempotent: safe to re-run)
-- Populates services, service_items, and coupons from the existing application data.
-- Run AFTER schema.sql in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------------------------

insert into public.services (id, name, sub, icon, span, photo, tone, flat, price, sort, active)
values
  ('wash-fold',  'Wash & Fold',  'By the kilo', 'shirt',     'span-2', 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=75', '#16279E', '',     '₹79/kg', 1,  true),
  ('wash-iron',  'Wash & Iron',  'Pressed & ready', 'droplet', 'span-2', 'https://images.unsplash.com/photo-1604335398980-ededcadcc37d?auto=format&fit=crop&w=700&q=75', '#0E1116', '',     '',       2,  true),
  ('iron-only',  'Iron Only',    'Crisp finish', 'iron',      'span-1', 'https://images.unsplash.com/photo-1604335398980-ededcadcc37d?auto=format&fit=crop&w=420&q=75', '#2540FF', '',     '₹15',    3,  true),
  ('dry-clean',  'Dry Clean',    'Delicate care', 'hanger',   'span-1', 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?auto=format&fit=crop&w=420&q=75', '#0E1116', '',     '',       4,  true),
  ('premium',    'Premium',      'White-glove',   'star',     'span-1', '',     '',         'flat-ink', '',       5,  true),
  ('shoes',      'Shoes',        'Deep clean',    'shoe',     'span-1', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=420&q=75', '#16279E', '',     '',       6,  true),
  ('bags',       'Bags',         'Leather-safe',  'bag',      'span-2', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=75', '#0E1116', '',     '',       7,  true),
  ('blankets',   'Blankets',     'Bulky items',   'calendar', 'span-2', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=75', '#1F7A50', '',     '₹249',   8,  true),
  ('curtains',   'Curtains',     'Fresh & crisp', 'iron',     'span-2', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=75', '#2540FF', '',     '₹199',   9,  true),
  ('carpets',    'Carpets',      'Deep clean',    'star',     'span-2', 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=75', '#1F7A50', '',     '₹299',   10, true)
on conflict (id) do update set
  name = excluded.name,
  sub = excluded.sub,
  icon = excluded.icon,
  span = excluded.span,
  photo = excluded.photo,
  tone = excluded.tone,
  flat = excluded.flat,
  price = excluded.price,
  sort = excluded.sort,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- SERVICE ITEMS
-- ---------------------------------------------------------------------------

insert into public.service_items (id, service_id, name, icon, price, unit, sort)
values
  -- Wash & Fold
  ('wf-kg',       'wash-fold',  'Mixed laundry',              'material-symbols:laundry-outline', 79,  'kg', 1),

  -- Wash & Iron
  ('wi-shirt',    'wash-iron',  'Shirt',                      'tabler:shirt',        30,  'pc', 1),
  ('wi-tshirt',   'wash-iron',  'T-Shirt',                    'boxicons:t-shirt',    25,  'pc', 2),
  ('wi-jeans',    'wash-iron',  'Jeans',                      'dinkie-icons:jeans',  45,  'pc', 3),
  ('wi-kurta',    'wash-iron',  'Kurta',                      'hugeicons:kurta',     40,  'pc', 4),
  ('wi-saree',    'wash-iron',  'Saree',                      'ph:dress',            70,  'pc', 5),

  -- Iron Only
  ('io-shirt',    'iron-only',  'Shirt',                      'tabler:shirt',        15,  'pc', 1),
  ('io-tshirt',   'iron-only',  'T-Shirt',                    'boxicons:t-shirt',    12,  'pc', 2),
  ('io-trouser',  'iron-only',  'Trouser',                    'mingcute:trouser-line', 20, 'pc', 3),
  ('io-kurta',    'iron-only',  'Kurta',                      'hugeicons:kurta',     18,  'pc', 4),

  -- Dry Clean
  ('dc-suit',     'dry-clean',  'Suit',                       'hugeicons:suit-02',   180, 'pc', 1),
  ('dc-saree',    'dry-clean',  'Saree',                      'ph:dress',            140, 'pc', 2),
  ('dc-dress',    'dry-clean',  'Dress',                      'ph:dress',            120, 'pc', 3),
  ('dc-coat',     'dry-clean',  'Coat / Jacket',              'mingcute:coat-line',  160, 'pc', 4),

  -- Premium
  ('pm-suit',     'premium',    'Premium Suit',               'fluent:premium-20-filled', 320, 'pc', 1),
  ('pm-saree',    'premium',    'Premium Saree',              'fluent:premium-20-filled', 260, 'pc', 2),
  ('pm-dress',    'premium',    'Premium Dress',              'fluent:premium-20-filled', 220, 'pc', 3),

  -- Shoes
  ('sh-sneakers', 'shoes',      'Sneakers',                   'boxicons:sneaker',    150, 'pc', 1),
  ('sh-formal',   'shoes',      'Formal shoes',               'maki:shoe',           180, 'pc', 2),
  ('sh-sandals',  'shoes',      'Sandals',                    'hugeicons:sandals',   120, 'pc', 3),

  -- Bags
  ('bg-handbag',  'bags',       'Handbag',                    'lucide:handbag',      220, 'pc', 1),
  ('bg-backpack', 'bags',       'Backpack',                   'material-symbols:backpack-outline-rounded', 180, 'pc', 2),
  ('bg-laptop',   'bags',       'Laptop bag',                 'fluent:backpack-add-28-regular', 200, 'pc', 3),

  -- Blankets
  ('bl-single',   'blankets',   'Blanket (single)',           'griddy-icons:blanket', 149, 'pc', 1),
  ('bl-double',   'blankets',   'Blanket (double)',           'griddy-icons:blanket', 249, 'pc', 2),
  ('bl-king',     'blankets',   'Blanket (king)',             'griddy-icons:blanket', 299, 'pc', 3),

  -- Curtains
  ('ct-pair',     'curtains',   'Curtains (pair)',            'mingcute:curtain-line', 199, 'pc', 1),
  ('ct-3panel',   'curtains',   'Curtains (3 panels)',        'mingcute:curtain-line', 249, 'pc', 2),

  -- Carpets
  ('cp-small',    'carpets',    'Carpet (small)',             'mdi:carpet',          299, 'pc', 1),
  ('cp-medium',   'carpets',    'Carpet (medium)',            'mdi:carpet',          449, 'pc', 2),
  ('cp-large',    'carpets',    'Carpet (large)',             'mdi:carpet',          599, 'pc', 3)
on conflict (id) do update set
  service_id = excluded.service_id,
  name = excluded.name,
  icon = excluded.icon,
  price = excluded.price,
  unit = excluded.unit,
  sort = excluded.sort;

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------

insert into public.coupons (id, code, title, name, tag, description, type, value, min_total, max_value, service_id, service_type, one_time, active, sort, tone)
values
  ('FRESH20', 'FRESH20', 'Weekend special', 'Weekend special', '20% off', 'On your next dry cleaning order.', 'percent', 20, 0, 0, 'dry-clean', 'dry-clean', false, true, 1, '#C9821A'),
  ('NEW50',   'NEW50',   'Welcome offer',   'Welcome offer',   '50% off', 'On your very first order. Up to ₹150.', 'percent', 50, 0, 150, null, null, true, true, 2, '#16279E'),
  ('FREEPICK','FREEPICK','Free pickup',     'Free pickup',     'Free delivery', 'On all orders above ₹499.', 'flat', 0, 499, 0, null, null, false, true, 3, '#1F7A50')
on conflict (id) do update set
  code = excluded.code,
  title = excluded.title,
  name = excluded.name,
  tag = excluded.tag,
  description = excluded.description,
  type = excluded.type,
  value = excluded.value,
  min_total = excluded.min_total,
  max_value = excluded.max_value,
  service_id = excluded.service_id,
  service_type = excluded.service_type,
  one_time = excluded.one_time,
  active = excluded.active,
  sort = excluded.sort,
  tone = excluded.tone;
