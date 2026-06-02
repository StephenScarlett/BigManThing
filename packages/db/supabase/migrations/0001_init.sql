-- BigManThing initial schema
-- Migration 0001 — tables, enums, indexes. RLS lives in 0002_rls.sql.

create extension if not exists "citext";
create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint username_format check (
    char_length(username) between 3 and 20
    and username ~ '^[A-Za-z0-9_]+$'
  )
);

------------------------------------------------------------------------------
-- entities (the shared content library — both modes pull from here)
------------------------------------------------------------------------------
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  category text not null check (category in (
    'folklore','historical_figure','musician_influencer','food_drink','place',
    'animal','mas_carnival','slang_phrase','sports','politics','tv_film_internet'
  )),
  era text not null check (era in (
    'pre_1900','y1900_1962','y1962_2000','y2000s','y2010s','y2020s','timeless'
  )),
  region text not null check (region in (
    'north_trinidad','south_trinidad','east_trinidad','central_trinidad',
    'tobago','pan_caribbean','diaspora','mythical'
  )),
  vibe_tags text[] not null default '{}',
  real_or_fictional boolean not null,
  sense text not null check (sense in ('sight','sound','taste','smell','touch','mixed')),
  letter_count int generated always as (char_length(regexp_replace(name, '\s', '', 'g'))) stored,
  first_letter char(1) generated always as (upper(substring(name from 1 for 1))) stored,
  description text,
  image_url text,
  audio_url text,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  guess_nah_enabled boolean not null default true,
  draw_nah_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entities_guess_idx on public.entities (category) where guess_nah_enabled;
create index entities_draw_idx  on public.entities (category) where draw_nah_enabled;
create index entities_name_lower_idx on public.entities (lower(name));

------------------------------------------------------------------------------
-- daily_puzzles
------------------------------------------------------------------------------
create table public.daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  puzzle_date date not null,
  mode text not null check (mode in ('classic','quote','picture')),
  entity_id uuid not null references public.entities(id),
  created_at timestamptz not null default now(),
  unique (puzzle_date, mode)
);

create index daily_puzzles_date_idx on public.daily_puzzles (puzzle_date desc);

-- Public-safe view: omits entity_id so the answer can't be read pre-solve.
create view public.daily_puzzles_public as
  select id, puzzle_date, mode, created_at from public.daily_puzzles;

------------------------------------------------------------------------------
-- guess_attempts
------------------------------------------------------------------------------
create table public.guess_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_session_id text,
  puzzle_id uuid not null references public.daily_puzzles(id) on delete cascade,
  guess_entity_id uuid not null references public.entities(id),
  attempt_number int not null check (attempt_number between 1 and 6),
  feedback jsonb not null,
  created_at timestamptz not null default now(),
  constraint user_or_anon check (
    (user_id is not null) or (anon_session_id is not null)
  )
);

create index guess_attempts_lookup_idx
  on public.guess_attempts (puzzle_id, coalesce(user_id::text, anon_session_id));

------------------------------------------------------------------------------
-- daily_results
------------------------------------------------------------------------------
create table public.daily_results (
  user_id uuid references auth.users(id) on delete cascade,
  anon_session_id text,
  puzzle_id uuid not null references public.daily_puzzles(id) on delete cascade,
  attempts int not null,
  solved boolean not null,
  duration_ms int,
  created_at timestamptz not null default now(),
  -- Composite-key helper: PRIMARY KEY can't take expressions, so we materialise one.
  owner_key text generated always as (coalesce(user_id::text, anon_session_id)) stored,
  primary key (puzzle_id, owner_key),
  constraint result_user_or_anon check (
    (user_id is not null) or (anon_session_id is not null)
  )
);

------------------------------------------------------------------------------
-- user_stats
------------------------------------------------------------------------------
create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played int not null default 0,
  games_won int not null default 0,
  current_streak int not null default 0,
  max_streak int not null default 0,
  guess_distribution int[] not null default array[0,0,0,0,0,0],
  updated_at timestamptz not null default now()
);

create index user_stats_streak_idx on public.user_stats (current_streak desc);

------------------------------------------------------------------------------
-- draw_games + draw_game_players
------------------------------------------------------------------------------
create table public.draw_games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  host_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  rounds int not null,
  draw_time_seconds int not null,
  categories text[] not null default '{}'
);

create table public.draw_game_players (
  game_id uuid not null references public.draw_games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  anon_session_id text,
  nickname text not null,
  final_score int not null default 0,
  rounds_drawn int not null default 0,
  correct_guesses int not null default 0,
  owner_key text generated always as (coalesce(user_id::text, anon_session_id || ':' || nickname)) stored,
  primary key (game_id, owner_key)
);

create index draw_game_players_user_idx on public.draw_game_players (user_id);

------------------------------------------------------------------------------
-- friendships
------------------------------------------------------------------------------
create table public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendship_order check (user_a < user_b)
);

------------------------------------------------------------------------------
-- reports + audit_log
------------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  target_kind text not null check (target_kind in ('entity','user','message','draw_game')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

create trigger entities_set_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

create trigger user_stats_set_updated_at
  before update on public.user_stats
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- profile auto-create on signup
------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
declare
  base_username text;
  candidate text;
  attempt int := 0;
begin
  base_username := regexp_replace(coalesce(split_part(new.email, '@', 1), 'trini'), '[^A-Za-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then base_username := base_username || 'fan'; end if;
  base_username := substring(base_username from 1 for 16);
  candidate := base_username;
  while exists(select 1 from public.profiles where username = candidate) loop
    attempt := attempt + 1;
    candidate := base_username || attempt::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
