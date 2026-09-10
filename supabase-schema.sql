-- Run this once in the Supabase SQL Editor for your project.
-- Sets up the shared roster + owner-only match state, with row-level
-- security so students can only add themselves and only a signed-in
-- owner (see auth setup in README) can read/manage the roster.

create table if not exists islanders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  identity text not null,
  looking_for text[] not null default '{}',
  grade text,
  grade_open_to text[] not null default '{}',
  height_in int,
  height_pref text[] not null default '{}',
  interests text[] not null default '{}',
  vibes text[] not null default '{}',
  date_types text[] not null default '{}',
  music text[] not null default '{}',
  activities text[] not null default '{}',
  comm text,
  bio text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists app_state (
  id text primary key default 'main',
  locked_pairs jsonb not null default '[]',
  results jsonb,
  reveal_index int not null default 0,
  reveal_flipped boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into app_state (id) values ('main') on conflict (id) do nothing;

alter table islanders enable row level security;
alter table app_state enable row level security;

-- Anyone (students, no login) can add themselves to the roster.
create policy "anyone can join" on islanders
  for insert
  to anon, authenticated
  with check (true);

-- Only the signed-in owner can view, edit, or remove islanders.
create policy "owner can read roster" on islanders
  for select
  to authenticated
  using (true);

create policy "owner can update roster" on islanders
  for update
  to authenticated
  using (true);

create policy "owner can delete roster" on islanders
  for delete
  to authenticated
  using (true);

-- app_state (locked pairs, match results, reveal position) is owner-only.
create policy "owner can read app_state" on app_state
  for select
  to authenticated
  using (true);

create policy "owner can update app_state" on app_state
  for update
  to authenticated
  using (true);
