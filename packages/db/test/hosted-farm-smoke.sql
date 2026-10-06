-- Development PostgreSQL role smoke. All fixture changes roll back.
begin;
create temporary table farm_smoke_data as select p.id as owner,w.default_appearance as appearance,
  jsonb_build_object('scene','house','actor',w.worlds->'house'->'spawn') as position
  from public.profiles p cross join private.farm_world_versions w where w.version=1 order by p.created_at limit 1;
grant select on farm_smoke_data to authenticated;
select set_config('request.jwt.claim.sub',(select owner::text from farm_smoke_data),true);
set local role authenticated;
do $$ declare d record; s jsonb; again jsonb; ack jsonb; request uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); before_wallet jsonb; begin
  select * into d from farm_smoke_data;
  if d.owner is null then raise exception 'smoke_account_required'; end if;
  before_wallet:=public.bmt_home_context();
  s:=public.bmt_farm_create(d.owner,d.appearance,'Smoke farmer',request);
  again:=public.bmt_farm_create(d.owner,d.appearance,'Duplicate create',gen_random_uuid());
  if s<>again or s->'starter_grant'->>'key'<>'farm-starter-v1' then raise exception 'starter_repeated'; end if;
  if (select (value->>'quantity')::integer from jsonb_array_elements(s->'inventory') where value->>'item_id'='mystery-seed-basic')<>6 then raise exception 'kit_missing'; end if;
  if public.bmt_home_context()->'coins' is distinct from before_wallet->'coins' or public.bmt_home_context()->'tickets' is distinct from before_wallet->'tickets' then raise exception 'wallet_changed'; end if;
  request:=gen_random_uuid();
  ack:=public.bmt_farm_save_character(d.owner,d.appearance,'Smoke saved',(s->>'character_revision')::integer,request);
  if ack<>public.bmt_farm_save_character(d.owner,d.appearance,'Smoke saved',(s->>'character_revision')::integer,request) then raise exception 'character_retry_changed'; end if;
  begin
    perform public.bmt_farm_save_character(d.owner,d.appearance,'Stale',(s->>'character_revision')::integer,gen_random_uuid());
    raise exception 'stale_character_accepted';
  exception when others then if sqlerrm<>'character_changed_reload' then raise; end if; end;
  request:=gen_random_uuid();
  ack:=public.bmt_farm_save_position(d.owner,d.position,(s->>'position_revision')::integer,1,request);
  if ack<>public.bmt_farm_save_position(d.owner,d.position,(s->>'position_revision')::integer,1,request) then raise exception 'position_retry_changed'; end if;
  begin
    perform public.bmt_farm_save_position(d.owner,'{"scene":"house","actor":{"x":0,"y":0,"facing":"up"}}'::jsonb,(ack->>'position_revision')::integer,1,gen_random_uuid());
    raise exception 'blocked_position_accepted';
  exception when others then if sqlerrm<>'invalid_position' then raise; end if; end;
  begin perform 1 from private.farm_inventory; raise exception 'private_inventory_accessible'; exception when insufficient_privilege then null; end;
  begin perform private.farm_prune_receipts(d.owner); raise exception 'private_helper_accessible'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',other::text,true);
  if public.bmt_farm_context(other) is not null then raise exception 'another_identity_received_farm'; end if;
  begin perform public.bmt_farm_context(d.owner); raise exception 'cross_owner_context_accepted'; exception when others then if sqlerrm<>'owner_changed' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',d.owner::text,true);
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.bmt_farm_context(null); raise exception 'anon_call_accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: hosted owned farm, one starter kit, save retries/revisions, geometry, private/anonymous denial; rollback follows' as result;
rollback;
