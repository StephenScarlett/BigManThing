-- BigManThing — Dem Nah people-only redesign.
-- Removes folklore from Guess Nah. Replaces type/domain/form/alignment with
-- field/role/gender/recognition. New era brackets for people.
--
-- Destructive migration: clears entities/puzzles. Safe pre-launch.

-- 1. Wipe dependent rows.
truncate public.guess_attempts cascade;
truncate public.daily_results cascade;
truncate public.daily_puzzles cascade;
truncate public.entities cascade;

-- 2. Drop old dem-only columns.
alter table public.entities
  drop column if exists type,
  drop column if exists domain,
  drop column if exists form,
  drop column if exists alignment;

-- 3. Drop old constraints that reference removed columns.
alter table public.entities drop constraint if exists dem_required;

-- 4. Add new dem columns for people-only schema.
alter table public.entities
  add column field text check (field in (
    'sports','music','politics','comedy','media',
    'business','activism','entertainment','social_media'
  )),
  add column role text,          -- e.g. cricketer, soca_artist, prime_minister — unconstrained for flexibility
  add column gender text check (gender in ('male','female'));

-- 5. Rename reach → keep for ting, add recognition for dem.
alter table public.entities
  add column recognition text check (recognition in (
    'local','caribbean','international','global'
  ));

-- 6. Update era constraint to accept new people-era brackets alongside ting eras.
alter table public.entities drop constraint if exists entities_era_check;
alter table public.entities
  add constraint entities_era_check check (era in (
    -- Dem (people) eras
    'pre_1980','y1980_1999','y2000_2009','y2010_2019','y2020_plus',
    -- Ting eras (unchanged)
    'pre_1900','y1900_1950','y1950_2000','y2000_plus','timeless'
  ));

-- 7. Update status constraint: remove folklore-only values, add 'retired'.
alter table public.entities drop constraint if exists entities_status_check;
alter table public.entities
  add constraint entities_status_check check (status in (
    'active','retired','deceased',
    -- Keep legacy values so ting rows with 'active_legend'/'mythical' still work
    'active_legend','mythical'
  ));

-- 8. New dem_required constraint: only enforced on dem + guess_nah_enabled rows.
--    Folklore entities can be mode='dem', guess_nah_enabled=false, draw_nah_enabled=true
--    with null dem columns.
alter table public.entities
  add constraint dem_required check (
    mode <> 'dem' or not guess_nah_enabled or (
      field is not null and role is not null and era is not null
      and gender is not null and recognition is not null and status is not null
    )
  );
