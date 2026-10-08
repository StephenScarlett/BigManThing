-- Development-only verification after farm_crops_v1. Every fixture write rolls
-- back. Uses one existing farm owner without creating/resetting Auth accounts.
begin;
do $$
declare
 owner uuid; other uuid:=gen_random_uuid(); state jsonb; ack jsonb; replay jsonb;
 first jsonb; body jsonb; request uuid; crop uuid; item text; plot text;
 rev integer; seeds integer; coins integer; price integer; snapshot jsonb;
begin
 select user_id into owner from private.farm_players order by user_id limit 1;
 if owner is null then raise exception 'smoke_requires_existing_farm'; end if;
 select jsonb_build_object('farm',to_jsonb(f),'wallet',to_jsonb(w),
   'kit',(select jsonb_agg(to_jsonb(i) order by item_id) from private.farm_inventory i where i.user_id=owner))
 into snapshot from private.farm_players f join private.home_players w using(user_id) where f.user_id=owner;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 execute 'set local role authenticated';
 state:=public.bmt_farm_crops_context(owner);
 assert (state->>'growth_seconds')::integer=86400,'24-hour growth';
 assert jsonb_array_length(state->'catalog')=2,'pilot catalogue';
 assert jsonb_array_length(state->'plots')=6,'frozen farm plots';
 seeds:=(state->>'seed_quantity')::integer;coins:=(state->>'coins')::integer;
 select value->>'plot_id' into plot from jsonb_array_elements(state->'plots') where value->'crop'='null'::jsonb limit 1;
 assert plot is not null and seeds>0,'one empty plot and starter seed required';
 rev:=(state->>'revision')::integer;request:=gen_random_uuid();body:=jsonb_build_object('kind','plant','plot_id',plot);
 first:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert (first->'state'->>'seed_quantity')::integer=seeds-1,'one seed consumed';
 select (value->'crop'->>'id')::uuid into crop from jsonb_array_elements(first->'state'->'plots') where value->>'plot_id'=plot;
 assert not (first->'receipt' ? 'item_id'),'receipt conceals outcome';
 assert not exists(select 1 from jsonb_array_elements(first->'state'->'plots') where value->>'plot_id'=plot and value->'crop'->'reveal'<>'null'::jsonb),'context conceals outcome';
 replay:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert replay->'receipt'=first->'receipt','immutable receipt';
 assert (replay->'state'->>'seed_quantity')::integer=seeds-1,'retry conserves seeds';
 begin
  perform public.bmt_farm_crop_action(owner,jsonb_build_object('kind','restock'),rev,gen_random_uuid());
  raise exception 'stale_revision_accepted';
 exception when others then if sqlerrm<>'crops_changed_reload' then raise;end if;end;
 rev:=(first->'state'->>'revision')::integer;request:=gen_random_uuid();body:=jsonb_build_object('kind','water','crop_id',crop);
 ack:=public.bmt_farm_crop_action(owner,body,rev,request);
 select value->'crop' into state from jsonb_array_elements(ack->'state'->'plots') where value->>'plot_id'=plot;
 assert (state->>'ready_at')::timestamptz-(state->>'watered_at')::timestamptz=interval '24 hours','server timer';
 assert state->'reveal'='null'::jsonb,'watering conceals outcome';
 replay:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert replay->'receipt'=ack->'receipt','watering retry';
 begin
  perform public.bmt_farm_crop_action(owner,jsonb_build_object('kind','harvest','crop_id',crop),(ack->'state'->>'revision')::integer,gen_random_uuid());
  raise exception 'early_harvest_accepted';
 exception when others then if sqlerrm<>'crop_not_ready' then raise;end if;end;
 begin
  execute 'select * from private.farm_crops';raise exception 'private_rows_exposed';
 exception when insufficient_privilege then null;end;
 begin
  perform private.home_credit(owner,'forbidden-f2-smoke',0,100);raise exception 'credit_helper_exposed';
 exception when insufficient_privilege then null;end;
 begin
  perform public.bmt_farm_crops_context(other);raise exception 'foreign_owner_accepted';
 exception when others then if sqlerrm<>'owner_changed' then raise;end if;end;
 execute 'reset role';
 -- Advance only the test crop inside this rolled-back transaction. No rules or
 -- production growth durations change, and no existing crop is touched.
 update private.farm_crops set watered_at=clock_timestamp()-interval '25 hours',ready_at=clock_timestamp()-interval '1 hour' where id=crop;
 execute 'set local role authenticated';
 state:=public.bmt_farm_crops_context(owner);
 select value->'crop' into ack from jsonb_array_elements(state->'plots') where value->>'plot_id'=plot;
 assert ack->>'stage'='ready' and ack->'reveal'<>'null'::jsonb,'server reveals maturity';
 item:=ack->'reveal'->>'item_id';price:=(ack->'reveal'->>'sale_value')::integer;
 rev:=(state->>'revision')::integer;request:=gen_random_uuid();body:=jsonb_build_object('kind','harvest','crop_id',crop);
 ack:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert exists(select 1 from jsonb_array_elements(ack->'state'->'plots') where value->>'plot_id'=plot and value->'crop'='null'::jsonb),'harvest frees plot';
 assert (ack->'state'->>'coins')::integer=coins,'harvest keeps produce';
 replay:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert replay->'state'=ack->'state' or replay->'state'->'goods'=ack->'state'->'goods','harvest retry conserves goods';
 ack:=public.bmt_farm_crop_action(owner,jsonb_build_object('kind','store','item_id',item,'quantity',1),(ack->'state'->>'revision')::integer,gen_random_uuid());
 assert exists(select 1 from jsonb_array_elements(ack->'state'->'goods') where value->>'item_id'=item and value->>'location'='chest' and (value->>'quantity')::integer>=1),'chest receives produce';
 ack:=public.bmt_farm_crop_action(owner,jsonb_build_object('kind','withdraw','item_id',item,'quantity',1),(ack->'state'->>'revision')::integer,gen_random_uuid());
 rev:=(ack->'state'->>'revision')::integer;request:=gen_random_uuid();body:=jsonb_build_object('kind','sell','item_id',item,'quantity',1);
 ack:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert (ack->'state'->>'coins')::integer=coins+price,'one sale credit';
 replay:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert (replay->'state'->>'coins')::integer=coins+price,'sale retry does not pay twice';
 rev:=(ack->'state'->>'revision')::integer;request:=gen_random_uuid();body:=jsonb_build_object('kind','buy','quantity',1);
 ack:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert (ack->'state'->>'coins')::integer=coins+price-10 and (ack->'state'->>'seed_quantity')::integer=seeds,'one server-priced purchase';
 replay:=public.bmt_farm_crop_action(owner,body,rev,request);
 assert replay->'state'->'coins'=ack->'state'->'coins','buy retry does not debit twice';
 if not (ack->'state'->>'restock_claimed')::boolean then
  ack:=public.bmt_farm_crop_action(owner,jsonb_build_object('kind','restock'),(ack->'state'->>'revision')::integer,gen_random_uuid());
  assert (ack->'state'->>'seed_quantity')::integer=seeds+2,'two daily recovery seeds';
  begin
   perform public.bmt_farm_crop_action(owner,jsonb_build_object('kind','restock'),(ack->'state'->>'revision')::integer,gen_random_uuid());
   raise exception 'daily_restock_repeated';
  exception when others then if sqlerrm<>'restock_already_claimed' then raise;end if;end;
 end if;
 execute 'reset role';
 assert (select count(*) from private.home_ledger where user_id=owner and event_key='farm-crop-v1:'||request::text)=1,'one buy ledger event';
 assert not has_function_privilege('anon','public.bmt_farm_crops_context(uuid)','execute'),'anon context denied';
 assert not has_function_privilege('anon','public.bmt_farm_crop_action(uuid,jsonb,integer,uuid)','execute'),'anon mutation denied';
 assert not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private'
  and c.relname in ('farm_crop_rules','farm_crop_players','farm_crops','farm_goods','farm_action_receipts') and not c.relrowsecurity),'all crop tables have RLS';
 assert (select to_jsonb(f) from private.farm_players f where f.user_id=owner)=snapshot->'farm','cosmetic farm unchanged';
end $$;
rollback;
select 'F2 transactional smoke passed; all test writes rolled back' as result;
