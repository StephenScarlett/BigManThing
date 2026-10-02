-- Run on the development project after migrations. Everything rolls back.
-- Exercises hosted PostgreSQL's RPCs and authenticated-role boundaries.
begin;
create temporary table smoke_player as select id from public.profiles where is_admin order by created_at limit 1;
select set_config('request.jwt.claim.sub',(select id::text from smoke_player),true);
create temporary table smoke_round as select public.guess_people_start_practice(true) as state;
create temporary table smoke_data as select (s.state->'edition'->>'id')::uuid edition_id,e.answer_id,
  (select id from public.guess_people where id<>e.answer_id order by name limit 1) guess_id
  from smoke_round s join private.guess_people_editions e on e.id=(s.state->'edition'->>'id')::uuid;
grant select on smoke_player,smoke_round,smoke_data to authenticated;
set local role authenticated;
do $$ declare s jsonb; d record; begin
  select * into d from smoke_data;
  if d.edition_id is null then raise exception 'Set up an editor before running hosted smoke checks'; end if;
  s:=public.guess_people_submit(d.edition_id,d.guess_id);
  if jsonb_array_length(s->'attempts')<>1 or s->'answer'<>'null' then raise exception 'first_guess_failed'; end if;
  s:=public.guess_people_submit(d.edition_id,d.guess_id);
  if jsonb_array_length(s->'attempts')<>1 then raise exception 'retry_spent_another_attempt'; end if;
  begin
    perform 1 from private.guess_people_editions;
    raise exception 'private_table_was_accessible';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set is_admin=not is_admin where id=auth.uid();
    raise exception 'role_column_was_editable';
  exception when insufficient_privilege then null; end;
  update public.profiles set avatar_url=avatar_url where id=auth.uid();
  s:=public.guess_people_submit(d.edition_id,d.answer_id);
  if s->>'status'<>'won' or (s->'answer'->>'id')::uuid<>d.answer_id then raise exception 'winning_identity_failed'; end if;
end $$;
reset role;
select 'PASS: hosted retry, answer boundary, identity win and role permissions; rollback follows' as result;
rollback;
