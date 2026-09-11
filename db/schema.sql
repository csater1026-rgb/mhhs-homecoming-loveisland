-- Run this once against your Vercel Postgres (Neon) database — e.g. from the
-- Neon dashboard's SQL editor, or `psql "$DATABASE_URL" -f db/schema.sql`.

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

-- Single-row table: locked couples, generated match results, and the
-- teacher's position in the mystery reveal. Owner-only, students never
-- touch this.
create table if not exists app_state (
  id text primary key default 'main',
  locked_pairs jsonb not null default '[]',
  results jsonb,
  reveal_index int not null default 0,
  reveal_flipped boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into app_state (id) values ('main') on conflict (id) do nothing;
