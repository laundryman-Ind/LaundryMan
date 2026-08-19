-- Laundry Man — Complete Supabase schema (Updated with Sync & Coupon Fixes)
-- Run in the Supabase dashboard → SQL Editor → Run.
-- Idempotent: safe to re-run (IF NOT EXISTS + drop-policy guards).

-- ---------------------------------------------------------------------------
-- PROFILES — one row per authenticated user, keyed by auth.users.id.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text not null default '',
  photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- ADDRESSES — saved delivery addresses. The full app object is kept in `data`
-- (jsonb) so the app round-trips exactly; the key columns make queries cheap.
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '',
  line text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

drop policy if exists "Users can view own addresses" on public.addresses;
create policy "Users can view own addresses"
on public.addresses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own addresses" on public.addresses;
create policy "Users can create own addresses"
on public.addresses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.addresses;
create policy "Users can update own addresses"
on public.addresses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own addresses" on public.addresses;
create policy "Users can delete own addresses"
on public.addresses
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

-- ---------------------------------------------------------------------------
-- CARTS — per-user shopping cart stored as JSON in `data` (one row per user).
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.carts enable row level security;

drop policy if exists "Users can view own carts" on public.carts;
create policy "Users can view own carts"
on public.carts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own carts" on public.carts;
create policy "Users can create own carts"
on public.carts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own carts" on public.carts;
create policy "Users can update own carts"
on public.carts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own carts" on public.carts;
create policy "Users can delete own carts"
on public.carts
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists carts_user_id_idx on public.carts (user_id);

-- ---------------------------------------------------------------------------
-- ORDERS — placed orders (items, timeline, address, payment, rider live in
-- the `data` jsonb; status_key/total/placed_at are queryable columns).
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status_key text not null default 'placed',
  total numeric not null default 0,
  placed_at bigint,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own orders" on public.orders;
create policy "Users can update own orders"
on public.orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own orders" on public.orders;
create policy "Users can delete own orders"
on public.orders
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists orders_user_id_idx on public.orders (user_id);

-- ---------------------------------------------------------------------------
-- REVIEWS — one review per order, keyed by order id + user id.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id text primary key,
  order_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, user_id)
);

alter table public.reviews enable row level security;

drop policy if exists "Users can view own reviews" on public.reviews;
create policy "Users can view own reviews"
on public.reviews
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own reviews" on public.reviews;
create policy "Users can create own reviews"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own reviews" on public.reviews;
create policy "Users can update own reviews"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews"
on public.reviews
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists reviews_order_id_idx on public.reviews (order_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

-- ---------------------------------------------------------------------------
-- SERVICES — public service catalog (wash & fold, dry clean, etc.).
-- RLS allows anonymous reads so the app works before login.
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id text primary key,
  name text not null,
  sub text default '',
  icon text default '',
  span text default 'span-2',
  photo text default '',
  tone text default '',
  flat text default '',
  price text default '',
  sort integer default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

drop policy if exists "Anyone can view active services" on public.services;
create policy "Anyone can view active services"
on public.services
for select
to anon, authenticated
using (active = true);

-- ---------------------------------------------------------------------------
-- SERVICE_ITEMS — priced items within each service (per-kg, per-pc, etc.).
-- ---------------------------------------------------------------------------
create table if not exists public.service_items (
  id text primary key,
  service_id text not null references public.services(id) on delete cascade,
  name text not null,
  icon text default '',
  price numeric not null default 0,
  unit text not null default 'pc',
  sort integer default 0,
  created_at timestamptz not null default now()
);

alter table public.service_items enable row level security;

drop policy if exists "Anyone can view service items" on public.service_items;
create policy "Anyone can view service items"
on public.service_items
for select
to anon, authenticated
using (true);

create index if not exists service_items_service_id_idx on public.service_items (service_id);

-- ---------------------------------------------------------------------------
-- COUPONS — public coupon / promo-code catalog.
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id text primary key,
  code text unique not null,
  title text not null default 'Offer',
  name text default '',
  tag text default 'Limited-time offer',
  description text default '',
  type text not null default 'percent',
  discount_type text default '',
  value numeric not null default 0,
  discount_value numeric default 0,
  min_total numeric default 0,
  min_order numeric default 0,
  max_value numeric default 0,
  max_discount numeric default 0,
  service_id text default null,
  service_type text default null,
  category text default null,
  one_time boolean default false,
  single_use boolean default false,
  usage_limit integer default null,
  active boolean not null default true,
  sort integer default 0,
  tone text default '#16279E',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure usage_limit exists if table already existed
alter table public.coupons add column if not exists usage_limit integer default null;

alter table public.coupons enable row level security;

drop policy if exists "Anyone can view active coupons" on public.coupons;
create policy "Anyone can view active coupons"
on public.coupons
for select
to anon, authenticated
using (active = true);

create index if not exists coupons_code_idx on public.coupons (code);

-- ---------------------------------------------------------------------------
-- COUPON_USES — tracks which coupons each user has redeemed.
-- Unique constraint prevents concurrent/race condition duplicate use.
-- ---------------------------------------------------------------------------
create table if not exists public.coupon_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coupon_id text default null,
  coupon_code text not null default '',
  order_id text default null,
  created_at timestamptz not null default now()
);

-- Ensure columns & constraints exist if table already existed
alter table public.coupon_uses add column if not exists coupon_code text not null default '';
alter table public.coupon_uses add column if not exists order_id text default null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coupon_uses_user_coupon_unique'
  ) then
    -- Clean duplicates before applying constraint
    delete from public.coupon_uses a
    using public.coupon_uses b
    where a.user_id = b.user_id
      and a.coupon_code = b.coupon_code
      and a.coupon_code <> ''
      and a.created_at > b.created_at;

    alter table public.coupon_uses
      add constraint coupon_uses_user_coupon_unique unique (user_id, coupon_code);
  end if;
end $$;

alter table public.coupon_uses enable row level security;

drop policy if exists "Users can view own coupon uses" on public.coupon_uses;
create policy "Users can view own coupon uses"
on public.coupon_uses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can record own coupon use" on public.coupon_uses;
create policy "Users can record own coupon use"
on public.coupon_uses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own coupon use" on public.coupon_uses;
create policy "Users can delete own coupon use"
on public.coupon_uses
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists coupon_uses_user_id_idx on public.coupon_uses (user_id);
create index if not exists coupon_uses_coupon_code_idx on public.coupon_uses (coupon_code);

-- ---------------------------------------------------------------------------
-- RIDERS — delivery partners (public read for tracking UI).
-- ---------------------------------------------------------------------------
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text default '',
  phone_href text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.riders enable row level security;

drop policy if exists "Anyone can view active riders" on public.riders;
create policy "Anyone can view active riders"
on public.riders
for select
to anon, authenticated
using (active = true);

-- ---------------------------------------------------------------------------
-- PAYMENTS — saved payment instruments per user.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'upi',
  label text not null default '',
  detail text default '',
  icon text default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can manage own payments" on public.payments;
create policy "Users can manage own payments"
on public.payments
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists payments_user_id_idx on public.payments (user_id);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — in-app notification inbox per user.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  body text default '',
  type text default 'info',
  read boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists notifications_user_id_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- PUSH_TOKENS — device push notification tokens (APNs / FCM).
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text default 'android',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users can manage own push tokens" on public.push_tokens;
create policy "Users can manage own push tokens"
on public.push_tokens
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists push_tokens_token_idx on public.push_tokens (token);

-- ---------------------------------------------------------------------------
-- REDEEM_COUPON — Atomic coupon validation & usage recording RPC function
-- Prevents multi-device race condition bypasses and enforces limits in DB.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_coupon(
  p_user_id uuid,
  p_coupon_code text,
  p_order_id text,
  p_cart_total numeric,
  p_service_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_coupon record;
  v_use_count integer;
  v_discount numeric := 0;
  v_max_uses integer;
begin
  -- 1) Look up the coupon with row locking
  select * into v_coupon
  from public.coupons
  where code = upper(trim(p_coupon_code))
    and active = true
  for update;

  if v_coupon is null then
    return jsonb_build_object('ok', false, 'error', 'Coupon not found or inactive');
  end if;

  -- 2) Check minimum order total
  if coalesce(v_coupon.min_total, v_coupon.min_order, 0) > 0
     and p_cart_total < coalesce(v_coupon.min_total, v_coupon.min_order, 0) then
    return jsonb_build_object('ok', false, 'error',
      format('Minimum order of ₹%s required', coalesce(v_coupon.min_total, v_coupon.min_order, 0)));
  end if;

  -- 3) Check service restriction
  if v_coupon.service_id is not null and v_coupon.service_id <> '' then
    if not (lower(v_coupon.service_id) = any(
      select lower(unnest) from unnest(p_service_ids)
    )) then
      return jsonb_build_object('ok', false, 'error',
        format('Valid only for %s orders', replace(v_coupon.service_id, '-', ' ')));
    end if;
  end if;

  -- 4) Check usage limit
  v_max_uses := coalesce(v_coupon.usage_limit, case when v_coupon.one_time or v_coupon.single_use then 1 else null end);

  if v_max_uses is not null then
    select count(*) into v_use_count
    from public.coupon_uses
    where user_id = p_user_id
      and coupon_code = upper(trim(p_coupon_code));

    if v_use_count >= v_max_uses then
      return jsonb_build_object('ok', false, 'error', 'This coupon has already been used');
    end if;
  end if;

  -- 5) Calculate discount
  if lower(coalesce(v_coupon.type, v_coupon.discount_type, 'percent')) in ('flat', 'fixed', 'amount', 'inr') then
    v_discount := least(coalesce(v_coupon.value, v_coupon.discount_value, 0), p_cart_total);
  else
    v_discount := p_cart_total * (coalesce(v_coupon.value, v_coupon.discount_value, 0) / 100.0);
    if coalesce(v_coupon.max_value, v_coupon.max_discount, 0) > 0 then
      v_discount := least(v_discount, coalesce(v_coupon.max_value, v_coupon.max_discount, 0));
    end if;
  end if;

  v_discount := greatest(v_discount, 0);

  -- 6) Record usage
  if v_max_uses is not null then
    insert into public.coupon_uses (user_id, coupon_id, coupon_code, order_id)
    values (p_user_id, v_coupon.id, upper(trim(p_coupon_code)), p_order_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'discount_amount', v_discount,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.code
  );
end;
$$;
