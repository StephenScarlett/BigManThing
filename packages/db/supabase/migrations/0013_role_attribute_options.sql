-- Ensure `role` is managed through attribute_options like other attributes.
-- Backfill any existing role values from entities into attribute_options.

with role_values as (
  select distinct unnest(role) as value
  from public.entities
  where role is not null
), max_sort as (
  select coalesce(max(sort_order), -1) as v
  from public.attribute_options
  where attribute = 'role'
)
insert into public.attribute_options (attribute, value, display_label, parent_group, sort_order)
select
  'role' as attribute,
  rv.value,
  initcap(replace(rv.value, '_', ' ')) as display_label,
  null as parent_group,
  ms.v + row_number() over (order by rv.value) as sort_order
from role_values rv
cross join max_sort ms
where rv.value is not null
  and btrim(rv.value) <> ''
on conflict (attribute, value) do nothing;
