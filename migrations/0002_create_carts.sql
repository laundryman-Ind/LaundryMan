-- Migration: create carts table for per-user cart storage
-- Run this in your Supabase SQL editor (or psql) to create the table and RLS policies.

create table if not exists public.carts (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Optional index for faster lookups by user
create index if not exists idx_carts_user_id on public.carts (user_id);

-- Enable Row Level Security and allow each authenticated user to only access their own row
alter table public.carts enable row level security;

-- Policy: allow authenticated users to select their own cart
create policy "Allow users to select their cart" on public.carts
  for select using (user_id = auth.uid());

-- Policy: allow authenticated users to insert (and ensure user_id matches their uid)
create policy "Allow users to insert their cart" on public.carts
  for insert with check (user_id = auth.uid());

-- Policy: allow authenticated users to update/delete their own cart
create policy "Allow users to modify their cart" on public.carts
  for update, delete using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notes:
-- 1) If your other tables use 'id' = auth.uid() as primary key, you may prefer to
--    use the user's id as the row id too (upsert uses 'id' ON CONFLICT 'id' in the client).
-- 2) Adjust names/types to match your project's conventions (some apps use text ids).
-- 3) After running this, the frontend `upsertCart` / `getCart` functions should work.
