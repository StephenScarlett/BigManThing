-- BigManThing — Add Ting Nah sub-mode + restructure mode discriminator.
-- Destructive (pre-launch): wipes puzzles + attempts + entities for clean reseed.

truncate public.guess_attempts cascade;
truncate public.daily_results cascade;
truncate public.daily_puzzles cascade;
truncate public.entities cascade;

-- 1. daily_puzzles.mode: classic/quote/picture -> dem/ting
alter table public.daily_puzzles drop constraint if exists daily_puzzles_mode_check;
alter table public.daily_puzzles
  add constraint daily_puzzles_mode_check check (mode in ('dem','ting'));

-- 2. entities: add mode discriminator + Ting Nah columns (nullable, gated by check).
alter table public.entities
  add column mode text not null default 'dem' check (mode in ('dem','ting'));

-- Make Dem Nah columns nullable so Ting Nah rows can leave them null.
alter table public.entities
  alter column type drop not null,
  alter column domain drop not null,
  alter column era drop not null,
  alter column form drop not null,
  alter column alignment drop not null,
  alter column reach drop not null,
  alter column status drop not null;

-- Ting Nah columns
alter table public.entities
  add column kind text check (kind in ('food','drink','instrument','wearable','tool_object')),
  add column heritage text check (heritage in ('african','indian','european','indigenous','creole')),
  add column material text check (material in ('edible','liquid','metal','wood','fabric','mixed')),
  add column occasion text check (occasion in ('everyday','carnival','religious','holiday','special')),
  add column sense text check (sense in ('taste','sound','sight','smell','touch'));

-- 3. Per-mode required-attribute checks.
alter table public.entities
  add constraint dem_required check (
    mode <> 'dem' or (
      type is not null and domain is not null and era is not null
      and form is not null and alignment is not null and reach is not null
      and status is not null
    )
  ),
  add constraint ting_required check (
    mode <> 'ting' or (
      kind is not null and heritage is not null and era is not null
      and material is not null and occasion is not null and sense is not null
      and reach is not null
    )
  );

-- 4. Indexes.
drop index if exists public.entities_guess_idx;
drop index if exists public.entities_draw_idx;
create index entities_mode_idx on public.entities (mode) where guess_nah_enabled;
create index entities_draw_idx on public.entities (mode) where draw_nah_enabled;
