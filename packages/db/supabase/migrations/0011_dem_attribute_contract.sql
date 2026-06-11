-- Dem Nah attribute contract refresh
-- New Dem puzzle model uses:
-- field, role, associations(role_group), gender, status, reach, details(output_context), origin(region)
--
-- We keep existing storage columns and enforce the new contract for new/updated rows.
-- Existing rows are not backfilled by this migration.

alter table public.entities
  drop constraint if exists dem_required;

alter table public.entities
  add constraint dem_required check (
    mode <> 'dem' or not guess_nah_enabled or (
      field is not null
      and role is not null
      and role_group is not null
      and gender is not null
      and status is not null
      and reach is not null
      and output_context is not null
      and region is not null
    )
  ) not valid;
