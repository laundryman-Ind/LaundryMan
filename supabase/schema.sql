-- Laundry Man — Supabase schema
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

-- NOTE: payment methods and the cart stay local-only for now (the app's
-- payment screen states card details never leave the device).
