-- Entity schema cleanup
-- 1) Rename Dem columns to user-facing names.
-- 2) Drop unused columns.
-- 3) Keep attribute_options aligned with renamed attributes.

alter table public.entities
  rename column role_group to affiliations;

alter table public.entities
  rename column output_context to details;

alter table public.entities
  rename column region to origin;

-- Drop columns no longer used by Guess Nah / Draw Nah runtime.
alter table public.entities
  drop column if exists domain_type,
  drop column if exists audio_url;

-- Rebuild Dem required constraint using final names.
alter table public.entities
  drop constraint if exists dem_required;

alter table public.entities
  add constraint dem_required check (
    mode <> 'dem' or not guess_nah_enabled or (
      field is not null
      and role is not null
      and affiliations is not null
      and gender is not null
      and status is not null
      and reach is not null
      and details is not null
      and origin is not null
    )
  ) not valid;

-- Keep admin option keys in sync with physical columns.
update public.attribute_options
set attribute = 'affiliations'
where attribute = 'role_group';

update public.attribute_options
set attribute = 'details'
where attribute = 'output_context';

update public.attribute_options
set attribute = 'origin'
where attribute = 'region';

-- Drop stale options for removed column.
delete from public.attribute_options
where attribute = 'domain_type';
