-- BigManThing — Hybrid discriminator system for Dem Nah.
-- Adds domain_type + output_context + region + role_group.
-- Drops recognition (superseded by domain_type).
-- Destructive: clears entities/puzzles. Safe pre-launch.

truncate public.guess_attempts cascade;
truncate public.daily_results cascade;
truncate public.daily_puzzles cascade;
truncate public.entities cascade;

-- 1. Drop old column.
alter table public.entities drop column if exists recognition;

-- 2. Add new discriminator columns.
alter table public.entities
  add column domain_type text check (domain_type in (
    'elite_global_performer','international_professional','regional_icon',
    'national_figure','local_creator','cultural_legend'
  )),
  add column output_context text check (output_context in (
    'stadium_sport','studio_music','live_performance','digital_content',
    'political_office','radio_media','stage_comedy'
  )),
  add column region text check (region in (
    'tobago','trinidad_north','trinidad_south','trinidad_central','caribbean_wide'
  )),
  add column role_group text check (role_group in (
    'athlete','musician','politician','entertainer','media_personality',
    'creator','public_figure'
  ));

-- 3. Update dem_required constraint.
alter table public.entities drop constraint if exists dem_required;
alter table public.entities
  add constraint dem_required check (
    mode <> 'dem' or not guess_nah_enabled or (
      field is not null and role is not null and role_group is not null
      and era is not null and gender is not null and status is not null
      and domain_type is not null and output_context is not null
      -- region is intentionally optional
    )
  );
