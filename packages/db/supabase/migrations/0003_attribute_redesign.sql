-- BigManThing — Attribute redesign for unified Person + Folklore mode.
-- Replaces (category, era, region, sense, vibe_tags, real_or_fictional, letter_count)
-- with (type, domain, era[new], form, alignment, reach, status). first_letter stays.
--
-- This is a destructive migration: clears all entities/puzzles. Safe pre-launch.

-- 1. Wipe dependent rows so we can drop columns cleanly.
truncate public.guess_attempts cascade;
truncate public.daily_results cascade;
truncate public.daily_puzzles cascade;
truncate public.entities cascade;

-- 2. Drop indexes that reference soon-to-be-dropped columns.
drop index if exists public.entities_guess_idx;
drop index if exists public.entities_draw_idx;

-- 3. Drop old columns (their check constraints come along).
alter table public.entities
  drop column if exists category,
  drop column if exists era,
  drop column if exists region,
  drop column if exists sense,
  drop column if exists vibe_tags,
  drop column if exists real_or_fictional,
  drop column if exists letter_count;

-- 4. Add new attribute columns.
alter table public.entities
  add column type text not null check (type in ('person','folklore')),
  add column domain text not null check (domain in (
    'sports','music','politics','culture','media','folklore','nature','religion'
  )),
  add column era text not null check (era in (
    'pre_1900','y1900_1950','y1950_2000','y2000_plus','timeless'
  )),
  add column form text not null check (form in (
    'human','humanoid','spirit','creature','shapeshifter'
  )),
  add column alignment text not null check (alignment in (
    'heroic','neutral','mischievous','sinister','protector'
  )),
  add column reach text not null check (reach in (
    'local_legend','trinidad_wide','caribbean_wide','global'
  )),
  add column status text not null check (status in (
    'alive','deceased','active_legend','mythical'
  ));

-- 5. Recreate indexes against the new shape.
create index entities_guess_idx on public.entities (type) where guess_nah_enabled;
create index entities_draw_idx  on public.entities (type) where draw_nah_enabled;
