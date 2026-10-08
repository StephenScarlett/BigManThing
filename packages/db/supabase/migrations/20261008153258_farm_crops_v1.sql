-- F2, additive only. Mystery outcome and prices are frozen at planting.
-- Positions remain cosmetic: list controls and the canvas use the same APIs.
create table private.farm_crop_rules (
  version integer primary key, seed_item text not null references private.farm_items(id),
  seed_price integer not null check(seed_price>0), growth_seconds integer not null check(growth_seconds>0),
  catalog jsonb not null
);
insert into private.farm_crop_rules values(1,'mystery-seed-basic',10,86400,
 '[{"item_id":"crop-tomato-v1","label":"Tomato","rarity":"common","sale_value":14,"percent":75,"art":"tomato"},
   {"item_id":"crop-hot-pepper-v1","label":"Hot pepper","rarity":"rare","sale_value":20,"percent":25,"art":"pepper"}]');
create table private.farm_crop_players (
  user_id uuid primary key references private.farm_players(user_id) on delete cascade,
  revision integer not null default 1 check(revision>0)
);
create table private.farm_crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  plot_id text not null, rules_version integer not null references private.farm_crop_rules(version),
  outcome jsonb not null, planted_at timestamptz not null default now(),
  watered_at timestamptz, ready_at timestamptz, harvested_at timestamptz,
  check((watered_at is null and ready_at is null) or (watered_at is not null and ready_at>watered_at)),
  check(harvested_at is null or (ready_at is not null and harvested_at>=ready_at))
);
create unique index farm_crops_active_plot_idx on private.farm_crops(user_id,plot_id) where harvested_at is null;
create index farm_crops_rules_idx on private.farm_crops(rules_version);
create table private.farm_goods (
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  item_id text not null, rules_version integer not null references private.farm_crop_rules(version),
  location text not null check(location in ('bag','chest')),
  quantity integer not null check(quantity between 0 and 1000000),
  primary key(user_id,item_id,location)
);
create index farm_goods_rules_idx on private.farm_goods(rules_version);
-- Economic receipts are permanent. Pruning cosmetic receipts cannot replay a sale.
create table private.farm_action_receipts (
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  request_id uuid not null, payload jsonb not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(user_id,request_id)
);
do $$ declare t text; begin
 foreach t in array array['farm_crop_rules','farm_crop_players','farm_crops','farm_goods','farm_action_receipts'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end $$;

create function private.farm_crops_context(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p private.farm_players%rowtype; r private.farm_crop_rules%rowtype;
 wallet private.home_players%rowtype; clock timestamptz:=clock_timestamp(); d date:=private.guess_business_date();
begin
 if uid is null then raise exception 'sign_in_required'; end if;
 if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
 -- Reads follow the same wallet -> farm order; no bootstrap/grant on read.
 select * into wallet from private.home_players where user_id=uid for share;
 select * into p from private.farm_players where user_id=uid for share;
 if not found then return null; end if;
 select * into r from private.farm_crop_rules where version=1;
 return jsonb_build_object('owner_id',uid,'rules_version',r.version,
  'revision',coalesce((select revision from private.farm_crop_players where user_id=uid),1),
  'server_now',clock,'business_date',d,'coins',wallet.coins,
  'seed_quantity',coalesce((select quantity from private.farm_inventory where user_id=uid and item_id=r.seed_item),0),
  'watering_can',exists(select 1 from private.farm_inventory where user_id=uid and item_id='watering-can-basic' and quantity>0),
  'restock_claimed',exists(select 1 from private.farm_grants where user_id=uid and event_key='crop-restock-v1:'||d::text),
  'seed_price',r.seed_price,'growth_seconds',r.growth_seconds,'catalog',r.catalog,
  'plots',(select coalesce(jsonb_agg(jsonb_build_object('plot_id',prop->>'id','crop',
    case when c.id is null then null else jsonb_build_object('id',c.id,
      'stage',case when c.ready_at<=clock then 'ready' when c.watered_at is not null then 'growing' else 'planted' end,
      'planted_at',c.planted_at,'watered_at',c.watered_at,'ready_at',c.ready_at,
      'reveal',case when c.ready_at<=clock then c.outcome else null end) end) order by prop->>'id'),'[]'::jsonb)
    from jsonb_array_elements((select worlds->'farm'->'props' from private.farm_world_versions where version=p.world_version)) prop
    left join private.farm_crops c on c.user_id=uid and c.plot_id=prop->>'id' and c.harvested_at is null where prop->>'kind'='plot'),
  'goods',(select coalesce(jsonb_agg((def-'percent')||jsonb_build_object('location',g.location,'quantity',g.quantity) order by g.location,g.item_id),'[]'::jsonb)
    from private.farm_goods g join private.farm_crop_rules gr on gr.version=g.rules_version,
    lateral jsonb_array_elements(gr.catalog) def where g.user_id=uid and g.quantity>0 and def->>'item_id'=g.item_id));
end $$;

create function private.farm_crop_action(p_owner uuid,p_action jsonb,p_revision integer,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p private.farm_players%rowtype; wallet private.home_players%rowtype;
 rules private.farm_crop_rules%rowtype; c private.farm_crops%rowtype; prior private.farm_action_receipts%rowtype;
 payload jsonb; result jsonb; kind text; n integer; keys integer; revision integer; chosen jsonb;
 u numeric; cumulative numeric:=0; candidate jsonb; cost integer; amount integer; available integer; target_qty integer;
 clock timestamptz; d date:=private.guess_business_date(); source text; target text;
begin
 if uid is null then raise exception 'sign_in_required'; end if;
 if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
 if p_request is null then raise exception 'request_required'; end if;
 if p_action is null or jsonb_typeof(p_action)<>'object' or length(p_action::text)>1000 then raise exception 'invalid_crop_action'; end if;
 kind:=p_action->>'kind';
 if kind is null or kind not in ('buy','restock','plant','water','harvest','store','withdraw','sell') then raise exception 'invalid_crop_action'; end if;
 keys:=(select count(*) from jsonb_object_keys(p_action));
 if (kind='restock' and keys<>1) or (kind in ('buy','plant','water','harvest') and keys<>2) or (kind in ('store','withdraw','sell') and keys<>3) then raise exception 'invalid_crop_action'; end if;
 select * into wallet from private.home_players where user_id=uid for update;
 select * into p from private.farm_players where user_id=uid for update;
 if not found then raise exception 'farm_required'; end if;
 payload:=jsonb_build_object('action',p_action,'revision',p_revision);
 select * into prior from private.farm_action_receipts where user_id=uid and request_id=p_request;
 if found then
  if prior.payload<>payload then raise exception 'request_payload_changed'; end if;
  return jsonb_build_object('state',private.farm_crops_context(uid),'receipt',prior.result);
 end if;
 insert into private.farm_crop_players(user_id) values(uid) on conflict do nothing;
 select f.revision into revision from private.farm_crop_players f where user_id=uid for update;
 if p_revision is distinct from revision then raise exception 'crops_changed_reload'; end if;
 clock:=clock_timestamp();
 select * into rules from private.farm_crop_rules where version=1;
 result:=jsonb_build_object('request_id',p_request,'action',kind,'revision',revision+1);
 if kind in ('buy','store','withdraw','sell') then
  if jsonb_typeof(p_action->'quantity') is distinct from 'number' or (p_action->>'quantity')::numeric not between 1 and 50
    or (p_action->>'quantity')::numeric<>trunc((p_action->>'quantity')::numeric) then raise exception 'invalid_quantity'; end if;
  n:=(p_action->>'quantity')::integer;
 end if;
 if kind='buy' then
  cost:=rules.seed_price*n;
  if wallet.coins<cost then raise exception 'not_enough_coins'; end if;
  available:=coalesce((select quantity from private.farm_inventory where user_id=uid and item_id=rules.seed_item),0);
  if available+n>1000000 then raise exception 'inventory_full'; end if;
  perform private.home_credit(uid,'farm-crop-v1:'||p_request::text,0,-cost);
  insert into private.farm_inventory values(uid,rules.seed_item,n) on conflict(user_id,item_id) do update set quantity=private.farm_inventory.quantity+n;
  result:=result||jsonb_build_object('quantity',n,'coins',-cost,'message',n||' mystery seed(s) added to your bag.');
 elsif kind='restock' then
  if exists(select 1 from private.farm_grants where user_id=uid and event_key='crop-restock-v1:'||d::text) then raise exception 'restock_already_claimed'; end if;
  available:=coalesce((select quantity from private.farm_inventory where user_id=uid and item_id=rules.seed_item),0);
  if available+2>1000000 then raise exception 'inventory_full'; end if;
  insert into private.farm_grants(user_id,event_key) values(uid,'crop-restock-v1:'||d::text);
  insert into private.farm_inventory values(uid,rules.seed_item,2) on conflict(user_id,item_id) do update set quantity=private.farm_inventory.quantity+2;
  result:=result||jsonb_build_object('quantity',2,'message','Two free mystery seeds added for today.');
 elsif kind='plant' then
  if jsonb_typeof(p_action->'plot_id') is distinct from 'string' or not exists(
   select 1 from private.farm_world_versions w,lateral jsonb_array_elements(w.worlds->'farm'->'props') prop
   where w.version=p.world_version and prop->>'kind'='plot' and prop->>'id'=p_action->>'plot_id') then raise exception 'invalid_plot'; end if;
  if exists(select 1 from private.farm_crops where user_id=uid and plot_id=p_action->>'plot_id' and harvested_at is null) then raise exception 'plot_occupied'; end if;
  if coalesce((select quantity from private.farm_inventory where user_id=uid and item_id=rules.seed_item),0)<1 then raise exception 'no_seeds'; end if;
  -- One private draw, fixed duration/generic stages. No rarity pity side channel.
  u:=private.home_random_unit()*100;
  for candidate in select value from jsonb_array_elements(rules.catalog) loop
   cumulative:=cumulative+(candidate->>'percent')::numeric;
   if u<cumulative and chosen is null then chosen:=candidate; end if;
  end loop;
  if abs(cumulative-100)>0.000001 or chosen is null then raise exception 'crop_rules_invalid'; end if;
  update private.farm_inventory set quantity=quantity-1 where user_id=uid and item_id=rules.seed_item;
  insert into private.farm_crops(user_id,plot_id,rules_version,outcome,planted_at)
    values(uid,p_action->>'plot_id',rules.version,chosen,clock) returning * into c;
  result:=result||jsonb_build_object('crop_id',c.id,'plot_id',c.plot_id,'message','Mystery seed planted. Water it to start growing.');
 elsif kind in ('water','harvest') then
  if jsonb_typeof(p_action->'crop_id') is distinct from 'string' then raise exception 'invalid_crop_action'; end if;
  select * into c from private.farm_crops where user_id=uid and id::text=p_action->>'crop_id' for update;
  if not found or c.harvested_at is not null then raise exception 'crop_gone'; end if;
  result:=result||jsonb_build_object('crop_id',c.id,'plot_id',c.plot_id);
  if kind='water' then
   if not exists(select 1 from private.farm_inventory where user_id=uid and item_id='watering-can-basic' and quantity>0) then raise exception 'watering_can_required'; end if;
   if c.watered_at is not null then raise exception 'already_watered'; end if;
   select * into rules from private.farm_crop_rules where version=c.rules_version;
   update private.farm_crops set watered_at=clock,ready_at=clock+make_interval(secs=>rules.growth_seconds) where id=c.id returning * into c;
   result:=result||jsonb_build_object('ready_at',c.ready_at,'message','Watered. This crop grows while you are away.');
  else
   if c.ready_at is null or c.ready_at>clock then raise exception 'crop_not_ready'; end if;
   available:=coalesce((select quantity from private.farm_goods where user_id=uid and item_id=c.outcome->>'item_id' and location='bag'),0);
   if available+1>1000000 then raise exception 'inventory_full'; end if;
   update private.farm_crops set harvested_at=clock where id=c.id;
   insert into private.farm_goods values(uid,c.outcome->>'item_id',c.rules_version,'bag',1)
    on conflict(user_id,item_id,location) do update set quantity=private.farm_goods.quantity+1;
   result:=result||jsonb_build_object('item_id',c.outcome->>'item_id','quantity',1,'message',(c.outcome->>'label')||' harvested and kept in your bag.');
  end if;
 else
  if jsonb_typeof(p_action->'item_id') is distinct from 'string' then raise exception 'invalid_crop_action'; end if;
  source:=case when kind='withdraw' then 'chest' else 'bag' end;
  target:=case when kind='store' then 'chest' else 'bag' end;
  select g.quantity into available from private.farm_goods g
    where g.user_id=uid and g.item_id=p_action->>'item_id' and g.location=source;
  if coalesce(available,0)<n then raise exception 'not_enough_produce'; end if;
  select * into rules from private.farm_crop_rules where version=(select g.rules_version from private.farm_goods g
    where g.user_id=uid and g.item_id=p_action->>'item_id' and g.location=source);
  select value into chosen from jsonb_array_elements(rules.catalog) where value->>'item_id'=p_action->>'item_id';
  if chosen is null then raise exception 'invalid_crop_action'; end if;
  if kind='sell' then
   amount:=(chosen->>'sale_value')::integer*n;
   if wallet.coins+amount>1000000 then raise exception 'wallet_full'; end if;
   update private.farm_goods set quantity=quantity-n where user_id=uid and item_id=p_action->>'item_id' and location=source;
   perform private.home_credit(uid,'farm-crop-v1:'||p_request::text,0,amount);
   result:=result||jsonb_build_object('item_id',p_action->>'item_id','quantity',n,'coins',amount,'message',n||' '||(chosen->>'label')||' sold for '||amount||' Lime Coins.');
  else
   target_qty:=coalesce((select quantity from private.farm_goods where user_id=uid and item_id=p_action->>'item_id' and location=target),0);
   if target_qty+n>1000000 then raise exception 'inventory_full'; end if;
   update private.farm_goods set quantity=quantity-n where user_id=uid and item_id=p_action->>'item_id' and location=source;
   insert into private.farm_goods values(uid,p_action->>'item_id',rules.version,target,n)
    on conflict(user_id,item_id,location) do update set quantity=private.farm_goods.quantity+n;
   result:=result||jsonb_build_object('item_id',p_action->>'item_id','quantity',n,'message',case when kind='store' then 'Produce stored safely in your house chest.' else 'Produce returned to your bag.' end);
  end if;
 end if;
 update private.farm_crop_players f set revision=f.revision+1 where user_id=uid;
 insert into private.farm_action_receipts(user_id,request_id,payload,result) values(uid,p_request,payload,result);
 return jsonb_build_object('state',private.farm_crops_context(uid),'receipt',result);
end $$;

create function public.bmt_farm_crops_context(p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_crops_context(p_owner); $$;
create function public.bmt_farm_crop_action(p_owner uuid,p_action jsonb,p_revision integer,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_crop_action(p_owner,p_action,p_revision,p_request); $$;
revoke all on function private.farm_crops_context(uuid),private.farm_crop_action(uuid,jsonb,integer,uuid),
 public.bmt_farm_crops_context(uuid),public.bmt_farm_crop_action(uuid,jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function private.farm_crops_context(uuid),private.farm_crop_action(uuid,jsonb,integer,uuid),
 public.bmt_farm_crops_context(uuid),public.bmt_farm_crop_action(uuid,jsonb,integer,uuid) to authenticated;
