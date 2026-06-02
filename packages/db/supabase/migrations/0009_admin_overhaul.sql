-- BigManThing — Admin overhaul: dynamic categories, multi-select, freeform era, image storage.
-- Destructive (pre-launch): clears entities/puzzles for clean reseed.

truncate public.guess_attempts cascade;
truncate public.daily_results cascade;
truncate public.daily_puzzles cascade;
truncate public.entities cascade;

------------------------------------------------------------------------------
-- 1. attribute_options — admin-manageable category values
------------------------------------------------------------------------------
create table if not exists public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute text not null,         -- e.g. 'field', 'role_group', 'gender', 'status', 'domain_type', 'output_context', 'region', 'kind', 'heritage', 'material', 'occasion', 'sense'
  value text not null,             -- machine key e.g. 'sports'
  display_label text not null,     -- human label e.g. 'Sports'
  parent_group text,               -- for orange/partial matching (e.g. field 'music' -> group 'creative')
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (attribute, value)
);

create index attribute_options_attr_idx on public.attribute_options (attribute, sort_order);

-- Seed initial attribute options from existing hardcoded enums
insert into public.attribute_options (attribute, value, display_label, parent_group, sort_order) values
  -- field
  ('field', 'sports', 'Sports', 'sports', 0),
  ('field', 'music', 'Music', 'creative', 1),
  ('field', 'politics', 'Politics', 'civic', 2),
  ('field', 'comedy', 'Comedy', 'creative', 3),
  ('field', 'media', 'Media', 'digital', 4),
  ('field', 'business', 'Business', 'business', 5),
  ('field', 'activism', 'Activism', 'civic', 6),
  ('field', 'entertainment', 'Entertainment', 'creative', 7),
  ('field', 'social_media', 'Social Media', 'digital', 8),
  -- role_group
  ('role_group', 'athlete', 'Athlete', null, 0),
  ('role_group', 'musician', 'Musician', null, 1),
  ('role_group', 'politician', 'Politician', null, 2),
  ('role_group', 'entertainer', 'Entertainer', null, 3),
  ('role_group', 'media_personality', 'Media Personality', null, 4),
  ('role_group', 'creator', 'Creator', null, 5),
  ('role_group', 'public_figure', 'Public Figure', null, 6),
  -- gender
  ('gender', 'male', 'Male', null, 0),
  ('gender', 'female', 'Female', null, 1),
  -- status
  ('status', 'active', 'Active', null, 0),
  ('status', 'retired', 'Retired', null, 1),
  ('status', 'deceased', 'Deceased', null, 2),
  -- domain_type
  ('domain_type', 'elite_global_performer', 'Elite Global Performer', 'global_tier', 0),
  ('domain_type', 'international_professional', 'International Professional', 'global_tier', 1),
  ('domain_type', 'regional_icon', 'Regional Icon', 'national_tier', 2),
  ('domain_type', 'national_figure', 'National Figure', 'national_tier', 3),
  ('domain_type', 'local_creator', 'Local Creator', 'local_tier', 4),
  ('domain_type', 'cultural_legend', 'Cultural Legend', 'local_tier', 5),
  -- output_context
  ('output_context', 'stadium_sport', 'Stadium Sport', 'stadium_sport', 0),
  ('output_context', 'studio_music', 'Studio Music', 'performance', 1),
  ('output_context', 'live_performance', 'Live Performance', 'performance', 2),
  ('output_context', 'digital_content', 'Digital Content', 'media', 3),
  ('output_context', 'political_office', 'Political Office', 'political_office', 4),
  ('output_context', 'radio_media', 'Radio / Media', 'media', 5),
  ('output_context', 'stage_comedy', 'Stage Comedy', 'performance', 6),
  -- region
  ('region', 'tobago', 'Tobago', null, 0),
  ('region', 'trinidad_north', 'Trinidad North', null, 1),
  ('region', 'trinidad_south', 'Trinidad South', null, 2),
  ('region', 'trinidad_central', 'Trinidad Central', null, 3),
  ('region', 'caribbean_wide', 'Caribbean Wide', null, 4),
  -- kind (ting)
  ('kind', 'food', 'Food', null, 0),
  ('kind', 'drink', 'Drink', null, 1),
  ('kind', 'instrument', 'Instrument', null, 2),
  ('kind', 'wearable', 'Wearable', null, 3),
  ('kind', 'tool_object', 'Tool / Object', null, 4),
  -- heritage (ting)
  ('heritage', 'african', 'African', null, 0),
  ('heritage', 'indian', 'Indian', null, 1),
  ('heritage', 'european', 'European', null, 2),
  ('heritage', 'indigenous', 'Indigenous', null, 3),
  ('heritage', 'creole', 'Creole', null, 4),
  -- material (ting)
  ('material', 'edible', 'Edible', null, 0),
  ('material', 'liquid', 'Liquid', null, 1),
  ('material', 'metal', 'Metal', null, 2),
  ('material', 'wood', 'Wood', null, 3),
  ('material', 'fabric', 'Fabric', null, 4),
  ('material', 'mixed', 'Mixed', null, 5),
  -- occasion (ting)
  ('occasion', 'everyday', 'Everyday', null, 0),
  ('occasion', 'carnival', 'Carnival', null, 1),
  ('occasion', 'religious', 'Religious', null, 2),
  ('occasion', 'holiday', 'Holiday', null, 3),
  ('occasion', 'special', 'Special', null, 4),
  -- sense (ting)
  ('sense', 'taste', 'Taste', null, 0),
  ('sense', 'sound', 'Sound', null, 1),
  ('sense', 'sight', 'Sight', null, 2),
  ('sense', 'smell', 'Smell', null, 3),
  ('sense', 'touch', 'Touch', null, 4),
  -- reach (ting)
  ('reach', 'local_legend', 'Local Legend', null, 0),
  ('reach', 'trinidad_wide', 'Trinidad Wide', null, 1),
  ('reach', 'caribbean_wide', 'Caribbean Wide', null, 2),
  ('reach', 'global', 'Global', null, 3),
  -- difficulty
  ('difficulty', 'easy', 'Easy', null, 0),
  ('difficulty', 'medium', 'Medium', null, 1),
  ('difficulty', 'hard', 'Hard', null, 2);

------------------------------------------------------------------------------
-- 2. Convert single-value columns to arrays for multi-select
------------------------------------------------------------------------------
-- Drop ALL check constraints (named + auto-named inline constraints) that
-- reference the columns we're converting. PostgreSQL names inline constraints
-- as {tablename}_{columnname}_check, so we drop those explicitly.
alter table public.entities
  drop constraint if exists dem_required,
  drop constraint if exists ting_required,
  drop constraint if exists entities_era_check,
  drop constraint if exists entities_status_check,
  -- Inline check constraints auto-named by Postgres from ADD COLUMN ... CHECK(...)
  drop constraint if exists entities_field_check,
  drop constraint if exists entities_gender_check,
  drop constraint if exists entities_role_group_check,
  drop constraint if exists entities_domain_type_check,
  drop constraint if exists entities_output_context_check,
  drop constraint if exists entities_region_check,
  drop constraint if exists entities_kind_check,
  drop constraint if exists entities_heritage_check,
  drop constraint if exists entities_material_check,
  drop constraint if exists entities_occasion_check,
  drop constraint if exists entities_sense_check,
  drop constraint if exists entities_reach_check;

-- Convert dem single-value → text[]
alter table public.entities
  alter column field type text[] using case when field is not null then array[field] else null end,
  alter column role type text[] using case when role is not null then array[role] else null end,
  alter column role_group type text[] using case when role_group is not null then array[role_group] else null end,
  alter column gender type text[] using case when gender is not null then array[gender] else null end,
  alter column status type text[] using case when status is not null then array[status] else null end,
  alter column domain_type type text[] using case when domain_type is not null then array[domain_type] else null end,
  alter column output_context type text[] using case when output_context is not null then array[output_context] else null end,
  alter column region type text[] using case when region is not null then array[region] else null end;

-- Convert ting single-value → text[]
alter table public.entities
  alter column kind type text[] using case when kind is not null then array[kind] else null end,
  alter column heritage type text[] using case when heritage is not null then array[heritage] else null end,
  alter column material type text[] using case when material is not null then array[material] else null end,
  alter column occasion type text[] using case when occasion is not null then array[occasion] else null end,
  alter column sense type text[] using case when sense is not null then array[sense] else null end,
  alter column reach type text[] using case when reach is not null then array[reach] else null end;

------------------------------------------------------------------------------
-- 3. Replace era enum with freeform year range
------------------------------------------------------------------------------
alter table public.entities drop column if exists era;
alter table public.entities
  add column era_start smallint,  -- e.g. 1980
  add column era_end   smallint;  -- e.g. 1999

------------------------------------------------------------------------------
-- 4. Storage bucket for entity images (run separately if using CLI)
------------------------------------------------------------------------------
-- Note: Supabase storage bucket creation is done via Dashboard or CLI:
--   supabase storage create entity-images --public
-- The image_url column already exists on entities.

------------------------------------------------------------------------------
-- 5. RLS for attribute_options (admin-only write, public read)
------------------------------------------------------------------------------
alter table public.attribute_options enable row level security;

create policy "Anyone can read attribute options"
  on public.attribute_options for select
  using (true);

create policy "Admins can manage attribute options"
  on public.attribute_options for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
