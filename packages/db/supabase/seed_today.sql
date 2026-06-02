-- Insert today's puzzle for both Dem Nah and Ting Nah, picking a random
-- eligible entity per mode. Run once a day until pick-daily ships.

insert into public.daily_puzzles (puzzle_date, mode, entity_id)
select current_date, 'dem', id
from public.entities
where guess_nah_enabled and mode = 'dem'
  and not exists (
    select 1 from public.daily_puzzles d
    where d.entity_id = public.entities.id
      and d.mode = 'dem'
      and d.puzzle_date >= current_date - interval '30 days'
  )
order by random()
limit 1
on conflict (puzzle_date, mode) do nothing;

insert into public.daily_puzzles (puzzle_date, mode, entity_id)
select current_date, 'ting', id
from public.entities
where guess_nah_enabled and mode = 'ting'
  and not exists (
    select 1 from public.daily_puzzles d
    where d.entity_id = public.entities.id
      and d.mode = 'ting'
      and d.puzzle_date >= current_date - interval '30 days'
  )
order by random()
limit 1
on conflict (puzzle_date, mode) do nothing;

select * from public.daily_puzzles where puzzle_date = current_date;
